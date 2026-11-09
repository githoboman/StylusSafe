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
  simpleTag: string;
  accentColor: string;
  borderAccent: string;
  bgGlow: string;
  title: string;
  simpleExplanation: string;
  howToSteps: string[];
  techProofTitle: string;
  techProofSpec: string;
  icon: 'biometric' | 'usdg' | 'firewall' | 'gasless' | 'ready';
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'biometric-key',
    step: '1 of 5',
    simpleTag: 'STEP 1 • NO SECRET WORDS TO LOSE',
    accentColor: 'text-[#ff4500]',
    borderAccent: 'border-[#ff4500]/40',
    bgGlow: 'from-[#ff4500]/20 via-[#ff4500]/5 to-transparent',
    title: 'Your Face & Fingerprint Are Your Wallet Key',
    simpleExplanation:
      'Old crypto wallets make you write down 12 secret words on paper. Lose the paper, and your money is gone forever. Here, your face and fingerprint unlock your wallet — just like unlocking your phone.',
    howToSteps: [
      'Look at your camera for a quick 3-second live face check',
      'Touch your fingerprint or FaceID sensor to lock in your vault',
      'Come back anytime — your face and fingerprint recover your wallet instantly',
    ],
    techProofTitle: 'Under the Hood (Technical Proof)',
    techProofSpec:
      'OpenBR 64-D Craniofacial Vector + MediaPipe 468-Pt Liveness + Hardware secp256r1 Passkey',
    icon: 'biometric',
  },
  {
    id: 'free-usdg',
    step: '2 of 5',
    simpleTag: 'STEP 2 • FREE $1,000 TEST DOLLARS',
    accentColor: 'text-emerald-400',
    borderAccent: 'border-emerald-500/40',
    bgGlow: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    title: 'Start with $1,000 in Digital Dollars',
    simpleExplanation:
      'As soon as you create your wallet, we automatically load it with $1,000.00 in USDG test dollars so you can try sending, saving, and testing right away.',
    howToSteps: [
      'Tap "Create Wallet" inside your Vault dashboard',
      'Watch $1,000.00 USDG arrive in your balance automatically',
      'Powered by Paxos Global Dollar Network on Arbitrum Sepolia',
    ],
    techProofTitle: 'Under the Hood (Technical Proof)',
    techProofSpec:
      'Real ERC-20 Paxos USDG (0xDa4D...BD36) · 1:1 Reserve Architecture · Auto-Faucet Mint',
    icon: 'usdg',
  },
  {
    id: 'ai-allowance',
    step: '3 of 5',
    simpleTag: 'STEP 3 • SAFE AI ALLOWANCE RULES',
    accentColor: 'text-blue-400',
    borderAccent: 'border-blue-500/40',
    bgGlow: 'from-blue-500/20 via-blue-500/5 to-transparent',
    title: 'Give AI Helpers a Safe Daily Allowance',
    simpleExplanation:
      'Want an AI robot to trade or pay bills for you? Never give it your master key! Instead, give the AI a strict daily allowance (like $500/day). If the AI gets tricked and tries to spend $501, the vault blocks it automatically.',
    howToSteps: [
      'Set a daily spending cap (e.g., $500/day) in the Agent Firewall',
      'Choose which safe apps the AI is allowed to use (like Uniswap)',
      'Tap the red "Panic Revoke" button anytime to turn off the AI in 1 second',
    ],
    techProofTitle: 'Under the Hood (Technical Proof)',
    techProofSpec:
      'Arbitrum Stylus Rust WASM On-Chain Firewall + Scoped Ephemeral Session Keys',
    icon: 'firewall',
  },
  {
    id: 'zero-gas',
    step: '4 of 5',
    simpleTag: 'STEP 4 • FAST & FREE TO SEND',
    accentColor: 'text-amber-400',
    borderAccent: 'border-amber-500/40',
    bgGlow: 'from-amber-500/20 via-amber-500/5 to-transparent',
    title: 'Send Money in 1 Tap with $0 Gas Fees',
    simpleExplanation:
      'Normally, blockchains make you buy special "gas tokens" just to pay for every click. StylusSafe pays the network fee for you, using super-fast Arbitrum math that cuts costs by 99%.',
    howToSteps: [
      'Enter how much USDG you want to send or swap',
      'Approve with 1 fingerprint or face scan',
      'Settles in ~3 seconds with $0.00 gas fee charged to you',
    ],
    techProofTitle: 'Under the Hood (Technical Proof)',
    techProofSpec:
      'Native RIP-7212 Precompile (0x0100) ~3,450 Gas + ERC-4337 Sponsored Paymaster',
    icon: 'gasless',
  },
  {
    id: 'ready-to-start',
    step: '5 of 5',
    simpleTag: 'FINAL STEP • YOU ARE READY',
    accentColor: 'text-emerald-400',
    borderAccent: 'border-emerald-500/40',
    bgGlow: 'from-emerald-500/25 via-[#ff4500]/10 to-transparent',
    title: 'Swipe This Card to Open Your Wallet!',
    simpleExplanation:
      'You now know how StylusSafe works! Swipe this final card away or tap "Start Using Wallet" below — this guide will disappear so you can use your vault.',
    howToSteps: [
      '1. Tap "Create Vault" to scan your face & fingerprint',
      '2. Receive your automatic $1,000.00 USDG test balance',
      '3. Try sending funds or testing the AI Spending Firewall',
    ],
    techProofTitle: 'Under the Hood (Technical Proof)',
    techProofSpec:
      'CREATE2 Smart Account (0xd364...33f7) · 15/15 Invariant Tests Passing on Arbitrum Sepolia',
    icon: 'ready',
  },
];

