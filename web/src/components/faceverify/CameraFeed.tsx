'use client';

import { forwardRef } from 'react';

type Props = {
  className?: string;
};

const CameraFeed = forwardRef<HTMLVideoElement, Props>(function CameraFeed(
  { className },
  ref,
) {
  return (
    <video
      ref={ref}
      className={className}
      playsInline
      muted
      autoPlay
      aria-label='Camera preview'
    />
  );
});

export default CameraFeed;

