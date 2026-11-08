'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
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
  IconSwap,
  IconKey,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconAutoRenew,
} from '@/components/Icons';

export interface OnboardingSlide {
  id: string;
  step: string;
  badge: string;
  accentColor: string;
  borderAccent: string;
  bgGlow: string;
  title: string;
  subtitle: string;
  metrics: { label: string; value: string }[];
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
  icon: 'biometric' | 'stylus' | 'firewall' | 'usdg' | 'intents' | 'ready';
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'biometric-enclave',
    step: '01 / 06',
    badge: 'DUAL-BIOMETRIC HARDWARE VAULT',
    accentColor: 'text-[#ff4500]',
    borderAccent: 'border-[#ff4500]/40',
    bgGlow: 'from-[#ff4500]/20 via-[#ff4500]/5 to-transparent',
    title: 'Your Face & Fingerprint Hold Your Wallet',
    subtitle:
      'Zero seed phrases to write down or lose. StylusSafe binds an OpenBR 64-D craniofacial geometry vector and your hardware Secure Enclave secp256r1 passkey directly to a deterministic smart account.',
    metrics: [
      { label: 'Face Engine', value: 'OpenBR 64-D + MediaPipe 468-Pt' },
      { label: 'Hardware Curve', value: 'NIST P-256 (secp256r1)' },
    ],
    highlights: [
      '3-stage active liveness challenge blocks photo & deepfake spoofing',
      'Hardware-backed CryptoObject signs ERC-4337 UserOperations inside TEE',
      'Instant wallet recovery across sessions using your face + fingerprint',
    ],
    ctaLabel: 'Enroll Biometric Vault',
    ctaHref: '/dashboard',
    icon: 'biometric',
  },
  {
    id: 'stylus-wasm',
    step: '02 / 06',
    badge: 'ARBITRUM STYLUS + RIP-7212',
    accentColor: 'text-emerald-400',
    borderAccent: 'border-emerald-500/40',
    bgGlow: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    title: '98.9% Gas Reduction via Rust WASM',
    subtitle:
      'Verifying P-256 biometric signatures in traditional Solidity costs ~320,000 gas. StylusSafe routes verification through Arbitrum native precompile 0x0100 and Rust WASM in ~3,450 gas.',
    metrics: [
      { label: 'RIP-7212 Precompile', value: '~3,450 Gas (0x0100)' },
      { label: 'WASM Policy Check', value: '~1,400 Gas (Sub-Second)' },
    ],
    highlights: [
      'Native secp256r1 signature verification at address 0x0100',
      'Compiled Rust WASM smart contract execution on Arbitrum Sepolia',
      'ERC-4337 Paymaster sponsors 100% of user transaction gas ($0.00 fee)',
    ],
    ctaLabel: 'Inspect Enclave Security',
    ctaHref: '/security',
    icon: 'stylus',
  },
  {
    id: 'agent-firewall',
    step: '03 / 06',
    badge: 'DETERMINISTIC AGENT FIREWALL',
    accentColor: 'text-blue-400',
    borderAccent: 'border-blue-500/40',
    bgGlow: 'from-blue-500/20 via-blue-500/5 to-transparent',
    title: 'Prompt-Injection Proof AI Guardrails',
    subtitle:
      'Delegate execution to autonomous AI agents without surrendering custody. Every agent transaction is checked against immutable on-chain spending caps and contract whitelists before settlement.',
    metrics: [
      { label: 'Rolling 24h Cap', value: '$500.00 USDG Max' },
      { label: 'Panic Revocation', value: '1-Block Biometric Killswitch' },
    ],
    highlights: [
      'Adversarial prompt injections revert deterministically on-chain ($0 lost)',
      'Strict target contract & selector allowlists (Uniswap V3, Aave V3)',
      'Time-bounded ephemeral session keys that auto-expire on schedule',
    ],
    ctaLabel: 'Configure Agent Firewall',
    ctaHref: '/trading',
    icon: 'firewall',
  },
  {
    id: 'paxos-usdg',
    step: '04 / 06',
    badge: 'PAXOS GLOBAL DOLLAR NETWORK',
    accentColor: 'text-amber-400',
    borderAccent: 'border-amber-500/40',
    bgGlow: 'from-amber-500/20 via-amber-500/5 to-transparent',
    title: 'Self-Funding Treasury Powered by USDG',
    subtitle:
      'Standardized on Paxos USDG (Global Dollar Network). Every newly enrolled biometric wallet is automatically funded with real Arbitrum Sepolia Testnet USDG on-chain.',
    metrics: [
      { label: 'Auto-Faucet Grant', value: '1,000.00 Real Testnet USDG' },
      { label: 'Reserve Standard', value: '1:1 US T-Bills & Cash' },
    ],
    highlights: [
      'Real ERC-20 USDG minted on Arbitrum Sepolia (0xDa4D...BD36)',
      'Global Dollar Network reserve yield offsets Paymaster gas & AI compute',
      'Automated recurring DCA & subscription streams with zero manual signing',
    ],
    ctaLabel: 'View USDG Treasury',
    ctaHref: '/dashboard',
    icon: 'usdg',
  },
  {
    id: 'cross-chain-intents',
    step: '05 / 06',
    badge: 'UNIVERSAL CROSS-CHAIN INTENTS',
    accentColor: 'text-purple-400',
    borderAccent: 'border-purple-500/40',
    bgGlow: 'from-purple-500/20 via-purple-500/5 to-transparent',
    title: 'Atomic Multi-Call & Cross-Chain Settlement',
    subtitle:
      'Bundle token approvals, liquidity routing, and cross-chain transfers across Arbitrum, Base, Optimism, Polygon, and Ethereum into a single biometric UserOperation.',
    metrics: [
      { label: 'Settlement Latency', value: '~3.2 Seconds Atomic' },
      { label: 'Supported Chains', value: 'Arbitrum, Base, OP, Polygon, ETH' },
    ],
    highlights: [
      'Batch multi-step DeFi workflows into a single biometric signature',
      'Zero fragmented gas tokens needed across destination L2 networks',
      'Full cryptographic audit trail for every human and agent operation',
    ],
    ctaLabel: 'Explore Intent Batcher',
    ctaHref: '/intents',
    icon: 'intents',
  },
  {
    id: 'launch-ready',
    step: '06 / 06',
    badge: 'READY FOR LAUNCH',
    accentColor: 'text-emerald-400',
    borderAccent: 'border-emerald-500/40',
    bgGlow: 'from-emerald-500/25 via-[#ff4500]/10 to-transparent',
    title: 'Initialize Your Biometric Vault Now',
    subtitle:
      'You have completed the StylusSafe architecture walkthrough. Enroll your face and device biometric passkey now to deploy your vault and claim 1,000.00 Testnet USDG.',
    metrics: [
      { label: 'Setup Time', value: '< 15 Seconds' },
      { label: 'Initial Balance', value: '1,000.00 USDG (Auto-Funded)' },
    ],
    highlights: [
      'Step 1: Complete 3-stage MediaPipe + OpenBR 64-D Face Enrollment',
      'Step 2: Bind Hardware Fingerprint / FaceID secp256r1 Enclave Key',
      'Step 3: Receive 1,000.00 Testnet USDG & configure AI Agent Guardrails',
    ],
    ctaLabel: 'Enter Biometric Vault',
    ctaHref: '/dashboard',
    icon: 'ready',
  },
];

