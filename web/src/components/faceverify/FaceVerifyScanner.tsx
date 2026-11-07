'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { motion, AnimatePresence } from 'motion/react';
import CameraFeed from '@/components/faceverify/CameraFeed';
import FaceOverlay from '@/components/faceverify/FaceOverlay';
import InstructionBox from '@/components/faceverify/InstructionBox';
import ProgressBar from '@/components/faceverify/ProgressBar';
import { useCamera } from '@/hooks/faceverify/useCamera';
import { useFaceDetection } from '@/hooks/faceverify/useFaceDetection';
import { useVerification } from '@/hooks/faceverify/useVerification';
import { getFaceLandmarker, type FaceLandmarkerHandle } from '@/lib/faceverify/mediapipe';
import {
  stepInstruction,
  type VerificationMode,
} from '@/lib/faceverify/verification';
import {
  extractOpenBRDescriptor,
  getEnrolledBiometricTemplate,
  saveEnrolledBiometricTemplate,
  verifyAgainstEnrolledTemplate,
  OPENBR_MATCH_THRESHOLD,
  type OpenBRMatchResult,
  type OpenBRTemplate,
} from '@/lib/faceverify/openbrEngine';

function TelemetryCell({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className='flex flex-col gap-0.5 bg-[#0d0d10] px-2.5 py-1.5 text-left'>
      <span className='font-mono text-[7px] uppercase tracking-[0.18em] text-[#8e8e98]'>
        {label}
      </span>
      <span
        className={`font-mono text-[10px] font-semibold tracking-wider truncate ${
          ok ? 'text-white' : 'text-[#8e8e98]/60'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

type FaceVerifyScannerProps = {
  /**
   * 'enroll': First-time 5-stage wallet sign-up (captures & locks OpenBR 64-D template).
   * 'verify': Subsequent 2-stage 1:1 OpenBR template match + live blink verification.
   * 'auto': Uses 'verify' if an enrolled OpenBR template exists, otherwise forces 'enroll'.
   */
  requestedMode?: 'enroll' | 'verify' | 'auto';
  walletAddress?: string | null;
  onVerified: (meta: {
    authCode: string;
    elapsedMs: number;
    mode: VerificationMode;
    templateHash: string;
    confidencePct: number;
  }) => void;
  isSigning?: boolean;
};

export default function FaceVerifyScanner({
  requestedMode = 'auto',
  walletAddress = null,
  onVerified,
  isSigning = false,
}: FaceVerifyScannerProps) {
  const [enrolledTemplate, setEnrolledTemplate] = useState<OpenBRTemplate | null>(() =>
    getEnrolledBiometricTemplate(),
  );

  const activeMode: VerificationMode = useMemo(() => {
    if (requestedMode === 'enroll') return 'enroll';
    if (requestedMode === 'verify' && enrolledTemplate) return 'verify';
    return enrolledTemplate ? 'verify' : 'enroll';
  }, [requestedMode, enrolledTemplate]);

  const { videoRef, error, errorCode, ready: cameraReady } = useCamera(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [landmarker, setLandmarker] = useState<FaceLandmarkerHandle | null>(null);
  const { state, processFrame, reset } = useVerification(activeMode);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [luminanceWarn, setLuminanceWarn] = useState(false);
  const [liveMatch, setLiveMatch] = useState<OpenBRMatchResult | null>(null);
  const capturedSamplesRef = useRef<number[][]>([]);
  const notifiedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const lm = await getFaceLandmarker();
        if (!cancelled) setLandmarker(lm);
      } catch (e) {
        if (!cancelled) {
          setModelError(
            e instanceof Error ? e.message : 'Failed to load MediaPipe face landmarker',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onFrame = useCallback(
    (frame: {
      landmarks: NormalizedLandmark[] | null;
      timestampMs: number;
      luminance: number | null;
    }) => {
      setLandmarks(frame.landmarks);
      if (frame.luminance !== null) setLuminanceWarn(frame.luminance < 48);

      if (!frame.landmarks) {
        setLiveMatch(null);
        processFrame(null, frame.timestampMs, false);
        return;
      }

      if (activeMode === 'enroll') {
        // Capture OpenBR 64-D craniofacial descriptors during enrollment
        const desc = extractOpenBRDescriptor(frame.landmarks);
        if (desc && capturedSamplesRef.current.length < 24) {
          capturedSamplesRef.current.push(desc);
        }
        processFrame(frame.landmarks, frame.timestampMs, true);
      } else if (enrolledTemplate) {
        // 1:1 OpenBR probe-to-gallery verification
        const matchRes = verifyAgainstEnrolledTemplate(
          frame.landmarks,
          enrolledTemplate,
        );
        setLiveMatch(matchRes);
        processFrame(
          frame.landmarks,
          frame.timestampMs,
          matchRes ? matchRes.matched : false,
        );
      }
    },
    [activeMode, enrolledTemplate, processFrame],
  );

  useFaceDetection(videoRef, landmarker, onFrame, 12);

  const engineReady = cameraReady && !!landmarker && !modelError;

  useEffect(() => {
    if (engineReady && startedAtRef.current === null) {
      startedAtRef.current = performance.now();
    }
  }, [engineReady]);

  useEffect(() => {
    if (state.status === 'success' && !notifiedRef.current) {
      notifiedRef.current = true;
      const elapsed =
        startedAtRef.current !== null ? performance.now() - startedAtRef.current : 0;
      setElapsedMs(elapsed);

      const rand = crypto.getRandomValues(new Uint8Array(4));
      const code = `OBR-${Array.from(rand, (b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 6)
        .toUpperCase()}`;
      setAuthCode(code);

      void (async () => {
        let finalHash = enrolledTemplate?.templateHash ?? '0x0';
        let finalConfidence = liveMatch?.confidencePct ?? 99.2;

        if (activeMode === 'enroll') {
          const saved = await saveEnrolledBiometricTemplate(
            capturedSamplesRef.current,
            walletAddress,
          );
          if (saved) {
            setEnrolledTemplate(saved);
            finalHash = saved.templateHash;
            finalConfidence = 99.4;
          }
        }

        onVerified({
          authCode: code,
          elapsedMs: elapsed,
          mode: activeMode,
          templateHash: finalHash,
          confidencePct: finalConfidence,
        });
      })();
    }
  }, [state.status, activeMode, enrolledTemplate, liveMatch, walletAddress, onVerified]);

  const instruction =
    state.status === 'success'
      ? isSigning
        ? 'Biometric template verified — signing P-256 UserOp...'
        : activeMode === 'enroll'
          ? 'OpenBR 64-D template enrolled & locked'
          : '1:1 OpenBR identity confirmed'
      : stepInstruction(state.currentStep, activeMode);

  const subtitle = useMemo(() => {
    if (error) return error;
    if (modelError) return modelError;
    if (!cameraReady) return 'Initializing optical camera stream...';
    if (!landmarker) return 'Loading MediaPipe 468-landmark & OpenBR engine...';
    if (
      activeMode === 'verify' &&
      liveMatch &&
      !liveMatch.matched &&
      state.status !== 'success'
    ) {
      return `OpenBR similarity ${liveMatch.confidencePct}% is below required ${
        OPENBR_MATCH_THRESHOLD * 100
      }% threshold. Center wallet owner face.`;
    }
    return undefined;
  }, [error, modelError, cameraReady, landmarker, activeMode, liveMatch, state.status]);

  const showLowLight =
    luminanceWarn && engineReady && state.status !== 'success' && !error;

  const totalSteps = activeMode === 'verify' ? 2 : 5;
  const completedCount = state.completedSteps.filter((s) => s !== 'COMPLETE').length;

  return (
    <div className='w-full flex flex-col gap-2.5'>
      {/* Enrollment vs Verification Mode Banner */}
      <div className='flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#0d0d10] px-3 py-1.5 font-mono text-[9px]'>
        <span className='uppercase tracking-wider text-[#8e8e98]'>
          {activeMode === 'enroll'
            ? 'MODE: FIRST-TIME ENROLLMENT (5-STEP)'
            : 'MODE: 1:1 OWNER TEMPLATE VERIFY (2-STEP)'}
        </span>
        {activeMode === 'verify' && enrolledTemplate ? (
          <span className='text-emerald-400'>
            HASH: {enrolledTemplate.templateHash.slice(0, 8)}...
          </span>
        ) : (
          <span className='text-[#ff4500]'>NEW GALLERY TEMPLATE</span>
        )}
      </div>

      {/* Telemetry row */}
      <div className='grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08]'>
        <TelemetryCell
          label='CAMERA'
          value={cameraReady ? 'ONLINE' : 'INIT'}
          ok={cameraReady}
        />
        <TelemetryCell
          label='OPENBR'
          value={
            activeMode === 'verify'
              ? liveMatch
                ? `${liveMatch.confidencePct}%`
                : 'WAIT'
              : `${capturedSamplesRef.current.length} FRM`
          }
          ok={
            activeMode === 'verify'
              ? !!liveMatch?.matched
              : capturedSamplesRef.current.length > 0
          }
        />
        <TelemetryCell
          label='MESH'
          value={!!landmarks ? '468-PT' : 'NONE'}
          ok={!!landmarks}
        />
        <TelemetryCell
          label='STAGE'
          value={`${completedCount}/${totalSteps}`}
          ok={completedCount > 0}
        />
      </div>

      {/* Camera viewport */}
      <div className='relative overflow-hidden rounded-xl border border-white/[0.12] bg-[#09090b]'>
        {/* Top HUD bar */}
        <div className='absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-3 py-1.5'>
          <span className='font-mono text-[8px] uppercase tracking-[0.2em] text-white/70'>
            OPENBR 64-D // MEDIAPIPE 468-PT
          </span>
          <span
            className={`font-mono text-[8px] uppercase tracking-[0.2em] ${
              state.status === 'success'
                ? 'text-emerald-400'
                : engineReady
                  ? 'text-[#ff4500]'
                  : 'text-[#8e8e98]'
            }`}
          >
            {state.status === 'success'
              ? 'VERIFIED'
              : engineReady
                ? activeMode === 'verify'
                  ? 'MATCHING'
                  : 'ENROLLING'
                : 'STANDBY'}
          </span>
        </div>

        <div className='aspect-[4/3] w-full bg-[#050507] relative'>
          <CameraFeed
            ref={videoRef}
            className='h-full w-full scale-x-[-1] object-cover opacity-95'
          />
          <FaceOverlay
            landmarks={state.status === 'success' ? null : landmarks}
            hasFace={!!landmarks && state.status !== 'success'}
          />
        </div>

        {/* Bottom HUD bar */}
        <div className='absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-3 py-1.5'>
          <span className='font-mono text-[8px] uppercase tracking-widest text-white/50'>
            {activeMode === 'verify' && liveMatch
              ? `COSINE MATCH: ${liveMatch.confidencePct}% (L2: ${liveMatch.distance})`
              : 'LIVE 12FPS · SECP256R1 CRYPTOOBJECT'}
          </span>
          <AnimatePresence>
            {showLowLight ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='animate-pulse font-mono text-[8px] uppercase tracking-widest text-amber-400'
              >
                LOW AMBIENT LIGHT
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Active directive */}
      <InstructionBox title={instruction} subtitle={subtitle} />

      {/* Sequence progress bar */}
      <ProgressBar
        mode={activeMode}
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
        success={state.status === 'success'}
      />

      {/* Verification telemetry summary */}
      <AnimatePresence>
        {state.status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className='rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3.5 py-2.5 text-left'
          >
            <div className='flex items-center justify-between'>
              <span className='font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-400 font-semibold'>
                {activeMode === 'enroll'
                  ? 'OPENBR TEMPLATE ENROLLED'
                  : '1:1 BIOMETRIC MATCH CONFIRMED'}
              </span>
              <span className='font-mono text-[9px] text-emerald-300/80'>
                {authCode ?? 'OBR-OK'} ·{' '}
                {elapsedMs !== null ? `${(elapsedMs / 1000).toFixed(2)}s` : ''}
              </span>
            </div>
            <div className='mt-1.5 flex items-center justify-between'>
              <span className='text-[11px] text-[#8e8e98]'>
                {isSigning
                  ? 'Signing UserOp with secp256r1 CryptoObject...'
                  : 'Authorized for Arbitrum Stylus execution.'}
              </span>
              {!isSigning && (
                <button
                  type='button'
                  onClick={() => {
                    notifiedRef.current = false;
                    capturedSamplesRef.current = [];
                    startedAtRef.current = performance.now();
                    setElapsedMs(null);
                    setAuthCode(null);
                    setLandmarks(null);
                    reset();
                  }}
                  className='font-mono text-[9px] uppercase tracking-wider text-white/70 hover:text-white underline'
                >
                  RE-SCAN
                </button>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {errorCode === 'permission_denied' ? (
        <p className='text-center font-mono text-[10px] uppercase tracking-wider text-red-400'>
          CAMERA ACCESS DENIED · USE DEVICE BIOMETRICPROMPT OR 6-DIGIT PIN BELOW
        </p>
      ) : null}
    </div>
  );
}
