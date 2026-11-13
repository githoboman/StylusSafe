'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchLifiQuote } from '@/lib/lifi';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from '@/components/BrandLogo';
import { ThreeVaultScene } from '@/components/ThreeVaultScene';
import { VideoPlayerSection } from '@/components/VideoPlayerSection';
import {
  IconSwap,
  IconArrowRight,
  IconArrowUpRight,
  IconSwapVert,
  IconCheck,
  IconShield,
  IconCpu,
  IconKey,
  IconStacks,
  IconFingerprint,
  IconWallet,
} from '@/components/Icons';

const AI_GUARDRAIL_MODES = [
  {
    id: 'daily_cap',
    step: 'Rule 01',
    title: 'Strict Daily Spending Limit',
    summary:
      'Give an AI helper a clear daily budget — like $500 per day. Any trade inside that budget goes through automatically. Anything over $500 is blocked by the vault.',
    allowanceLabel: '$500.00 / day',
    requestedLabel: '$50.00 USDG Swap',
    targetLabel: 'Uniswap V3 Router',
    outcomeBadge: 'Approved Within Budget',
    outcomeNote:
      'The vault checks your 24-hour spending meter before releasing a single dollar.',
    techSpec: 'Arbitrum Stylus Rust WASM · 24h Rolling Spend Accumulator (~1,420 gas)',
  },
  {
    id: 'app_allowlist',
    step: 'Rule 02',
    title: 'Approved Apps Only',
    summary:
      'Choose the exact apps your AI helper is allowed to touch (such as Uniswap or Paxos Treasury). It can never send your money to an unknown address or phishing link.',
    allowanceLabel: 'Uniswap V3 Only',
    requestedLabel: 'Unknown External Address',
    targetLabel: 'Unapproved Contract',
    outcomeBadge: 'Blocked by Allowlist',
    outcomeNote:
      'Even if an AI is tricked by a fake prompt, the smart contract refuses to interact with unapproved addresses.',
    techSpec: 'On-Chain Target Whitelist · StylusSafe__TargetNotAllowed Revert',
  },
  {
    id: 'killswitch',
    step: 'Rule 03',
    title: 'One-Tap Off Switch',
    summary:
      'You always hold the master key with your face and fingerprint. Tap one button to turn off the AI helper key in a single block.',
    allowanceLabel: 'Session Key Revoked',
    requestedLabel: 'All AI Permissions Cleared',
    targetLabel: 'Master Biometric Enclave',
    outcomeBadge: 'Turned Off in 1 Second',
    outcomeNote:
      'Your fingerprint signature immediately zeroes out the AI helper key on Arbitrum.',
    techSpec: 'Native RIP-7212 (0x0100) Hardware P-256 Revocation (~3,450 gas)',
  },
] as const;

const FAQS = [
  {
    q: 'How do my face and fingerprint unlock my wallet without a 12-word phrase?',
    a: 'Just like unlocking your phone with FaceID or your fingerprint, StylusSafe uses your camera and hardware fingerprint sensor to create a mathematical lock on Arbitrum. Only your live face and device passkey can unlock it.\n\nUnder the hood: MediaPipe 468-point liveness and OpenBR compute a 64-dimensional facial template paired with an unexportable hardware secp256r1 key verified on-chain via Arbitrum precompile 0x0100.',
  },
  {
    q: 'How does the wallet keep my money safe when an AI helper uses it?',
    a: 'You never share your master key with an AI. Instead, you create a temporary helper key with strict rules written directly into the blockchain — such as a $500 daily limit and a list of approved apps. If the AI tries to spend more, the blockchain automatically blocks it.',
  },
  {
    q: 'What is USDG and why do I start with $1,000 on testnet?',
    a: 'USDG is a digital dollar issued by Paxos (1 USDG = $1 USD). When you create your wallet on Arbitrum Sepolia, our built-in faucet automatically sends you 1,000.00 test USDG so you can try transfers and AI allowances right away.',
  },
  {
    q: 'Why are transactions 99% cheaper on Arbitrum Stylus?',
    a: 'Traditional smart contracts verify fingerprint math the slow way (~320,000 gas). StylusSafe runs compiled Rust WebAssembly (WASM) and Arbitrum native precompile 0x0100, verifying hardware signatures in ~3,450 gas.',
  },
];

