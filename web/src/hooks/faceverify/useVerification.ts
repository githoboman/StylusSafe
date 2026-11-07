'use client';

import { useCallback, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  initialVerificationState,
  reduceVerification,
  type VerificationState,
} from '@/lib/faceverify/verification';

export function useVerification() {
  const [state, setState] = useState<VerificationState>(
    initialVerificationState,
  );

  const processFrame = useCallback(
    (landmarks: NormalizedLandmark[] | null, timestampMs: number) => {
      setState((prev) => reduceVerification(prev, landmarks, timestampMs));
    },
    [],
  );

  const reset = useCallback(() => {
    setState(initialVerificationState());
  }, []);

  return { state, processFrame, reset };
}