function SlideGraphicIcon({ type }: { type: OnboardingSlide['icon'] }) {
  switch (type) {
    case 'biometric':
      return <IconFingerprint size={26} />;
    case 'stylus':
      return <IconCpu size={26} />;
    case 'firewall':
      return <IconShield size={26} />;
    case 'usdg':
      return <IconWallet size={26} />;
    case 'intents':
      return <IconSwap size={26} />;
    case 'ready':
      return <IconKey size={26} />;
  }
}

interface SwipeCardProps {
  slide: OnboardingSlide;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (direction: 'left' | 'right') => void;
  onJumpToEnd: () => void;
}

function SwipeCard({
  slide,
  isTop,
  stackIndex,
  onSwipe,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Tinder-like 3D rotation & stamp opacities tied to horizontal drag x
  const rotate = useTransform(x, [-260, 0, 260], [-15, 0, 15]);
  const cardOpacity = useTransform(x, [-320, -180, 0, 180, 320], [0.4, 0.95, 1, 0.95, 0.4]);

  // Right drag -> "NEXT / CONFIRM" green stamp
  const rightStampOpacity = useTransform(x, [25, 110], [0, 1]);
  const rightStampScale = useTransform(x, [25, 110], [0.8, 1.05]);

  // Left drag -> "NEXT / ADVANCE" orange stamp (both left & right swipes advance in Tinder style, or left can cycle)
  const leftStampOpacity = useTransform(x, [-110, -25], [1, 0]);
  const leftStampScale = useTransform(x, [-110, -25], [1.05, 0.8]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const offsetThreshold = 85;
    const velocityThreshold = 420;

    if (info.offset.x > offsetThreshold || info.velocity.x > velocityThreshold) {
      onSwipe('right');
    } else if (
      info.offset.x < -offsetThreshold ||
      info.velocity.x < -velocityThreshold
    ) {
      onSwipe('left');
    }
  };

  // Stacked depth positioning for cards underneath the top card
  const targetScale = 1 - stackIndex * 0.045;
  const targetY = stackIndex * 14;
  const targetOpacity = stackIndex === 0 ? 1 : stackIndex === 1 ? 0.65 : 0.35;

  return (
    <motion.div
      style={
        isTop
          ? {
              x,
              y,
              rotate,
              opacity: cardOpacity,
              zIndex: 30 - stackIndex,
            }
          : {
              zIndex: 30 - stackIndex,
            }
      }
      initial={{ scale: 0.92, y: 24, opacity: 0 }}
      animate={{
        scale: targetScale,
        y: targetY,
        opacity: targetOpacity,
      }}
      exit={{
        x: 340,
        rotate: 18,
        opacity: 0,
        scale: 0.9,
        transition: { type: 'spring', stiffness: 260, damping: 24 },
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
      className={`w-full select-none rounded-2xl bg-[#121216] border ${
        isTop ? slide.borderAccent : 'border-white/[0.07]'
      } shadow-[0_24px_60px_rgba(0,0,0,0.75)] overflow-hidden ${
        isTop ? 'cursor-grab active:cursor-grabbing touch-pan-y' : 'pointer-events-none'
      }`}
    >
      {/* Top Ambient Gradient Header */}
      <div className={`relative p-5 sm:p-6 bg-gradient-to-br ${slide.bgGlow} border-b border-white/[0.06]`}>
        {/* Tinder-Style Swipe Stamp Overlays (Only on Top Card) */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: rightStampOpacity, scale: rightStampScale }}
              className="pointer-events-none absolute top-4 right-4 z-20 px-3 py-1 rounded-md border-2 border-emerald-400 bg-emerald-950/90 text-emerald-300 font-mono text-[11px] font-bold tracking-widest uppercase -rotate-6 shadow-lg"
            >
              NEXT SLIDE →
            </motion.div>
            <motion.div
              style={{ opacity: leftStampOpacity, scale: leftStampScale }}
              className="pointer-events-none absolute top-4 left-4 z-20 px-3 py-1 rounded-md border-2 border-[#ff4500] bg-[#2a0f05]/90 text-[#ff4500] font-mono text-[11px] font-bold tracking-widest uppercase rotate-6 shadow-lg"
            >
              ← SWIPE CARD
            </motion.div>
          </>
        )}

        <div className="flex items-center justify-between gap-2 mb-4">
          <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-black/40 border border-white/[0.08] ${slide.accentColor}`}>
            {slide.badge}
          </span>
          <span className="text-xs font-mono text-[#8e8e98] tabular-nums">
            {slide.step}
          </span>
        </div>

        <div className="flex items-start gap-3.5">
          <div className={`w-12 h-12 rounded-xl bg-[#09090b]/90 border border-white/[0.1] flex items-center justify-center shrink-0 ${slide.accentColor} shadow-inner`}>
            <SlideGraphicIcon type={slide.icon} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
              {slide.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#a1a1aa] mt-1.5 leading-relaxed">
              {slide.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Card Body: Telemetry Metrics & Highlights */}
      <div className="p-5 sm:p-6 space-y-4 bg-[#121216]">
        {/* 2-Column Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {slide.metrics.map((m) => (
            <div
              key={m.label}
              className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] flex flex-col justify-between"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8e8e98]">
                {m.label}
              </span>
              <span className="text-xs sm:text-sm font-mono font-semibold text-white mt-0.5 truncate">
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Checklist Points */}
        <div className="space-y-2 pt-1">
          {slide.highlights.map((item) => (
            <div
              key={item}
              className="flex items-start gap-2.5 text-xs text-[#d4d4d8] leading-relaxed"
            >
              <span className={`mt-0.5 shrink-0 ${slide.accentColor}`}>
                <IconCheck size={14} />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Bottom Card Footer: Swipe Hint + Direct Action Link */}
        <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-[#8e8e98] flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff4500] animate-pulse" />
            <span>Drag or swipe card left/right</span>
          </span>

          <Link
            href={slide.ctaHref}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-8 px-3.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <span>{slide.ctaLabel}</span>
            <IconArrowRight size={13} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

interface OnboardingSwiperProps {
  mode?: 'inline' | 'modal';
  onClose?: () => void;
}

export function OnboardingSwiper({ mode = 'inline', onClose }: OnboardingSwiperProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<number[]>([]);

  const totalSlides = ONBOARDING_SLIDES.length;

  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      setSwipeHistory((prev) => [...prev, activeIndex]);
      if (direction === 'right' || direction === 'left') {
        setActiveIndex((prev) => (prev + 1) % totalSlides);
      }
    },
    [activeIndex, totalSlides]
  );

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setSwipeHistory((prev) => [...prev, activeIndex]);
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [activeIndex, totalSlides]);

  const handleReset = useCallback(() => {
    setSwipeHistory([]);
    setActiveIndex(0);
  }, []);

  // Build visible stack of 3 cards starting from activeIndex
  const visibleStack = [0, 1, 2].map((offset) => {
    const index = (activeIndex + offset) % totalSlides;
    return {
      slide: ONBOARDING_SLIDES[index],
      index,
      stackIndex: offset,
    };
  });

  const deckContent = (
    <div className="w-full max-w-xl mx-auto flex flex-col">
      {/* Top Progress Bar & Step Counter */}
      <div className="mb-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#ff4500]/15 text-[#ff4500] border border-[#ff4500]/30 font-semibold text-[11px]">
              INTERACTIVE DECK
            </span>
            <span className="text-[#8e8e98]">
              Slide {activeIndex + 1} of {totalSlides}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {swipeHistory.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-[#8e8e98] hover:text-white inline-flex items-center gap-1 transition-colors"
                title="Restart Onboarding Deck"
              >
                <IconAutoRenew size={12} />
                <span>Restart</span>
              </button>
            )}
            {mode === 'modal' && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="h-7 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-mono"
              >
                Close [✕]
              </button>
            )}
          </div>
        </div>

        {/* Segmented Story/Tinder Progress Bars */}
        <div className="grid grid-cols-6 gap-1.5">
          {ONBOARDING_SLIDES.map((s, idx) => {
            const isCurrent = idx === activeIndex;
            const isCompleted = idx < activeIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to onboarding slide ${idx + 1}`}
                className="h-1.5 rounded-full overflow-hidden bg-white/[0.1] transition-all cursor-pointer"
              >
                <motion.div
                  initial={false}
                  animate={{
                    width: isCurrent || isCompleted ? '100%' : '0%',
                    backgroundColor: isCurrent
                      ? '#ff4500'
                      : isCompleted
                      ? '#10b981'
                      : 'rgba(255,255,255,0.1)',
                  }}
                  transition={{ duration: 0.25 }}
                  className="h-full rounded-full"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Stacked Tinder-Swiper Card Stage */}
      <div className="relative w-full min-h-[430px] sm:min-h-[415px] pb-6 flex items-start justify-center">
        <AnimatePresence initial={false} mode="popLayout">
          {visibleStack
            .slice()
            .reverse()
            .map(({ slide, index, stackIndex }) => (
              <div
                key={`${slide.id}-${index}`}
                className={stackIndex === 0 ? 'relative w-full' : 'absolute inset-x-0 top-0 w-full'}
              >
                <SwipeCard
                  slide={slide}
                  isTop={stackIndex === 0}
                  stackIndex={stackIndex}
                  onSwipe={handleSwipe}
                  onJumpToEnd={() => setActiveIndex(totalSlides - 1)}
                />
              </div>
            ))}
        </AnimatePresence>
      </div>

      {/* Tinder-Style Tactile Action Dock */}
      <div className="mt-2 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrev}
          className="h-11 px-4 rounded-xl bg-[#141418] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] text-xs font-mono text-[#a1a1aa] hover:text-white inline-flex items-center gap-2 transition-all"
        >
          <IconArrowLeft size={15} />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8e8e98] hidden sm:flex">
          <span>Swipe card or use controls</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNext}
            className="h-11 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/[0.12] text-xs font-mono font-semibold text-white inline-flex items-center gap-2 transition-all"
          >
            <span>Swipe Next</span>
            <IconArrowRight size={15} />
          </button>

          <Link
            href="/dashboard"
            onClick={onClose}
            className="h-11 px-4 rounded-xl bg-[#ff4500] hover:bg-[#e03d00] active:scale-95 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-lg shadow-[#ff4500]/20 transition-all"
          >
            <span>Enter Vault</span>
            <IconArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-xl bg-[#09090b] border border-white/[0.1] rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
          {deckContent}
        </div>
      </div>
    );
  }

  return deckContent;
}
