'use client';

import { motion } from 'motion/react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { faceBoundingBox } from '@/lib/faceverify/detection';

type Props = {
  landmarks: NormalizedLandmark[] | null;
  hasFace: boolean;
};

function CornerBracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = 'absolute h-4 w-4 border-[#ff4500]';
  const style = {
    tl: 'top-0 left-0 border-t-2 border-l-2',
    tr: 'top-0 right-0 border-t-2 border-r-2',
    bl: 'bottom-0 left-0 border-b-2 border-l-2',
    br: 'bottom-0 right-0 border-b-2 border-r-2',
  }[pos];
  return <div className={`${base} ${style}`} />;
}

function IdleReticle() {
  return (
    <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
      <div className='relative flex h-44 w-36 flex-col items-center justify-center'>
        {/* Dashed guide */}
        <div className='absolute inset-0 rounded-lg border border-dashed border-white/15' />

        {/* Corner brackets */}
        <CornerBracket pos='tl' />
        <CornerBracket pos='tr' />
        <CornerBracket pos='bl' />
        <CornerBracket pos='br' />

        {/* Center crosshair */}
        <div className='relative flex h-5 w-5 items-center justify-center'>
          <div className='absolute left-1/2 h-full w-px -translate-x-1/2 bg-[#ff4500]/40' />
          <div className='absolute top-1/2 h-px w-full -translate-y-1/2 bg-[#ff4500]/40' />
          <motion.div
            className='h-1.5 w-1.5 rounded-full bg-[#ff4500]/70'
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </div>

        <p className='absolute -bottom-5 left-0 right-0 text-center font-mono text-[8px] uppercase tracking-[0.25em] text-[#8e8e98]'>
          ALIGN FACE
        </p>
      </div>
    </div>
  );
}

export default function FaceOverlay({ landmarks, hasFace }: Props) {
  if (!landmarks || !hasFace) {
    return <IdleReticle />;
  }

  const box = faceBoundingBox(landmarks);

  return (
    <div className='pointer-events-none absolute inset-0'>
      <motion.div
        className='absolute'
        initial={false}
        animate={{
          left: `${box.x * 100}%`,
          top: `${box.y * 100}%`,
          width: `${box.width * 100}%`,
          height: `${box.height * 100}%`,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      >
        {/* Corner brackets */}
        <CornerBracket pos='tl' />
        <CornerBracket pos='tr' />
        <CornerBracket pos='bl' />
        <CornerBracket pos='br' />

        {/* Scan line sweeping up/down */}
        <div className='absolute inset-0 overflow-hidden'>
          <motion.div
            className='absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff4500]/70 to-transparent'
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Outer glow ring */}
        <div className='absolute inset-0 rounded shadow-[inset_0_0_32px_rgba(255,69,0,0.08)]' />

        {/* Center dot */}
        <div className='absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff4500]/70' />

        {/* Labels */}
        <span className='absolute -top-4 left-0 font-mono text-[7px] uppercase tracking-widest text-white/60'>
          ID:SCAN
        </span>
        <span className='absolute -bottom-4 right-0 font-mono text-[7px] uppercase tracking-widest text-[#ff4500]/80'>
          LIVE
        </span>
      </motion.div>
    </div>
  );
}

