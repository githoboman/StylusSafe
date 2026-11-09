'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  PanInfo,
} from 'motion/react';
import {
  IconFingerprint,
  IconShield,
  IconCpu,
  IconWallet,
  IconKey,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
} from '@/components/Icons';

export interface OnboardingSlide {
  id: string;
  step: string;
  title: string;
  simpleExplanation: string;
  howToSteps: string[];
  techLine: string;
  icon: 'biometric' | 'usdg' | 'firewall' | 'gasless' | 'ready';
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'biometric-key',
    step: 'Step 1 of 5',
    title: 'Your Face & Fingerprint Are Your Key',
    simpleExplanation:
      'Forget writing down 12 secret words on paper. Unlock and recover your wallet anytime using your camera and fingerprint sensor — just like unlocking your phone.',
    howToSteps: [
      'Quick 3-second live camera & fingerprint check',
      'Your device hardware locks your vault on Arbitrum',
    ],
    techLine: 'OpenBR 64-D Vector · Hardware secp256r1 Passkey',
    icon: 'biometric',
  },
  {
    id: 'free-usdg',
    step: 'Step 2 of 5',
    title: 'Start with $1,000 in Digital Dollars',
    simpleExplanation:
      'As soon as you create your wallet, we automatically fund it with $1,000.00 in test USDG so you can try sending and saving right away.',
    howToSteps: [
      'Tap "Create New Wallet" on your dashboard',
      '$1,000.00 USDG arrives automatically on Arbitrum Sepolia',
    ],
    techLine: 'Paxos USDG (0xDa4D...BD36) · Auto-Faucet Mint',
    icon: 'usdg',
  },
  {
    id: 'ai-allowance',
    step: 'Step 3 of 5',
    title: 'Safe Daily Allowances for AI Helpers',
    simpleExplanation:
      'Never give an AI helper your master key. Instead, set a strict daily spending limit (like $500/day). Anything above your limit is automatically blocked.',
    howToSteps: [
      'Choose a daily spending limit and approved apps',
      'Turn off the AI helper key anytime in one tap',
    ],
    techLine: 'Arbitrum Stylus Rust WASM · Scoped Session Keys',
    icon: 'firewall',
  },
  {
    id: 'zero-gas',
    step: 'Step 4 of 5',
    title: 'Send Money in One Tap with $0 Fees',
    simpleExplanation:
      'You never need to buy extra gas tokens just to send money. StylusSafe covers the network fee for you and settles in seconds.',
    howToSteps: [
      'Enter the amount of USDG you want to send',
      'Approve with one fingerprint or face scan ($0 fee)',
    ],
    techLine: 'Native RIP-7212 (0x0100) ~3,450 Gas · ERC-4337 Paymaster',
    icon: 'gasless',
  },
  {
    id: 'ready-to-start',
    step: 'Step 5 of 5',
    title: 'You Are Ready to Open Your Vault',
    simpleExplanation:
      'Swipe this final card away or tap "Start Using Wallet" below. This guide will disappear so you can go straight to your wallet.',
    howToSteps: [
      'Create or unlock your wallet with your face & fingerprint',
      'Send test USDG or set your AI spending limits',
    ],
    techLine: 'CREATE2 Smart Account · Arbitrum Sepolia Live',
    icon: 'ready',
  },
];

const ONBOARDING_STORAGE_KEY = 'stylussafe_onboarding_done_v2';

function SlideGraphicIcon({ type }: { type: OnboardingSlide['icon'] }) {
  switch (type) {
    case 'biometric':
      return <IconFingerprint size={26} />;
    case 'usdg':
      return <IconWallet size={26} />;
    case 'firewall':
      return <IconShield size={26} />;
    case 'gasless':
      return <IconCpu size={26} />;
    case 'ready':
      return <IconKey size={26} />;
  }
}

interface SwipeCardProps {
  slide: OnboardingSlide;
  isTop: boolean;
  stackOffset: number;
  onSwipedAway: (direction: 'left' | 'right') => void;
}

