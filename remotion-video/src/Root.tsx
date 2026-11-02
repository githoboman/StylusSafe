import React from 'react';
import { Composition } from 'remotion';
import { StylusSafePitch } from './StylusSafePitch';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="StylusSafePitch"
        component={StylusSafePitch}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