export default function LandingPage() {
  const [activeHeroTab, setActiveHeroTab] = useState<'3d_vault' | 'intent_swap'>('3d_vault');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [swapAmount, setSwapAmount] = useState('500');
  const [sourceChain, setSourceChain] = useState('Arbitrum Sepolia');
  const [destChain, setDestChain] = useState('Base');
  const [sourceToken, setSourceToken] = useState('USDG');
  const [destToken, setDestToken] = useState('USDC');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [swapOut, setSwapOut] = useState<number | null>(null);

  // Live Li.Fi quote for the demo widget (USDG is quoted as USDC; Arbitrum Sepolia as Arbitrum One).
  useEffect(() => {
    const amt = parseFloat(swapAmount);
    if (!amt || amt <= 0) {
      setSwapOut(0);
      return;
    }
    const chainId = (name: string) => (name === 'Base' ? 8453 : 421614);
    const controller = new AbortController();
    setSwapOut(null);
    const t = setTimeout(async () => {
      const q = await fetchLifiQuote({
        fromChainId: chainId(sourceChain),
        toChainId: chainId(destChain),
        fromSymbol: sourceToken,
        toSymbol: destToken,
        fromDecimals: 6,
        toDecimals: 6,
        amount: amt,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      // No route available: show the 1:1 stable-to-stable value rather than an invented fee.
      setSwapOut(q ? q.toAmount : amt);
    }, 400);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [swapAmount, sourceChain, destChain, sourceToken, destToken]);

  const [selectedGuardrail, setSelectedGuardrail] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSimulateSwap = () => {
    setIsExecuting(true);
    setExecuted(false);
    setTimeout(() => {
      setIsExecuting(false);
      setExecuted(true);
      setTimeout(() => setExecuted(false), 5000);
    }, 1400);
  };

  const flipDirection = () => {
    setRotation((prev) => prev + 180);
    const sC = sourceChain;
    const dC = destChain;
    const sT = sourceToken;
    const dT = destToken;
    setSourceChain(dC);
    setDestChain(sC);
    setSourceToken(dT);
    setDestToken(sT);
  };

  const activeGuardrail = AI_GUARDRAIL_MODES[selectedGuardrail];

  return (
    <div className="bg-[#09090b] text-white min-h-screen w-full selection:bg-[#ff4500] selection:text-white font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-[#09090b] sticky top-0 z-40 w-full">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4 w-full">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <BrandLogo size={28} />
            <span className="text-xs text-zinc-400 pl-3 border-l border-white/[0.1] hidden sm:inline">
              Arbitrum Sepolia
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="/dashboard" className="text-white hover:text-[#ff4500] transition-colors">
              My Wallet
            </Link>
            <Link href="/trading" className="hover:text-white transition-colors">
              AI Allowances
            </Link>
            <Link href="/intents" className="hover:text-white transition-colors">
              Batch Actions
            </Link>
            <Link href="/security" className="hover:text-white transition-colors">
              Biometric Keys
            </Link>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/dashboard"
              className="h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold text-white bg-[#ff4500] hover:bg-[#e03d00] rounded-lg inline-flex items-center transition-colors"
            >
              Open Wallet
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Mobile Navigation"
              className="md:hidden h-10 w-10 rounded-lg bg-[#141418] border border-white/[0.08] flex flex-col items-center justify-center gap-1.5 text-white shrink-0"
            >
              <span
                className={`block w-4 h-0.5 bg-white transition-transform duration-200 ${
                  mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
                }`}
              />
              <span
                className={`block w-4 h-0.5 bg-white transition-opacity duration-200 ${
                  mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`block w-4 h-0.5 bg-white transition-transform duration-200 ${
                  mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-white/[0.08] bg-[#0d0d10] w-full"
            >
              <div className="px-4 py-4 grid grid-cols-2 gap-3 text-sm font-medium">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3.5 rounded-xl bg-[#141418] border border-white/[0.06] text-white flex items-center gap-2.5"
                >
                  <IconWallet size={17} className="text-[#ff4500] shrink-0" />
                  <span className="truncate">My Wallet</span>
                </Link>
                <Link
                  href="/trading"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3.5 rounded-xl bg-[#141418] border border-white/[0.06] text-white flex items-center gap-2.5"
                >
                  <IconShield size={17} className="text-zinc-300 shrink-0" />
                  <span className="truncate">AI Allowances</span>
                </Link>
                <Link
                  href="/intents"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3.5 rounded-xl bg-[#141418] border border-white/[0.06] text-white flex items-center gap-2.5"
                >
                  <IconStacks size={17} className="text-zinc-300 shrink-0" />
                  <span className="truncate">Batches</span>
                </Link>
                <Link
                  href="/security"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3.5 rounded-xl bg-[#141418] border border-white/[0.06] text-white flex items-center gap-2.5"
                >
                  <IconFingerprint size={17} className="text-zinc-300 shrink-0" />
                  <span className="truncate">Biometric Keys</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* SECTION 1: Hero */}
      <section className="py-12 sm:py-20 lg:py-24 px-4 sm:px-8 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center w-full">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-7">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.04]">
                Biometric vaults on Stylus.
              </h1>
              <p className="text-base sm:text-xl text-zinc-300 leading-relaxed max-w-[54ch]">
                Unlock your digital dollar vault with your face and fingerprint — zero seed phrases. Start with{' '}
                <strong className="text-white font-semibold">$1,000 test USDG</strong>, send with{' '}
                <strong className="text-white font-semibold">$0 gas fees</strong>, and cap AI agents on-chain.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3.5">
              <Link
                href="/dashboard"
                className="h-12 px-6 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-lg font-semibold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors"
              >
                <IconFingerprint size={18} />
                <span>Open Wallet ($1,000 USDG)</span>
                <IconArrowRight size={17} />
              </Link>
              <Link
                href="/trading"
                className="h-12 px-6 bg-[#141418] hover:bg-[#1b1b21] text-white rounded-lg font-medium text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors"
              >
                <IconShield size={18} className="text-zinc-300" />
                <span>Configure AI Guardrails</span>
              </Link>
            </div>

            {/* Clean Tabular Metrics */}
            <div className="pt-6 grid grid-cols-3 gap-6 max-w-xl">
              <div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">
                  $0.00
                </div>
                <div className="text-xs sm:text-sm text-zinc-400 mt-1">
                  User Gas Fee
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">
                  ~3,450
                </div>
                <div className="text-xs sm:text-sm text-zinc-400 mt-1">
                  RIP-7212 Gas
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">
                  $1,000
                </div>
                <div className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Starter USDG
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3D Vault / 1-Tap Send */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-[#141418] rounded-2xl p-4 sm:p-5 space-y-4 w-full">
              <div className="grid grid-cols-2 gap-1.5 bg-[#0d0d10] p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveHeroTab('3d_vault')}
                  className={`py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeHeroTab === '3d_vault'
                      ? 'bg-[#1b1b21] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <IconCpu size={15} className="text-[#ff4500] shrink-0" />
                  <span className="truncate">3D Vault</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHeroTab('intent_swap')}
                  className={`py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeHeroTab === 'intent_swap'
                      ? 'bg-[#1b1b21] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <IconSwap size={15} className="text-zinc-300 shrink-0" />
                  <span className="truncate">1-Tap Send</span>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeHeroTab === '3d_vault' ? (
                  <motion.div
                    key="3d"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative bg-[#0d0d10] rounded-2xl border border-white/[0.04] overflow-hidden w-full"
                  >
                    <ThreeVaultScene />
                  </motion.div>
                ) : (
                  <motion.div
                    key="swap"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 w-full"
                  >
                    <div className="bg-[#0d0d10] p-4 rounded-2xl space-y-2 border border-white/[0.05]">
                      <div className="flex justify-between gap-2 text-xs sm:text-sm text-zinc-400">
                        <span>You Send</span>
                        <span className="text-white font-medium">{sourceChain}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="number"
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          className="bg-transparent text-2xl sm:text-3xl font-mono font-bold text-white outline-none w-full tabular-nums"
                        />
                        <div className="bg-[#141418] px-3 py-1.5 rounded-lg border border-white/[0.08] text-xs sm:text-sm font-mono font-semibold text-white shrink-0">
                          {sourceToken}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                      <motion.button
                        type="button"
                        onClick={flipDirection}
                        animate={{ rotate: rotation }}
                        transition={{ duration: 0.35 }}
                        className="w-9 h-9 rounded-full bg-[#1b1b21] hover:bg-[#ff4500] text-zinc-300 hover:text-white border border-white/[0.1] inline-flex items-center justify-center transition-colors shadow-md"
                        title="Flip direction"
                      >
                        <IconSwapVert size={16} />
                      </motion.button>
                    </div>

                    <div className="bg-[#0d0d10] p-4 rounded-2xl space-y-2 border border-white/[0.05]">
                      <div className="flex justify-between gap-2 text-xs sm:text-sm text-zinc-400">
                        <span>They Receive</span>
                        <span className="text-white font-medium">{destChain}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums truncate">
                          {swapOut === null ? '...' : swapOut.toFixed(2)}
                        </div>
                        <div className="bg-[#141418] px-3 py-1.5 rounded-lg border border-white/[0.08] text-xs sm:text-sm font-mono font-semibold text-white shrink-0">
                          {destToken}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm space-y-2 text-zinc-400 pt-1">
                      <div className="flex justify-between gap-2">
                        <span>Approval</span>
                        <span className="text-white font-mono">Face / Fingerprint</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Network Fee</span>
                        <span className="text-white font-mono">$0.00 (Sponsored)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateSwap}
                      disabled={isExecuting}
                      className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.99] text-white rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isExecuting ? (
                        <span>Verifying Biometric Signature...</span>
                      ) : executed ? (
                        <span className="inline-flex items-center gap-2">
                          <IconCheck size={16} />
                          <span>Settled on Arbitrum Sepolia</span>
                        </span>
                      ) : (
                        <span>Test 1-Tap Biometric Transfer</span>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Architecture (Asymmetric Split, Tone Step Ground) */}
      <section className="py-20 sm:py-28 px-4 sm:px-8 bg-[#111114] w-full">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start w-full">
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Simple for people. Enforced by hardware cryptography.
            </h2>
            <p className="text-base text-zinc-400 leading-relaxed max-w-[42ch]">
              Three layers replace seed phrases, gas tokens, and blind AI approvals.
            </p>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="bg-[#18181d] rounded-xl p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-[54ch]">
                <h3 className="text-xl font-bold text-white">
                  Unlock with Face &amp; Fingerprint
                </h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Your device Secure Enclave creates a hardware secp256r1 passkey paired with live 64-D facial verification — zero 12-word recovery phrases to lose.
                </p>
              </div>
              <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
                RIP-7212 (0x0100) · ~3,450 gas
              </span>
            </div>

            <div className="bg-[#18181d] rounded-xl p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-[54ch]">
                <h3 className="text-xl font-bold text-white">
                  Start with $1,000 Test USDG
                </h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  New vaults auto-fund with $1,000.00 test USDG on Arbitrum Sepolia so you can transfer, swap on SwapPool, and test bots immediately with $0 user gas.
                </p>
              </div>
              <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
                Paxos USDG · ERC-4337
              </span>
            </div>

            <div className="bg-[#18181d] rounded-xl p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-[54ch]">
                <h3 className="text-xl font-bold text-white">
                  Concurrent Multi-Policy AI Firewall
                </h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Run an AI Swap Agent, an ERC-7579 DCA Bot, and merchant subscriptions side-by-side in isolated per-key storage with strict daily and per-tx caps.
                </p>
              </div>
              <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
                StylusSafe v3 · ERC-7579
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: AI Allowance Guardrails */}
      <section className="py-20 sm:py-28 px-4 sm:px-8 bg-[#09090b] w-full">
        <div className="max-w-[1600px] mx-auto space-y-12 w-full">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Let AI helpers trade without risking your vault.
            </h2>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-[54ch]">
              Issue a restricted session key enforced directly by your Arbitrum Stylus smart account.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Selector Cards */}
            <div className="lg:col-span-6 space-y-3">
              {AI_GUARDRAIL_MODES.map((mode, idx) => {
                const isSelected = selectedGuardrail === idx;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSelectedGuardrail(idx)}
                    className={`w-full text-left p-6 rounded-xl transition-colors space-y-2 ${
                      isSelected
                        ? 'bg-[#18181d] border border-[#ff4500]/60'
                        : 'bg-[#111114] border border-transparent hover:bg-[#141418]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {mode.title}
                      </h3>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {isSelected ? 'Active' : 'Preview'}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                      {mode.summary}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Right Interactive Preview Card */}
            <div className="lg:col-span-6 bg-[#141418] rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                <h3 className="text-xl font-bold text-white">
                  {activeGuardrail.title}
                </h3>
                <span className="px-3 py-1 rounded-full bg-[#1b1b21] text-xs text-zinc-200 shrink-0">
                  {activeGuardrail.outcomeBadge}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-4 rounded-xl bg-[#0d0d10] flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Active Vault Rule</span>
                  <span className="text-white font-semibold tabular-nums">
                    {activeGuardrail.allowanceLabel}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0d0d10] flex items-center justify-between gap-4">
                  <span className="text-zinc-400">AI Helper Action</span>
                  <span className="text-white font-semibold tabular-nums">
                    {activeGuardrail.requestedLabel}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0d0d10] flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Destination Contract</span>
                  <span className="text-white">
                    {activeGuardrail.targetLabel}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#0d0d10] space-y-2">
                <div className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                  {activeGuardrail.outcomeNote}
                </div>
                <div className="text-xs text-zinc-400 pt-2">
                  {activeGuardrail.techSpec}
                </div>
              </div>

              <div>
                <Link
                  href="/trading"
                  className="w-full h-12 bg-[#1b1b21] hover:bg-[#24242c] rounded-lg text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Set &amp; Test Rules on Your Own Vault</span>
                  <IconArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: 90-Second Three.js Walkthrough Video */}
      <section className="py-20 sm:py-28 px-4 sm:px-8 bg-[#111114] w-full">
        <div className="max-w-[1600px] mx-auto space-y-10 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Ninety seconds inside StylusSafe v3
            </h2>

            <a
              href="/stylussafe-pitch.mp4"
              target="_blank"
              className="text-xs sm:text-sm text-zinc-300 hover:text-white px-4 py-2 rounded-lg bg-[#18181d] inline-flex items-center gap-2 transition-colors self-start md:self-auto"
            >
              <span>Download Video (MP4)</span>
              <IconArrowUpRight size={14} />
            </a>
          </div>

          <VideoPlayerSection />
        </div>
      </section>

      {/* SECTION 5: FAQ & Verified Contracts (2-Column Split) */}
      <section className="py-20 sm:py-28 px-4 sm:px-8 bg-[#09090b] w-full">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start w-full">
          {/* FAQ */}
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Questions &amp; answers
            </h2>

            <div className="divide-y divide-white/[0.08]">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={faq.q} className="py-5">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left group gap-4"
                    >
                      <span className="text-base sm:text-lg font-semibold text-white group-hover:text-[#ff4500] transition-colors">
                        {faq.q}
                      </span>
                      <span className="text-zinc-400 text-xl shrink-0">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <p className="text-sm sm:text-base text-zinc-300 mt-3 leading-relaxed whitespace-pre-line">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Smart Contracts */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Verified Arbitrum Sepolia contracts
              </h2>
              <p className="text-sm sm:text-base text-zinc-400">
                Inspect every live deployment on Arbiscan.
              </p>
            </div>

            <div className="bg-[#141418] rounded-2xl overflow-hidden text-xs sm:text-sm divide-y divide-white/[0.06]">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-zinc-400">Wallet Factory v3 (CREATE2)</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0x1168B0CBc316d9194Eff58e2A27F1FfD33904465"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 font-mono tabular-nums"
                >
                  <span className="truncate">0x1168B0CBc316d9194Eff58e2A27F1FfD33904465</span>
                  <IconArrowUpRight size={14} className="shrink-0" />
                </a>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-zinc-400">Smart Account Vault v3 (ERC-7579)</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0x0242E382976489B6E5aceEB7507a449B01535888"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 font-mono tabular-nums"
                >
                  <span className="truncate">0x0242E382976489B6E5aceEB7507a449B01535888</span>
                  <IconArrowUpRight size={14} className="shrink-0" />
                </a>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-zinc-400">StylusSafeSwapPool (8 Tokens)</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0xD306521Ff547Ab4523f0a77cb9EaE53873be143b"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 font-mono tabular-nums"
                >
                  <span className="truncate">0xD306521Ff547Ab4523f0a77cb9EaE53873be143b</span>
                  <IconArrowUpRight size={14} className="shrink-0" />
                </a>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-zinc-400">Paxos USDG Token</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 font-mono tabular-nums"
                >
                  <span className="truncate">0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36</span>
                  <IconArrowUpRight size={14} className="shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Bold Closing Field */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 bg-[#ff4500] text-white w-full">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Open your vault in ten seconds.
            </h2>
            <p className="text-base sm:text-lg text-white/90 max-w-[50ch]">
              Biometric P-256 passkey, $1,000 test USDG, and an on-chain AI firewall ready on Arbitrum Sepolia.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="h-12 px-7 bg-[#09090b] hover:bg-[#141418] text-white rounded-lg font-semibold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors self-start md:self-auto shrink-0"
          >
            <span>Launch StylusSafe</span>
            <IconArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-8 bg-[#09090b] text-zinc-400 text-xs sm:text-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo size={22} />
            <span className="text-white font-semibold">StylusSafe Biometric Vault</span>
          </div>
          <div>
            Founder: <span className="text-white font-medium">Olaosebikan Ayomi</span> · Arbitrum Sepolia
          </div>
        </div>
      </footer>
    </div>
  );
}
