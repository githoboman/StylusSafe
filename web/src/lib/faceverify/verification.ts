import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  detectHeadTurn,
  detectMouthOpen,
  detectBlink,
  eyesLikelyOpen,
} from './detection';

export type Step =
  | 'LOOK_STRAIGHT'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'OPEN_MOUTH'
  | 'BLINK'
  | 'COMPLETE';

export type VerificationStatus = 'idle' | 'detecting' | 'success';

export const STEP_ORDER: Step[] = [
  'LOOK_STRAIGHT',
  'TURN_LEFT',
  'TURN_RIGHT',
  'OPEN_MOUTH',
  'BLINK',
  'COMPLETE',
];

export const CONFIRM_MS = 500;

/** Consecutive failed frames before dropping a pending confirmation (reduces mobile jitter). */
const CONFIRM_MISS_FRAMES = 8;

export type BlinkPhase =
  | 'await_open'
  | 'await_closed'
  | 'await_open_again'
  | 'blink_done';

export type VerificationState = {
  currentStep: Step;
  completedSteps: Step[];
  status: VerificationStatus;
  pendingSince: number | null;
  blinkPhase: BlinkPhase;
  confirmMissStreak: number;
};

export function initialVerificationState(): VerificationState {
  return {
    currentStep: 'LOOK_STRAIGHT',
    completedSteps: [],
    status: 'idle',
    pendingSince: null,
    blinkPhase: 'await_open',
    confirmMissStreak: 0,
  };
}

function advanceBlinkPhase(
  landmarks: NormalizedLandmark[],
  phase: BlinkPhase,
): { phase: BlinkPhase; sequenceDone: boolean } {
  const closed = detectBlink(landmarks);
  const open = eyesLikelyOpen(landmarks);

  switch (phase) {
    case 'await_open':
      if (open && !closed)
        return { phase: 'await_closed', sequenceDone: false };
      return { phase, sequenceDone: false };
    case 'await_closed':
      if (closed) return { phase: 'await_open_again', sequenceDone: false };
      return { phase, sequenceDone: false };
    case 'await_open_again':
      if (open && !closed) {
        return { phase: 'blink_done', sequenceDone: true };
      }
      return { phase, sequenceDone: false };
    case 'blink_done':
      return { phase: 'blink_done', sequenceDone: true };
    default:
      return { phase, sequenceDone: false };
  }
}

function stepConditionMet(
  step: Step,
  landmarks: NormalizedLandmark[],
  blink: { phase: BlinkPhase; sequenceDone: boolean },
): boolean {
  const head = detectHeadTurn(landmarks);
  const mouthOpen = detectMouthOpen(landmarks);

  switch (step) {
    case 'LOOK_STRAIGHT':
      return head === 'CENTER' && !mouthOpen && eyesLikelyOpen(landmarks);
    case 'TURN_LEFT':
      return head === 'LEFT' && !mouthOpen;
    case 'TURN_RIGHT':
      return head === 'RIGHT' && !mouthOpen;
    case 'OPEN_MOUTH':
      return mouthOpen;
    case 'BLINK':
      return blink.phase === 'blink_done' || blink.sequenceDone;
    default:
      return false;
  }
}

export function reduceVerification(
  prev: VerificationState,
  landmarks: NormalizedLandmark[] | null,
  nowMs: number,
): VerificationState {
  if (prev.currentStep === 'COMPLETE' || prev.status === 'success') {
    return prev;
  }

  if (!landmarks) {
    return {
      ...prev,
      status: prev.status === 'idle' ? 'idle' : 'detecting',
      pendingSince: null,
      blinkPhase: prev.currentStep === 'BLINK' ? 'await_open' : prev.blinkPhase,
      confirmMissStreak: 0,
    };
  }

  const status: VerificationStatus =
    prev.status === 'idle' ? 'detecting' : prev.status;

  let blinkPhase = prev.blinkPhase;
  let blinkSeqDone = false;
  if (prev.currentStep === 'BLINK') {
    const b = advanceBlinkPhase(landmarks, blinkPhase);
    blinkPhase = b.phase;
    blinkSeqDone = b.sequenceDone;
  }

  const met = stepConditionMet(prev.currentStep, landmarks, {
    phase: blinkPhase,
    sequenceDone: blinkSeqDone,
  });

  if (!met) {
    const streak = prev.confirmMissStreak + 1;
    if (streak < CONFIRM_MISS_FRAMES && prev.pendingSince !== null) {
      return {
        ...prev,
        status,
        confirmMissStreak: streak,
        blinkPhase,
      };
    }
    return {
      ...prev,
      status,
      pendingSince: null,
      blinkPhase,
      confirmMissStreak: 0,
    };
  }

  const pending = prev.pendingSince;
  if (pending === null) {
    return {
      ...prev,
      status,
      pendingSince: nowMs,
      blinkPhase,
      confirmMissStreak: 0,
    };
  }
  if (nowMs - pending < CONFIRM_MS) {
    return {
      ...prev,
      status,
      pendingSince: pending,
      blinkPhase,
      confirmMissStreak: 0,
    };
  }

  const completed = [...prev.completedSteps, prev.currentStep];
  const idx = STEP_ORDER.indexOf(prev.currentStep);
  const nextStep = STEP_ORDER[idx + 1] ?? 'COMPLETE';

  if (nextStep === 'COMPLETE') {
    return {
      ...prev,
      currentStep: 'COMPLETE',
      completedSteps: completed,
      status: 'success',
      pendingSince: null,
      blinkPhase: 'await_open',
      confirmMissStreak: 0,
    };
  }

  return {
    ...prev,
    currentStep: nextStep,
    completedSteps: completed,
    status,
    pendingSince: null,
    blinkPhase: nextStep === 'BLINK' ? 'await_open' : 'await_open',
    confirmMissStreak: 0,
  };
}

export function stepInstruction(step: Step): string {
  switch (step) {
    case 'LOOK_STRAIGHT':
      return 'Look straight at the camera';
    case 'TURN_LEFT':
      return 'Turn your head left';
    case 'TURN_RIGHT':
      return 'Turn your head right';
    case 'OPEN_MOUTH':
      return 'Open your mouth';
    case 'BLINK':
      return 'Blink once';
    case 'COMPLETE':
      return 'Verification complete';
    default:
      return '';
  }
}