function SwipeCard({ slide, isTop, stackOffset, onSwipedAway }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-12, 0, 12]);
  const cardOpacity = useTransform(x, [-300, -160, 0, 160, 300], [0.3, 0.95, 1, 0.95, 0.3]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const offsetThreshold = 70;
    const velocityThreshold = 360;

    if (info.offset.x > offsetThreshold || info.velocity.x > velocityThreshold) {
      onSwipedAway('right');
    } else if (
      info.offset.x < -offsetThreshold ||
      info.velocity.x < -velocityThreshold
    ) {
      onSwipedAway('left');
    }
  };

  const targetScale = 1 - stackOffset * 0.04;
  const targetY = stackOffset * 12;
  const targetOpacity = stackOffset === 0 ? 1 : stackOffset === 1 ? 0.6 : 0.25;

  return (
    <motion.div
      style={
        isTop
          ? {
              x,
              rotate,
              opacity: cardOpacity,
              zIndex: 30 - stackOffset,
            }
          : {
              zIndex: 30 - stackOffset,
            }
      }
      initial={{ scale: 0.94, y: 16, opacity: 0 }}
      animate={{
        scale: targetScale,
        y: targetY,
        opacity: targetOpacity,
      }}
      exit={{
        x: 320,
        rotate: 14,
        opacity: 0,
        scale: 0.92,
        transition: { type: 'spring', stiffness: 280, damping: 24 },
      }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 26,
        mass: 0.8,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileTap={isTop ? { scale: 0.985, cursor: 'grabbing' } : undefined}
      className={`w-full max-w-full select-none rounded-2xl bg-[#141418] border ${
        isTop ? 'border-white/[0.14]' : 'border-white/[0.06]'
      } shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden p-6 sm:p-8 space-y-6 ${
        isTop ? 'cursor-grab active:cursor-grabbing touch-pan-y' : 'pointer-events-none'
      }`}
    >
      {/* Top Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-[#ff4500] shrink-0">
          <SlideGraphicIcon type={slide.icon} />
        </div>
        <span className="text-xs font-mono text-zinc-400 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
          {slide.step}
        </span>
      </div>

      {/* Main Copy */}
      <div className="space-y-3">
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
          {slide.title}
        </h3>
        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
          {slide.simpleExplanation}
        </p>
      </div>

      {/* Simple Bullet Points */}
      <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
        {slide.howToSteps.map((item) => (
          <div
            key={item}
            className="flex items-start gap-2.5 text-sm text-zinc-200 leading-relaxed"
          >
            <span className="mt-1 shrink-0 text-[#ff4500]">
              <IconCheck size={15} />
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      {/* Subtle Technical Footer */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs font-mono text-zinc-400">
        <span className="truncate">{slide.techLine}</span>
        <span className="text-zinc-300 shrink-0">Swipe →</span>
      </div>
    </motion.div>
  );
}

export function FirstTimeOnboardingOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (done !== 'true') {
        setIsVisible(true);
      }
    }
  }, []);

  const completeAndDismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    }
    setIsVisible(false);
  }, []);

  const handleCardSwiped = useCallback(() => {
    if (currentIndex >= ONBOARDING_SLIDES.length - 1) {
      completeAndDismiss();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, completeAndDismiss]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  if (!isVisible) return null;

  const remainingSlides = ONBOARDING_SLIDES.slice(currentIndex, currentIndex + 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      >
        <div className="w-full max-w-lg mx-auto bg-[#09090b] border border-white/[0.1] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-auto">
          {/* Top Progress & Skip */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Welcome Guide
              </span>
              <button
                type="button"
                onClick={completeAndDismiss}
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer px-2.5 py-1 rounded-md bg-white/[0.04]"
              >
                Skip Guide ✕
              </button>
            </div>

            {/* 5-Segment Progress Bar */}
            <div className="grid grid-cols-5 gap-2">
              {ONBOARDING_SLIDES.map((s, idx) => {
                const isActiveOrDone = idx <= currentIndex;
                return (
                  <div
                    key={s.id}
                    className="h-1.5 rounded-full overflow-hidden bg-white/[0.1]"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isActiveOrDone ? 'w-full bg-[#ff4500]' : 'w-0'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stacked Tinder-Swiper Stage */}
          <div className="relative w-full min-h-[340px] sm:min-h-[350px] pb-3 flex items-start justify-center">
            <AnimatePresence initial={false} mode="popLayout">
              {remainingSlides
                .slice()
                .reverse()
                .map((slide) => {
                  const slideIdx = ONBOARDING_SLIDES.findIndex((s) => s.id === slide.id);
                  const stackOffset = slideIdx - currentIndex;
                  return (
                    <div
                      key={slide.id}
                      className={
                        stackOffset === 0
                          ? 'relative w-full'
                          : 'absolute inset-x-0 top-0 w-full'
                      }
                    >
                      <SwipeCard
                        slide={slide}
                        isTop={stackOffset === 0}
                        stackOffset={stackOffset}
                        onSwipedAway={handleCardSwiped}
                      />
                    </div>
                  );
                })}
            </AnimatePresence>
          </div>

          {/* Bottom Controls */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="h-11 px-4 rounded-xl bg-[#141418] hover:bg-white/[0.08] disabled:opacity-30 border border-white/[0.08] text-sm font-medium text-white inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <IconArrowLeft size={15} />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleCardSwiped}
              className="flex-1 h-11 px-5 rounded-xl bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>
                {currentIndex === ONBOARDING_SLIDES.length - 1
                  ? 'Start Using Wallet'
                  : 'Next Card'}
              </span>
              <IconArrowRight size={15} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
