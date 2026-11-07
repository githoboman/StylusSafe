'use client';

import { useLayoutEffect, useRef, useState } from 'react';

export type CameraError = 'permission_denied' | 'not_found' | 'unknown';

function classifyError(err: unknown): { message: string; code: CameraError } {
  if (err instanceof DOMException) {
    if (
      err.name === 'NotAllowedError' ||
      err.name === 'PermissionDeniedError'
    ) {
      return {
        message:
          'Camera permission denied. Allow access in your browser settings.',
        code: 'permission_denied',
      };
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return {
        message: 'No camera found on this device.',
        code: 'not_found',
      };
    }
  }
  return {
    message: err instanceof Error ? err.message : 'Could not access camera.',
    code: 'unknown',
  };
}

export function useCamera(enabled = true) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<CameraError | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let attachedTo: HTMLVideoElement | null = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        attachedTo = video;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setReady(true);
      } catch (e) {
        const c = classifyError(e);
        setError(c.message);
        setErrorCode(c.code);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (attachedTo) {
        attachedTo.srcObject = null;
      }
    };
  }, [enabled]);

  return { videoRef, error, errorCode, ready };
}