const ONBOARDING_STORAGE_KEY = 'stylussafe_onboarding_done_v2';

function SlideGraphicIcon({ type }: { type: OnboardingSlide['icon'] }) {
  switch (type) {
    case 'biometric':
      return <IconFingerprint size={24} />;
    case 'usdg':
      return <IconWallet size={24} />;
    case 'firewall':
      return <IconShield size={24} />;
    case 'gasless':
      return <IconCpu size={24} />;
    case 'ready':
      return <IconKey size={24} />;
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
  const rotate = useTransform(x, [-240, 0, 240], [-14, 0, 14]);
  const cardOpacity = useTransform(x, [-300, -160, 0, 160, 300], [0.3, 0.95, 1, 0.95, 0.3]);

  const rightStampOpacity = useTransform(x, [25, 100], [0, 1]);
  const leftStampOpacity = useTransform(x, [-100, -25], [1, 0]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const offsetThreshold = 75;
    const velocityThreshold = 380;

    if (info.offset.x > offsetThreshold || info.velocity.x > velocityThreshold) {
      onSwipedAway('right');
    } else if (
      info.offset.x < -offsetThreshold ||
      info.velocity.x < -velocityThreshold
    ) {
      onSwipedAway('left');
    }
  };

  const targetScale = 1 - stackOffset * 0.045;
  const targetY = stackOffset * 12;
  const targetOpacity = stackOffset === 0 ? 1 : stackOffset === 1 ? 0.65 : 0.3;

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
      initial={{ scale: 0.92, y: 20, opacity: 0 }}
      animate={{
        scale: targetScale,
        y: targetY,
        opacity: targetOpacity,
      }}
      exit={{
        x: 320,
        rotate: 16,
        opacity: 0,
        scale: 0.9,
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
      className={`w-full max-w-full select-none rounded-2xl bg-[#121216] border ${
        isTop ? slide.borderAccent : 'border-white/[0.07]'
      } shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden ${
        isTop ? 'cursor-grab active:cursor-grabbing touch-pan-y' : 'pointer-events-none'
      }`}
    >
      {/* Top Header */}
      <div className={`relative p-4 sm:p-5 bg-gradient-to-br ${slide.bgGlow} border-b border-white/[0.06]`}>
        {isTop && (
          <>
            <motion.div
              style={{ opacity: rightStampOpacity }}
              className="pointer-events-none absolute top-3 right-3 z-20 px-2.5 py-1 rounded border-2 border-emerald-400 bg-emerald-950/95 text-emerald-300 font-mono text-[10px] font-bold tracking-widest uppercase -rotate-6 shadow-lg"
            >
              GOT IT →
            </motion.div>
            <motion.div
              style={{ opacity: leftStampOpacity }}
              className="pointer-events-none absolute top-3 left-3 z-20 px-2.5 py-1 rounded border-2 border-[#ff4500] bg-[#2a0f05]/95 text-[#ff4500] font-mono text-[10px] font-bold tracking-widest uppercase rotate-6 shadow-lg"
            >
              ← NEXT
            </motion.div>
          </>
        )}

        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 border border-white/[0.08] truncate ${slide.accentColor}`}>
            {slide.simpleTag}
          </span>
          <span className="text-[11px] font-mono text-[#8e8e98] shrink-0">
            {slide.step}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#09090b]/90 border border-white/[0.1] flex items-center justify-center shrink-0 ${slide.accentColor}`}>
            <SlideGraphicIcon type={slide.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug break-words">
              {slide.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#d4d4d8] mt-1.5 leading-relaxed break-words">
              {slide.simpleExplanation}
            </p>
          </div>
        </div>
      </div>

      {/* Card Body: How to Use + Technical Proof */}
      <div className="p-4 sm:p-5 space-y-3.5 bg-[#121216]">
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#8e8e98]">
            How It Works (Simple Steps):
          </div>
          {slide.howToSteps.map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 text-xs text-white/90 leading-relaxed"
            >
              <span className={`mt-0.5 shrink-0 ${slide.accentColor}`}>
                <IconCheck size={14} />
              </span>
              <span className="break-words">{item}</span>
            </div>
          ))}
        </div>

        {/* Technical Proof Box */}
        <div className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#ff4500] font-semibold">
            {slide.techProofTitle}
          </div>
          <div className="text-[11px] font-mono text-[#a1a1aa] leading-relaxed break-words">
            {slide.techProofSpec}
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[#8e8e98]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff4500] animate-pulse" />
            <span>Swipe card left or right</span>
          </span>
          <span>{slide.step}</span>
        </div>
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
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      >
        <div className="w-full max-w-md mx-auto bg-[#09090b] border border-white/[0.1] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 my-auto">
          {/* Top Progress & Skip */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-[#ff4500]/15 text-[#ff4500] border border-[#ff4500]/30 font-semibold text-[10px]">
                QUICK WALLET GUIDE
              </span>
              <button
                type="button"
                onClick={completeAndDismiss}
                className="text-xs font-mono text-[#8e8e98] hover:text-white transition-colors cursor-pointer"
              >
                Skip Guide [✕]
              </button>
            </div>

            {/* 5-Segment Progress Bar */}
            <div className="grid grid-cols-5 gap-1.5">
              {ONBOARDING_SLIDES.map((s, idx) => {
                const isCurrent = idx === currentIndex;
                const isDone = idx < currentIndex;
                return (
                  <div
                    key={s.id}
                    className="h-1.5 rounded-full overflow-hidden bg-white/[0.1]"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCurrent
                          ? 'w-full bg-[#ff4500]'
                          : isDone
                            ? 'w-full bg-emerald-400'
                            : 'w-0'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stacked Tinder-Swiper Stage */}
          <div className="relative w-full min-h-[410px] sm:min-h-[400px] pb-4 flex items-start justify-center">
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
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="h-10 px-3.5 rounded-xl bg-[#141418] hover:bg-white/[0.08] disabled:opacity-30 border border-white/[0.08] text-xs font-mono text-white inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <IconArrowLeft size={14} />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleCardSwiped}
              className="flex-1 h-10 px-4 rounded-xl bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 shadow-lg shadow-[#ff4500]/20 transition-all cursor-pointer"
            >
              <span>
                {currentIndex === ONBOARDING_SLIDES.length - 1
                  ? 'Start Using Wallet'
                  : 'Swipe Next Card'}
              </span>
              <IconArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
