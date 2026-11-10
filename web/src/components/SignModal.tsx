'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconCheck, IconFace, IconFingerprint, IconDialpad, IconShield } from '@/components/Icons';
import FaceVerifyScanner from '@/components/faceverify/FaceVerifyScanner';
import {
  detectBiometricCapabilities,
  triggerHardwareBiometricPrompt,
  type BiometricCapabilities,
} from '@/lib/faceverify/biometricPrompt';
import { getEnrolledBiometricTemplate } from '@/lib/faceverify/openbrEngine';

type SignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSign?: (pin: string, authMode?: 'faceid' | 'biometric_prompt' | 'pin') => Promise<void>;
  actionText?: string;
  amountText?: string;
  defaultMode?: 'faceid' | 'biometric_prompt' | 'pin';
  /** True when registering a new wallet for the first time (forces 5-step OpenBR enrollment) */
  enrollmentMode?: boolean;
};

export function SignModal({
  isOpen,
  onClose,
  onSign,
  actionText = 'Authorize Transaction',
  amountText = 'Free / Sponsored Gas',
  defaultMode = 'faceid',
  enrollmentMode = false,
}: SignModalProps) {
  const [mode, setMode] = useState<'faceid' | 'biometric_prompt' | 'pin'>(defaultMode);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [caps, setCaps] = useState<BiometricCapabilities | null>(null);
  const [hasTemplate, setHasTemplate] = useState(false);

  useEffect(() => {
    void detectBiometricCapabilities().then(setCaps);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHasTemplate(!!getEnrolledBiometricTemplate());
    } else {
      setPin('');
      setError(null);
      setStatus('idle');
      setMode(defaultMode);
    }
  }, [isOpen, defaultMode]);

  const handleFaceVerified = useCallback(async () => {
    setStatus('scanning');
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('invisible_wallet_last_auth_method', 'faceid');
      }
      if (onSign) {
        await onSign('', 'faceid');
      }
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 850);
    } catch (err: any) {
      console.error('FaceVerify Signature Error:', err);
      setStatus('error');
      setError(
        err?.message ||
          'Cryptographic secp256r1 signature failed after OpenBR liveness.',
      );
    }
  }, [onSign, onClose]);

  const handleHardwareBiometricPrompt = async () => {
    setStatus('scanning');
    setError(null);
    try {
      await triggerHardwareBiometricPrompt(actionText, {
        forceNewEnrollment: enrollmentMode,
        onUsePassword: () => {
          setStatus('idle');
          setMode('pin');
        },
      });
      if (onSign) {
        await onSign('', 'biometric_prompt');
      }
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 850);
    } catch (err: any) {
      console.error('Hardware BiometricPrompt Error:', err);
      setStatus('error');
      setError(
        err?.message ||
          'Hardware BiometricPrompt was cancelled or unavailable. Use OpenBR Camera or PIN.',
      );
    }
  };

  if (!isOpen) return null;

  const handleKeyPress = (num: number) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 6) return;
    setStatus('scanning');
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('invisible_wallet_last_auth_method', 'pin');
      }
      if (onSign) {
        await onSign(pin, 'pin');
      }
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 850);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Authentication failed. Please verify your PIN.');
      setPin('');
    }
  };

  const isFirstTimeEnroll = enrollmentMode || !hasTemplate;

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center px-4 font-sans'>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='absolute inset-0 bg-[#09090b]/85 backdrop-blur-md'
        onClick={status === 'scanning' ? undefined : onClose}
      />

      {/* Modal Surface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className='relative w-full max-w-md bg-[#141418] rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden text-white max-h-[92vh] overflow-y-auto'
      >
        <div className='p-5 flex flex-col items-center text-center'>
          {/* Header Bar */}
          <div className='w-full flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.06]'>
            <div className='flex items-center gap-2'>
              <div className='w-6 h-6 rounded-md bg-[#ff4500]/15 border border-[#ff4500]/40 flex items-center justify-center text-[#ff4500] font-mono text-[10px] font-bold'>
                BR
              </div>
              <div className='text-left'>
                <div className='text-xs font-semibold text-white tracking-tight'>
                  {isFirstTimeEnroll
                    ? 'First-Time Biometric Enrollment'
                    : 'Biometric Security Verification'}
                </div>
                <div className='text-[9px] font-mono uppercase tracking-widest text-[#8e8e98]'>
                  OpenBR 64-D · BiometricPrompt · RIP-7212
                </div>
              </div>
            </div>
            <span className='px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] font-mono text-[9px] uppercase tracking-wider text-emerald-400'>
              {caps?.isMobile ? 'Mobile Enclave' : 'Desktop Enclave'}
            </span>
          </div>

          {/* 3-Mode Biometric Selector Tabs (OpenBR Camera / Hardware BiometricPrompt / PIN) */}
          <div className='w-full grid grid-cols-3 gap-1 p-1 mb-3 bg-[#0d0d10] rounded-xl border border-white/[0.06] text-[10px] font-mono'>
            <button
              type='button'
              onClick={() => {
                setError(null);
                setMode('faceid');
              }}
              disabled={status === 'scanning'}
              className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'faceid'
                  ? 'bg-[#ff4500] text-white font-semibold'
                  : 'text-[#8e8e98] hover:text-white'
              }`}
            >
              <IconFace size={12} />
              <span>{isFirstTimeEnroll ? 'Enroll Face' : 'OpenBR Face'}</span>
            </button>

            <button
              type='button'
              onClick={() => {
                setError(null);
                setMode('biometric_prompt');
              }}
              disabled={status === 'scanning'}
              className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'biometric_prompt'
                  ? 'bg-[#ff4500] text-white font-semibold'
                  : 'text-[#8e8e98] hover:text-white'
              }`}
            >
              <IconFingerprint size={12} />
              <span>Device Bio</span>
            </button>

            <button
              type='button'
              onClick={() => {
                setError(null);
                setMode('pin');
              }}
              disabled={status === 'scanning'}
              className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'pin'
                  ? 'bg-[#ff4500] text-white font-semibold'
                  : 'text-[#8e8e98] hover:text-white'
              }`}
            >
              <IconDialpad size={12} />
              <span>6-Digit PIN</span>
            </button>
          </div>

          {/* Action & Amount Context Card */}
          <div className='w-full bg-[#0d0d10] rounded-xl p-3 mb-3.5 border border-white/[0.06] text-left space-y-1 text-xs'>
            <div className='flex items-center justify-between'>
              <span className='text-[#8e8e98] font-mono text-[10px] uppercase tracking-wider'>
                Intent
              </span>
              <span className='text-white font-medium truncate max-w-[240px]'>
                {actionText}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-[#8e8e98] font-mono text-[10px] uppercase tracking-wider'>
                Execution
              </span>
              <span className='text-white font-mono text-[11px] truncate max-w-[240px]'>
                {amountText}
              </span>
            </div>
          </div>

          <AnimatePresence mode='wait'>
            {mode === 'faceid' ? (
              /* ── OpenBR + FaceVerify Optical Biometric View ─────────────────────── */
              <motion.div
                key='faceid-view'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className='w-full flex flex-col items-center'
              >
                <FaceVerifyScanner
                  requestedMode={enrollmentMode ? 'enroll' : 'auto'}
                  onVerified={handleFaceVerified}
                  isSigning={status === 'scanning'}
                />

                {error && (
                  <div className='w-full py-2 px-3 mt-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg'>
                    {error}
                  </div>
                )}

                {status === 'success' && (
                  <div className='w-full py-2 px-3 mt-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center justify-center gap-2 font-mono'>
                    <IconCheck size={15} />
                    <span>SIGNED VIA RIP-7212 SECP256R1 CRYPTOOBJECT</span>
                  </div>
                )}
              </motion.div>
            ) : mode === 'biometric_prompt' ? (
              /* ── Hardware BiometricPrompt (Mobile TouchID/FaceID/Android + Desktop Windows Hello/TouchID) ── */
              <motion.div
                key='biometric-prompt-view'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className='w-full flex flex-col items-center py-2'
              >
                <div className='relative w-24 h-24 my-2 rounded-2xl bg-[#0d0d10] border border-white/[0.08] flex items-center justify-center'>
                  {status === 'success' ? (
                    <div className='text-emerald-400'>
                      <IconCheck size={36} />
                    </div>
                  ) : (
                    <div
                      className={`transition-colors ${
                        status === 'scanning' ? 'text-[#ff4500]' : 'text-white'
                      }`}
                    >
                      <IconFingerprint size={40} />
                    </div>
                  )}
                </div>

                <h3 className='text-base font-semibold text-white tracking-tight mt-2 mb-1'>
                  {caps?.label || 'Hardware BiometricPrompt'}
                </h3>
                <p className='text-xs text-[#8e8e98] mb-4 max-w-[290px]'>
                  Uses native {caps?.isMobile ? 'iOS LAContext / Android BiometricPrompt API 28+' : 'Windows Hello / macOS Secure Enclave'} with{' '}
                  <span className='text-white font-mono'>secp256r1</span> CryptoObject binding and zero reuse cache.
                </p>

                <div className='w-full rounded-xl border border-white/[0.06] bg-[#0d0d10] p-3 mb-4 text-left font-mono text-[10px] space-y-1.5'>
                  <div className='flex justify-between'>
                    <span className='text-[#8e8e98]'>PROVIDER</span>
                    <span className='text-white'>{caps?.biometryType || 'PlatformPasskey'}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-[#8e8e98]'>CURVE / CIPHER</span>
                    <span className='text-emerald-400'>SHA256withECDSA (secp256r1)</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-[#8e8e98]'>REUSE DURATION</span>
                    <span className='text-white'>0s (Strict Per-Tx Prompt)</span>
                  </div>
                </div>

                {error && (
                  <div className='w-full py-2 px-3 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg'>
                    {error}
                  </div>
                )}

                <button
                  type='button'
                  onClick={handleHardwareBiometricPrompt}
                  disabled={status === 'scanning' || status === 'success'}
                  className='w-full h-11 rounded-lg bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.99] text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ff4500]/20 disabled:opacity-50'
                >
                  {status === 'scanning' ? (
                    <>
                      <span className='w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      <span>Awaiting Hardware BiometricPrompt...</span>
                    </>
                  ) : status === 'success' ? (
                    <>
                      <IconCheck size={15} />
                      <span>Hardware Biometrics Verified</span>
                    </>
                  ) : (
                    <>
                      <IconShield size={15} />
                      <span>
                        {enrollmentMode
                          ? 'Enroll Fingerprint / Device Biometrics'
                          : 'Authenticate with Fingerprint / Device Bio'}
                      </span>
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              /* ── 6-Digit PIN View ──────────────────────────────────────────────── */
              <motion.div
                key='pin-view'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className='w-full flex flex-col items-center'
              >
                <div className='w-11 h-11 rounded-full bg-[#1b1b21] text-white flex items-center justify-center mb-2'>
                  <IconDialpad size={18} />
                </div>

                <h3 className='text-base font-semibold text-white tracking-tight mb-0.5'>
                  Enter 6-Digit Security PIN
                </h3>
                <p className='text-xs text-[#8e8e98] mb-3.5'>
                  AES-GCM PBKDF2 encrypted P-256 CryptoObject fallback
                </p>

                {/* PIN Dots */}
                <div className='flex items-center justify-center gap-3 mb-4 h-6'>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-150 ${
                        index < pin.length
                          ? 'bg-[#ff4500] scale-110'
                          : 'bg-[#24242c]'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <div className='w-full py-1.5 px-3 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md'>
                    {error}
                  </div>
                )}

                {/* Numeric Dialpad */}
                <div className='grid grid-cols-3 gap-1.5 w-full mb-4'>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type='button'
                      onClick={() => handleKeyPress(num)}
                      disabled={status === 'scanning'}
                      className='h-11 rounded-lg bg-[#1b1b21] hover:bg-[#24242c] active:bg-[#2c2c36] text-base font-medium text-white transition-colors flex items-center justify-center disabled:opacity-50'
                    >
                      {num}
                    </button>
                  ))}
                  <div className='h-11' />
                  <button
                    type='button'
                    onClick={() => handleKeyPress(0)}
                    disabled={status === 'scanning'}
                    className='h-11 rounded-lg bg-[#1b1b21] hover:bg-[#24242c] active:bg-[#2c2c36] text-base font-medium text-white transition-colors flex items-center justify-center disabled:opacity-50'
                  >
                    0
                  </button>
                  <button
                    type='button'
                    onClick={handleBackspace}
                    disabled={status === 'scanning' || pin.length === 0}
                    className='h-11 rounded-lg bg-[#1b1b21]/60 hover:bg-[#1b1b21] text-[#8e8e98] hover:text-white transition-colors flex items-center justify-center disabled:opacity-30'
                  >
                    <span className='font-mono text-sm'>DEL</span>
                  </button>
                </div>

                {/* PIN Confirm Button */}
                <button
                  type='button'
                  onClick={handlePinSubmit}
                  disabled={status === 'scanning' || pin.length !== 6}
                  className={`w-full h-11 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2 ${
                    pin.length === 6 && status !== 'scanning'
                      ? 'bg-[#ff4500] hover:bg-[#e03d00] text-white shadow-md shadow-[#ff4500]/20'
                      : 'bg-[#1b1b21] text-[#8e8e98] cursor-not-allowed'
                  }`}
                >
                  {status === 'scanning' ? (
                    <>
                      <span className='w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    'Confirm with PIN'
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cancel */}
          <button
            type='button'
            onClick={onClose}
            disabled={status === 'scanning'}
            className='mt-3 text-xs font-mono text-[#8e8e98] hover:text-white transition-colors'
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
