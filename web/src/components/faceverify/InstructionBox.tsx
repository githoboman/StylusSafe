'use client';

import { motion, AnimatePresence } from 'motion/react';

type Props = {
  title: string;
  subtitle?: string;
};

export default function InstructionBox({ title, subtitle }: Props) {
  return (
    <div className='w-full rounded-xl border border-white/[0.08] bg-[#0d0d10] px-3.5 py-2.5 text-left'>
      <p className='mb-0.5 font-mono text-[8px] uppercase tracking-[0.22em] text-[#8e8e98]'>
        LIVENESS DIRECTIVE
      </p>
      <div className='min-h-6 flex items-center gap-2'>
        <span className='shrink-0 font-mono text-xs text-[#ff4500] font-bold'>&gt;</span>
        <AnimatePresence mode='wait'>
          <motion.span
            key={title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.16 }}
            className='font-mono text-xs font-medium tracking-wide text-white'
          >
            {title}
          </motion.span>
        </AnimatePresence>
        <span className='inline-block h-[12px] w-[2px] shrink-0 bg-[#ff4500] animate-pulse' />
      </div>
      <AnimatePresence>
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='mt-1 font-mono text-[10px] text-[#8e8e98]'
          >
            {subtitle}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

