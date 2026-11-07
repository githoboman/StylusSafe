'use client';

import { useEffect, useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { detectFace, type FaceLandmarkerHandle } from '@/lib/faceverify/mediapipe';
import { averageFrameLuminance } from '@/lib/faceverify/detection';

export type DetectionFrame = {
  landmarks: NormalizedLandmark[] | null;
  luminance: number | null;
  timestampMs: number;
};

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  landmarker: FaceLandmarkerHandle | null,
  onFrame: (frame: DetectionFrame) => void,
  fps = 12,
) {
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!landmarker) return;

    const canvas = document.createElement('canvas');
    let raf = 0;
    const minInterval = 1000 / fps;
    let lastDetect = 0;

    const loop = (now: number) => {
      const video = videoRef.current;
      if (video && now - lastDetect >= minInterval) {
        lastDetect = now;
        const landmarks = detectFace(landmarker, video, now);
        const luminance = averageFrameLuminance(video, canvas);
        onFrameRef.current({ landmarks, luminance, timestampMs: now });
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [landmarker, videoRef, fps]);
}

