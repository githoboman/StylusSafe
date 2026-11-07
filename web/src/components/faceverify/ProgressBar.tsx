'use client';

import { motion } from 'motion/react';
import {
  getStepsForMode,
  type Step,
  type VerificationMode,
} from '@/lib/faceverify/verification';

type Props = {
  mode?: VerificationMode;
  currentStep: Step;
  completedSteps: Step[];
  success: boolean;
};

const STEP_LABELS: Partial<Record<Step, string>> = {
  LOOK_STRAIGHT: 'MATCH',
  TURN_LEFT: 'LEFT',
  TURN_RIGHT: 'RIGHT',
  OPEN_MOUTH: 'MOUTH',
  BLINK: 'BLINK',
};

export default function ProgressBar({
  mode = 'enroll',
  currentStep,
  completedSteps,
  success,
}: Props) {
  const activeSteps = getStepsForMode(mode).filter((s) => s !== 'COMPLETE');
  const total = activeSteps.length;
  const done = completedSteps.filter((s) => s !== 'COMPLETE').length;
  const linePct = success ? 100 : (done / total) * 100;

  return (
    <div className='w-full rounded-xl border border-white/[0.08] bg-[#0d0d10] px-3.5 py-2.5'>
      <div className='mb-2.5 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.22em]'>
        <span className='text-[#8e8e98]'>
          {mode === 'verify'
            ? '1:1 OPENBR MATCH + LIVENESS'
            : 'FIRST-TIME 5-STAGE ENROLLMENT'}
        </span>
        <span className='text-white font-semibold'>
          {done}/{total}
        </span>
      </div>

      {/* Track */}
      <div className='relative'>
        {/* Background rail */}
        <div className='absolute left-[14px] right-[14px] top-[12px] h-px bg-white/10' />

        {/* Animated fill */}
        <motion.div
          className='absolute top-[12px] h-px bg-gradient-to-r from-[#ff4500] to-emerald-400'
          style={{ left: '14px', right: `${100 - linePct}%` }}
          initial={false}
          animate={{ right: `${(1 - linePct / 100) * (100 - 28 / 4)}%` }}
          transition={{ type: 'spring', stiffness: 180, damping: 26 }}
        />

        {/* Step nodes */}
        <div className='relative flex justify-between'>
          {activeSteps.map((step, i) => {
            const isDone = completedSteps.includes(step);
            const isActive = currentStep === step && !isDone && !success;

            return (
              <div key={step} className='flex flex-col items-center gap-1.5'>
                <motion.div
                  className={`relative flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[9px] font-bold transition-colors ${
                    isDone
                      ? 'border-emerald-400 bg-emerald-400/15 text-emerald-400'
                      : isActive
                        ? 'border-[#ff4500] bg-[#ff4500]/15 text-white'
                        : 'border-white/15 bg-[#141418] text-[#8e8e98]'
                  }`}
                  animate={
                    isActive
                      ? {
                          boxShadow: [
                            '0 0 0px rgba(255,69,0,0)',
                            '0 0 12px rgba(255,69,0,0.55)',
                            '0 0 0px rgba(255,69,0,0)',
                          ],
                        }
                      : {}
                  }
                  transition={{ repeat: Infinity, duration: 1.6 }}
                >
                  {isDone ? (
                    <svg
                      className='h-3 w-3 text-emerald-400'
                      viewBox='0 0 12 12'
                      fill='none'
                    >
                      <path
                        d='M2 6l3 3 5-5'
                        stroke='currentColor'
                        strokeWidth='1.8'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </motion.div>
                <span
                  className={`font-mono text-[7px] uppercase tracking-wider ${
                    isDone
                      ? 'text-emerald-400'
                      : isActive
                        ? 'text-white font-semibold'
                        : 'text-[#8e8e98]'
                  }`}
                >
                  {mode === 'enroll' && step === 'LOOK_STRAIGHT'
                    ? 'LOOK'
                    : STEP_LABELS[step]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
