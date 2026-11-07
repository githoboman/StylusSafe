'use client';

import { useCallback, useEffect, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  initialVerificationState,
  reduceVerification,
  type VerificationMode,
  type VerificationState,
} from '@/lib/faceverify/verification';

export function useVerification(mode: VerificationMode = 'enroll') {
  const [state, setState] = useState<VerificationState>(() =>
    initialVerificationState(mode),
  );

  useEffect(() => {
    setState(initialVerificationState(mode));
  }, [mode]);

  const processFrame = useCallback(
    (
      landmarks: NormalizedLandmark[] | null,
      timestampMs: number,
      templateMatched = true,
    ) => {
      setState((prev) =>
        reduceVerification(prev, landmarks, timestampMs, templateMatched),
      );
    },
    [],
  );

  const reset = useCallback(() => {
    setState(initialVerificationState(mode));
  }, [mode]);

  return { state, processFrame, reset };
}
