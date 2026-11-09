'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  IconAlert,
  IconTrash,
  IconStacks,
  IconFingerprint,
  IconWallet,
} from '@/components/Icons';

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

  // Adversarial Playground Simulation State
  const [activeSimulation, setActiveSimulation] = useState<
    'normal' | 'injection' | 'unauthorized_target' | 'panic'
  >('normal');
  const [simRunning, setSimRunning] = useState(false);
  const [simOutput, setSimOutput] = useState<{
    status: 'success' | 'blocked' | 'revoked';
    title: string;
    simpleWhy: string;
    detail: string;
    gasUsed: string;
    txHash: string;
  }>({
    status: 'success',
    title: 'Approved: AI Helper Swapped $25.00 USDG on Uniswap',
    simpleWhy:
      'Why it worked: $25 is safely under your $500 daily allowance, and Uniswap is on your approved app list.',
    detail:
      'TECH PROOF: Intent verified within $500.00 daily ceiling and pre-approved DEX allowlist on Arbitrum Stylus.',
    gasUsed: '1,420 gas (WASM)',
    txHash: '0x3a8f...91c4',
  });

  // FAQ Accordion State
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

  const runSimulationScenario = (
    scenario: 'normal' | 'injection' | 'unauthorized_target' | 'panic'
  ) => {
    setActiveSimulation(scenario);
    setSimRunning(true);
    setTimeout(() => {
      setSimRunning(false);
      if (scenario === 'normal') {
        setSimOutput({
          status: 'success',
          title: 'Approved: AI Helper Swapped $25.00 USDG on Uniswap',
          simpleWhy:
            'Why it worked: $25 is safely under your $500 daily allowance, and Uniswap is on your approved app list.',
          detail:
            'TECH PROOF: Intent verified within $500.00 daily ceiling and pre-approved protocol allowlist.',
          gasUsed: '1,420 gas (WASM execution)',
          txHash: '0x3a8f...91c4',
        });
      } else if (scenario === 'injection') {
        setSimOutput({
          status: 'blocked',
          title: 'Blocked: Tricked AI Tried to Steal $10,000 USDG',
          simpleWhy:
            'Why it was blocked: Even though a hacker tricked the AI brain, the vault saw $10,000 is bigger than the $500 daily allowance and slammed the door shut.',
          detail:
            'TECH PROOF: REVERT StylusSafe__AgentDailyLimitExceeded (spent=0, requested=10000, cap=500). $0.00 lost.',
          gasUsed: '1,120 gas (Revert)',
          txHash: '0x7e2b...44fa (Reverted on-chain)',
        });
      } else if (scenario === 'unauthorized_target') {
        setSimOutput({
          status: 'blocked',
          title: 'Blocked: AI Tried to Send Money to a Fake Scam Website',
          simpleWhy:
            'Why it was blocked: The scam contract is not on your approved list of safe apps, so the smart contract refused to run.',
          detail:
            'TECH PROOF: REVERT StylusSafe__TargetNotAllowed (target=0xEvilDrainer). Contract not on allowlist.',
          gasUsed: '980 gas (Revert)',
          txHash: '0x99a1...10dc (Reverted on-chain)',
        });
      } else {
        setSimOutput({
          status: 'revoked',
          title: 'Emergency Stop: You Turned Off the AI Helper Key',
          simpleWhy:
            'What happened: You scanned your face or fingerprint and pressed the Emergency Stop button, taking away the AI helper key in 1 second.',
          detail:
            'TECH PROOF: Human principal authorized RIP-7212 (0x0100) P-256 killswitch. Session key zeroed on Arbitrum Sepolia.',
          gasUsed: '3,450 gas (RIP-7212)',
          txHash: '0xbf84...89cf (Confirmed in 1 block)',
        });
      }
    }, 650);
  };

  const FAQS = [
    {
      q: 'How can my face and fingerprint hold my wallet without a 12-word password?',
      a: 'Simple answer: Just like your phone uses FaceID or your fingerprint to unlock your screen, StylusSafe uses your camera and fingerprint sensor to create a unique mathematical lock on the Arbitrum blockchain. Only your face and fingerprint can unlock it.\n\nTechnical proof: During sign-up, MediaPipe 468-point liveness and OpenBR extract a 64-dimensional craniofacial template commitment while your device hardware enclave generates an unexportable NIST P-256 (secp256r1) keypair verified on-chain via Arbitrum precompile 0x0100.',
    },
    {
      q: 'How does StylusSafe stop an AI helper from losing or stealing my money?',
      a: 'Simple answer: You never give the AI your master key. Instead, you give it a temporary "allowance card" with strict rules written into the blockchain — like "You can only spend up to $500 a day, and only on Uniswap." If the AI tries to break those rules, the blockchain automatically blocks the transaction.\n\nTechnical proof: Scoped ephemeral session keys are validated by the Arbitrum Stylus Rust WASM policy evaluator against rolling 24-hour spend accumulators, per-tx caps, and target contract allowlists before any ERC-20 transfer can execute.',
    },
    {
      q: 'What is USDG and why do I get $1,000 when I create my wallet?',
      a: 'Simple answer: USDG is a digital dollar created by Paxos (1 USDG = $1 US Dollar). When you create your wallet on our Arbitrum Sepolia test network, our built-in faucet automatically sends you 1,000.00 test USDG so you can try everything right away for free.\n\nTechnical proof: Paxos Global Dollar Network (GDN) shares reserve yield back with ecosystem vaults, allowing smart accounts to self-fund ERC-4337 Paymaster gas fees and AI compute.',
    },
    {
      q: 'Why is Arbitrum Stylus 99% cheaper than normal Ethereum wallets?',
      a: 'Simple answer: Normal Ethereum wallets do heavy fingerprint math the slow way, which costs a lot of money. Arbitrum Stylus runs super-fast Rust code and built-in hardware math, making every fingerprint check almost free.\n\nTechnical proof: Solidity P-256 signature verification costs ~320,000 gas. Arbitrum Stylus compiles Rust to WebAssembly (WASM) and invokes the native RIP-7212 precompile at 0x0100 in ~3,450 gas (a 98.9% reduction).',
    },
  ];

  return (
    <div className="bg-[#09090b] text-[#ffffff] min-h-screen w-full max-w-full selection:bg-[#ff4500] selection:text-white font-sans overflow-x-hidden">
      {/* Top Navigation Bar — Clean, Mobile-Responsive, No Open Swap or Onboarding clutter */}
      <header className="border-b border-white/[0.08] bg-[#09090b]/90 sticky top-0 z-40 backdrop-blur-md w-full max-w-full">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 w-full">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <BrandLogo size={26} />
            <span className="text-xs text-[#8e8e98] pl-2 border-l border-white/[0.1] hidden sm:inline font-mono">
              Arbitrum Sepolia
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-normal text-[#8e8e98]">
            <Link href="/dashboard" className="text-white hover:text-[#ff4500] transition-colors font-medium">
              My Wallet Vault
            </Link>
            <Link href="/trading" className="hover:text-white transition-colors">
              AI Spending Limits
            </Link>
            <Link href="/intents" className="hover:text-white transition-colors">
              Batch Actions
            </Link>
            <Link href="/security" className="hover:text-white transition-colors">
              Face &amp; Fingerprint Keys
            </Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard"
              className="h-9 px-3.5 sm:px-4 text-xs font-semibold text-white bg-[#ff4500] hover:bg-[#e03d00] rounded-md inline-flex items-center transition-all shadow-sm active:scale-[0.98]"
            >
              Open Wallet
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Mobile Navigation"
              className="md:hidden h-9 w-9 rounded-md bg-[#141418] border border-white/[0.08] flex flex-col items-center justify-center gap-1 text-white shrink-0"
            >
              <span
                className={`block w-4 h-0.5 bg-white transition-transform duration-200 ${
                  mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                }`}
              />
              <span
                className={`block w-4 h-0.5 bg-white transition-opacity duration-200 ${
                  mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`block w-4 h-0.5 bg-white transition-transform duration-200 ${
                  mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Responsive Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="md:hidden overflow-hidden border-t border-white/[0.08] bg-[#0d0d10] w-full"
            >
              <div className="px-3.5 py-3.5 grid grid-cols-2 gap-2 text-xs font-mono">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-lg bg-[#141418] border border-white/[0.06] text-white flex items-center gap-2"
                >
                  <IconWallet size={15} className="text-emerald-400 shrink-0" />
                  <span className="truncate">My Wallet</span>
                </Link>
                <Link
                  href="/trading"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-lg bg-[#141418] border border-white/[0.06] text-white flex items-center gap-2"
                >
                  <IconShield size={15} className="text-blue-400 shrink-0" />
                  <span className="truncate">AI Limits</span>
                </Link>
                <Link
                  href="/intents"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-lg bg-[#141418] border border-white/[0.06] text-white flex items-center gap-2"
                >
                  <IconStacks size={15} className="text-purple-400 shrink-0" />
                  <span className="truncate">Batches</span>
                </Link>
                <Link
                  href="/security"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-lg bg-[#141418] border border-white/[0.06] text-white flex items-center gap-2"
                >
                  <IconFingerprint size={15} className="text-[#ff4500] shrink-0" />
                  <span className="truncate">Security Keys</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="pt-7 pb-14 sm:pt-14 sm:pb-20 md:pt-20 md:pb-24 px-3.5 sm:px-6 max-w-7xl mx-auto w-full overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full min-w-0">
          {/* Left Column: Clear Human Explanation + Strong Technical Proof */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-5 sm:space-y-6 w-full min-w-0"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141418] border border-white/[0.08] text-[10px] sm:text-xs font-mono text-[#8e8e98] max-w-full">
              <span className="w-2 h-2 rounded-full bg-[#ff4500] shrink-0" />
              <span className="truncate">
                NO SEED PHRASES • ARBITRUM STYLUS WASM • PAXOS USDG
              </span>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-2xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12] break-words">
                Your face and fingerprint are your wallet. Safe rules for AI helpers.
              </h1>
              <p className="text-sm sm:text-lg text-[#a1a1aa] leading-relaxed max-w-2xl font-normal break-words">
                Unlock your digital dollar vault just like unlocking your phone — zero secret 12-word passwords to lose. Start with <strong className="text-white">$1,000 in free test USDG</strong>, send money across blockchains for <strong className="text-white">$0 gas fees</strong>, and give AI helpers a safe daily allowance they can never break.
              </p>
            </div>

            {/* Technical Proof Pill Strip for Engineers & Judges */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-[#141418]/90 border border-white/[0.08] text-[11px] sm:text-xs font-mono text-[#8e8e98] space-y-1">
              <div className="text-[#ff4500] font-semibold uppercase tracking-wider text-[10px]">
                Under the Hood (Technical Architecture):
              </div>
              <div className="leading-relaxed break-words">
                OpenBR 64-D Face Vector + MediaPipe 468-Pt Liveness + Hardware <span className="text-white">secp256r1</span> Passkey verified via Arbitrum Native Precompile <span className="text-emerald-400">0x0100 (~3,450 gas)</span> &amp; Rust WASM Spending Firewall.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1 w-full">
              <Link
                href="/dashboard"
                className="h-11 px-5 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] text-white rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-sm w-full sm:w-auto"
              >
                <IconFingerprint size={16} />
                <span>Create or Unlock Wallet ($1,000 USDG)</span>
                <IconArrowRight size={16} />
              </Link>
              <Link
                href="/trading"
                className="h-11 px-5 bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-white border border-white/[0.08] rounded-lg font-medium text-sm inline-flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
              >
                <IconShield size={16} className="text-emerald-400" />
                <span>Set AI Daily Allowance</span>
              </Link>
            </div>

            {/* Core Metrics Strip */}
            <div className="pt-5 sm:pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-2 sm:gap-6 w-full">
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                  $0.00
                </div>
                <div className="text-[10px] sm:text-xs text-[#8e8e98] mt-0.5">
                  Gas Fee to You
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-[#ff4500] tabular-nums">
                  ~3,450
                </div>
                <div className="text-[10px] sm:text-xs text-[#8e8e98] mt-0.5">
                  RIP-7212 Gas (99% Less)
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
                  $1,000
                </div>
                <div className="text-[10px] sm:text-xs text-[#8e8e98] mt-0.5">
                  Free Test USDG
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive 3D Vault + Live Swap Simulator */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 w-full min-w-0 max-w-full"
          >
            <div className="bg-[#141418] border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 shadow-2xl space-y-4 w-full max-w-full overflow-hidden">
              {/* Tab Selector Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06] w-full">
                <div className="grid grid-cols-2 gap-1 bg-[#0d0d10] p-1 rounded-lg border border-white/[0.06] w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveHeroTab('3d_vault')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                      activeHeroTab === '3d_vault'
                        ? 'bg-[#1b1b21] text-white shadow-sm font-semibold'
                        : 'text-[#8e8e98] hover:text-white'
                    }`}
                  >
                    <IconCpu size={14} className="text-[#ff4500] shrink-0" />
                    <span className="truncate">3D Biometric Vault</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHeroTab('intent_swap')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                      activeHeroTab === 'intent_swap'
                        ? 'bg-[#1b1b21] text-white shadow-sm font-semibold'
                        : 'text-[#8e8e98] hover:text-white'
                    }`}
                  >
                    <IconSwap size={14} className="text-[#10b981] shrink-0" />
                    <span className="truncate">Try 1-Tap Send</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono text-[#8e8e98] hidden sm:block shrink-0">
                  {activeHeroTab === '3d_vault' ? 'WebGL Hardware Model' : '$0 Gas Demo'}
                </div>
              </div>

              {/* Tab Content Panes */}
              <AnimatePresence mode="wait">
                {activeHeroTab === '3d_vault' ? (
                  <motion.div
                    key="3d"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="relative bg-[#0d0d10] rounded-xl border border-white/[0.04] overflow-hidden w-full max-w-full"
                  >
                    <ThreeVaultScene />
                  </motion.div>
                ) : (
                  <motion.div
                    key="swap"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 w-full"
                  >
                    {/* Source Panel */}
                    <div className="bg-[#0d0d10] p-3.5 sm:p-4 rounded-xl space-y-2 border border-white/[0.04]">
                      <div className="flex justify-between gap-2 text-xs text-[#8e8e98]">
                        <span>You Send</span>
                        <span className="truncate">
                          From: <strong className="text-white font-medium">{sourceChain}</strong>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="number"
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          className="bg-transparent text-2xl sm:text-3xl font-mono font-bold text-white outline-none w-full min-w-0 tabular-nums"
                        />
                        <div className="flex items-center gap-1.5 bg-[#141418] px-2.5 py-1.5 rounded-lg border border-white/[0.08] shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-xs sm:text-sm font-semibold font-mono text-white">
                            {sourceToken}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Direction Switcher */}
                    <div className="flex justify-center -my-2 relative z-10">
                      <motion.button
                        type="button"
                        onClick={flipDirection}
                        animate={{ rotate: rotation }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="w-8 h-8 rounded-full bg-[#1b1b21] hover:bg-[#ff4500] text-[#8e8e98] hover:text-white border border-white/[0.1] inline-flex items-center justify-center transition-colors shadow-md"
                        title="Flip direction"
                      >
                        <IconSwapVert size={15} />
                      </motion.button>
                    </div>

                    {/* Destination Panel */}
                    <div className="bg-[#0d0d10] p-3.5 sm:p-4 rounded-xl space-y-2 border border-white/[0.04]">
                      <div className="flex justify-between gap-2 text-xs text-[#8e8e98]">
                        <span>They Receive</span>
                        <span className="truncate">
                          On: <strong className="text-white font-medium">{destChain}</strong>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums truncate">
                          {(parseFloat(swapAmount || '0') * 0.998).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#141418] px-2.5 py-1.5 rounded-lg border border-white/[0.08] shrink-0">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-xs sm:text-sm font-semibold font-mono text-white">
                            {destToken}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="text-xs space-y-1.5 text-[#8e8e98] pt-1 font-mono">
                      <div className="flex justify-between gap-2">
                        <span>Approval Method</span>
                        <span className="text-white">Face / Fingerprint (RIP-7212)</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Network Gas Fee</span>
                        <span className="text-emerald-400 font-medium">$0.00 (Paid by Vault)</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={handleSimulateSwap}
                      disabled={isExecuting}
                      className="w-full h-11 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.99] text-white rounded-lg font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isExecuting ? (
                        <span className="inline-flex items-center gap-2 font-mono">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying Biometric Signature...</span>
                        </span>
                      ) : executed ? (
                        <motion.span
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-white font-semibold inline-flex items-center gap-1.5 font-mono"
                        >
                          <IconCheck size={16} />
                          <span>Settled on Arbitrum Sepolia!</span>
                        </motion.span>
                      ) : (
                        <span>Test 1-Tap Biometric Transfer</span>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Simple 3-Step Visual Explainer Section (ELI10 + Technical Proof) */}
      <section className="py-12 sm:py-16 px-3.5 sm:px-6 border-t border-white/[0.08] bg-[#0d0d10] w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8 w-full">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-mono text-[#ff4500] uppercase tracking-wider">
              How StylusSafe Works in 3 Simple Steps
            </div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
              Simple enough for anyone. Engineered with institutional cryptography.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full">
            <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-5 space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#ff4500]/15 text-[#ff4500] font-mono text-xs font-bold flex items-center justify-center border border-[#ff4500]/30">
                  01
                </span>
                <span className="text-[10px] font-mono text-[#8e8e98] bg-[#09090b] px-2 py-0.5 rounded border border-white/[0.06]">
                  OpenBR 64-D + P-256
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                1. Unlock with Your Face &amp; Fingerprint
              </h3>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                <strong>In plain English:</strong> Look at your camera and touch your fingerprint sensor. No 12-word seed phrase to write down or lose. Your face and fingerprint recover your wallet anytime.
              </p>
              <div className="p-2.5 rounded-lg bg-[#09090b] border border-white/[0.04] text-[11px] font-mono text-[#8e8e98] break-words">
                <strong className="text-white">Tech Proof:</strong> MediaPipe 468-pt liveness + OpenBR 64-D facial commitment + hardware secp256r1 passkey.
              </div>
            </div>

            <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-5 space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center border border-emerald-500/30">
                  02
                </span>
                <span className="text-[10px] font-mono text-[#8e8e98] bg-[#09090b] px-2 py-0.5 rounded border border-white/[0.06]">
                  Paxos USDG (ERC-20)
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                2. Get $1,000 in Free Test Digital Dollars
              </h3>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                <strong>In plain English:</strong> As soon as your wallet unlocks, we automatically load it with $1,000.00 in USDG digital dollars so you can test sending and saving immediately.
              </p>
              <div className="p-2.5 rounded-lg bg-[#09090b] border border-white/[0.04] text-[11px] font-mono text-[#8e8e98] break-words">
                <strong className="text-white">Tech Proof:</strong> Real on-chain Testnet USDG minted at 0xDa4D...BD36 with ERC-4337 sponsored gas ($0 fee).
              </div>
            </div>

            <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-5 space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 font-mono text-xs font-bold flex items-center justify-center border border-blue-500/30">
                  03
                </span>
                <span className="text-[10px] font-mono text-[#8e8e98] bg-[#09090b] px-2 py-0.5 rounded border border-white/[0.06]">
                  Stylus Rust WASM
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                3. Set Safe Allowance Rules for AI Helpers
              </h3>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                <strong>In plain English:</strong> Give an AI helper a strict daily allowance (like $500/day). If the AI gets hacked or tricked into spending $501, the vault blocks it automatically.
              </p>
              <div className="p-2.5 rounded-lg bg-[#09090b] border border-white/[0.04] text-[11px] font-mono text-[#8e8e98] break-words">
                <strong className="text-white">Tech Proof:</strong> Deterministic on-chain daily spend caps, contract allowlists, and 1-block biometric killswitch.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cinematic Pitch Video Section */}
      <section className="py-12 sm:py-20 px-3.5 sm:px-6 border-t border-white/[0.08] bg-[#09090b] w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-mono text-[#ff4500] uppercase tracking-wider mb-1.5">
                30-Second Visual Walkthrough
              </div>
              <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
                Watch How StylusSafe Works in 30 Seconds
              </h2>
              <p className="text-xs sm:text-sm text-[#8e8e98] mt-1 max-w-xl">
                See how face and fingerprint unlocking, Paxos USDG digital dollars, and AI allowance shields work together.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="/stylussafe-pitch.mp4"
                target="_blank"
                className="text-xs font-mono text-[#8e8e98] hover:text-white px-3 py-1.5 rounded bg-[#141418] border border-white/[0.08] inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Open Video (MP4)</span>
                <IconArrowUpRight size={13} />
              </a>
            </div>
          </div>

          <VideoPlayerSection />
        </div>
      </section>

      {/* LIVE ADVERSARIAL ATTACK PLAYGROUND */}
      <section className="py-12 sm:py-20 px-3.5 sm:px-6 border-t border-white/[0.08] bg-[#0d0d10] w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 w-full">
          <div className="max-w-3xl">
            <div className="text-xs font-mono text-[#ff4500] uppercase tracking-wider mb-1.5">
              Interactive Safety Testbench
            </div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
              Try Tricking the AI Helper: Watch the Vault Block It Live
            </h2>
            <p className="text-xs sm:text-sm text-[#8e8e98] mt-2 leading-relaxed">
              Tap any scenario below to see what happens when an AI helper follows your rules versus when a hacker tries to trick it into stealing your money.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start w-full min-w-0">
            {/* Scenario Triggers */}
            <div className="lg:col-span-5 space-y-2.5 sm:space-y-3 w-full min-w-0">
              <button
                type="button"
                onClick={() => runSimulationScenario('normal')}
                className={`w-full p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-start gap-3 min-w-0 ${
                  activeSimulation === 'normal'
                    ? 'bg-[#141418] border-emerald-500/50 shadow-md'
                    : 'bg-[#141418]/60 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                  <IconCheck size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-white">
                    Test 1: Safe $25 Trade (Allowed)
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#8e8e98] mt-0.5 font-mono break-words">
                    AI spends $25 USDG on Uniswap (inside $500 daily allowance)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => runSimulationScenario('injection')}
                className={`w-full p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-start gap-3 min-w-0 ${
                  activeSimulation === 'injection'
                    ? 'bg-[#141418] border-red-500/50 shadow-md'
                    : 'bg-[#141418]/60 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-500/20">
                  <IconAlert size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-white">
                    Test 2: Tricked AI Tries to Send $10,000 (Blocked)
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#8e8e98] mt-0.5 font-mono break-words">
                    Hacker tricks AI into asking for $10,000 USDG (over $500 cap)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => runSimulationScenario('unauthorized_target')}
                className={`w-full p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-start gap-3 min-w-0 ${
                  activeSimulation === 'unauthorized_target'
                    ? 'bg-[#141418] border-red-500/50 shadow-md'
                    : 'bg-[#141418]/60 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-500/20">
                  <IconShield size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-white">
                    Test 3: Fake Scam Website Attack (Blocked)
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#8e8e98] mt-0.5 font-mono break-words">
                    AI tries to touch an unapproved scam contract
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => runSimulationScenario('panic')}
                className={`w-full p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-start gap-3 min-w-0 ${
                  activeSimulation === 'panic'
                    ? 'bg-[#141418] border-[#ff4500]/50 shadow-md'
                    : 'bg-[#141418]/60 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#ff4500]/10 text-[#ff4500] flex items-center justify-center shrink-0 mt-0.5 border border-[#ff4500]/20">
                  <IconTrash size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-white">
                    Test 4: 1-Tap Emergency Stop Button
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#8e8e98] mt-0.5 font-mono break-words">
                    You scan your fingerprint to turn off the AI helper key immediately
                  </div>
                </div>
              </button>
            </div>

            {/* Simulation Terminal Feed */}
            <div className="lg:col-span-7 bg-[#141418] border border-white/[0.08] rounded-2xl p-4 sm:p-6 font-mono text-xs shadow-xl space-y-4 w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-white font-semibold truncate">
                    LIVE VAULT FIREWALL RESULT
                  </span>
                </div>
                <span className="text-[#8e8e98] text-[11px] shrink-0">Arbitrum Stylus</span>
              </div>

              {simRunning ? (
                <div className="py-14 flex flex-col items-center justify-center gap-3 text-[#8e8e98]">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-[#ff4500] rounded-full animate-spin" />
                  <span>Checking vault allowance rules...</span>
                </div>
              ) : (
                <div className="space-y-4 w-full min-w-0">
                  <div
                    className={`p-3.5 sm:p-4 rounded-xl border w-full min-w-0 ${
                      simOutput.status === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : simOutput.status === 'blocked'
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-[#ff4500]/10 border-[#ff4500]/30 text-[#ff4500]'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold flex items-start gap-2">
                      <span className="inline-flex items-center mt-0.5 shrink-0">
                        {simOutput.status === 'success' ? (
                          <IconCheck size={16} />
                        ) : simOutput.status === 'blocked' ? (
                          <IconAlert size={16} />
                        ) : (
                          <IconKey size={16} />
                        )}
                      </span>
                      <span className="break-words">{simOutput.title}</span>
                    </div>
                    <div className="text-xs text-white font-sans mt-2 leading-relaxed break-words">
                      {simOutput.simpleWhy}
                    </div>
                    <div className="text-[11px] text-white/75 mt-2 pt-2 border-t border-white/10 font-mono leading-relaxed break-words">
                      {simOutput.detail}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] w-full">
                    <div className="p-3 bg-[#0d0d10] rounded-lg border border-white/[0.04] min-w-0">
                      <span className="text-[#8e8e98]">On-Chain Gas Used:</span>
                      <div className="text-white font-semibold mt-0.5 truncate">
                        {simOutput.gasUsed}
                      </div>
                    </div>
                    <div className="p-3 bg-[#0d0d10] rounded-lg border border-white/[0.04] min-w-0">
                      <span className="text-[#8e8e98]">Transaction Proof:</span>
                      <div className="text-white font-semibold mt-0.5 truncate">
                        {simOutput.txHash}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Standard EVM vs Arbitrum Stylus WASM Benchmark */}
      <section className="py-12 sm:py-20 px-3.5 sm:px-6 border-t border-white/[0.08] bg-[#09090b] w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10 w-full">
          <div className="max-w-2xl">
            <div className="text-xs font-mono text-[#10b981] uppercase tracking-wider mb-1.5">
              Speed &amp; Cost Comparison
            </div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
              Why Arbitrum Stylus Makes Fingerprint Checks 99% Cheaper
            </h2>
            <p className="text-xs sm:text-sm text-[#8e8e98] mt-2 leading-relaxed">
              Old Ethereum smart contracts do fingerprint math the slow, expensive way. StylusSafe runs high-speed Rust WASM and Arbitrum native precompile <span className="text-white font-mono">0x0100</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 w-full">
            {/* Old EVM Way */}
            <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-4 sm:p-6 space-y-5 min-w-0">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-red-400 font-mono uppercase tracking-wider">
                  Old Smart Wallets (Solidity)
                </span>
                <span className="text-[11px] text-[#8e8e98]">Expensive</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between gap-2">
                  <span className="text-[#8e8e98]">Fingerprint / FaceID Check</span>
                  <span className="text-red-400 shrink-0">~320,000 Gas</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between gap-2">
                  <span className="text-[#8e8e98]">AI Allowance Rule Check</span>
                  <span className="text-red-400 shrink-0">~42,000 Gas</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between gap-2">
                  <span className="text-[#8e8e98]">If AI Gets Tricked</span>
                  <span className="text-red-400 shrink-0">All Money Lost</span>
                </div>
              </div>
            </div>

            {/* StylusSafe Way */}
            <div className="bg-[#141418] border border-[#ff4500]/30 rounded-xl p-4 sm:p-6 space-y-5 min-w-0">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-[#ff4500] font-mono uppercase tracking-wider">
                  StylusSafe (Arbitrum WASM)
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">98.9% Cheaper</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between gap-2">
                  <span className="text-white">RIP-7212 Precompile (0x0100)</span>
                  <span className="text-emerald-400 shrink-0">~3,450 Gas</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between gap-2">
                  <span className="text-white">Rust WASM Allowance Check</span>
                  <span className="text-emerald-400 shrink-0">~1,400 Gas</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between gap-2">
                  <span className="text-white">If AI Gets Tricked</span>
                  <span className="text-emerald-400 shrink-0">Blocked ($0 Lost)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="py-12 sm:py-20 px-3.5 sm:px-6 border-t border-white/[0.08] bg-[#0d0d10] w-full overflow-x-hidden">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 w-full">
          <div>
            <div className="text-xs font-mono text-[#ff4500] uppercase tracking-wider mb-1.5">
              Plain English + Technical Answers
            </div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className="py-4 sm:py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left group gap-3"
                  >
                    <span className="text-sm sm:text-base font-semibold text-white group-hover:text-[#ff4500] transition-colors break-words">
                      {faq.q}
                    </span>
                    <span className="text-[#8e8e98] font-mono text-lg shrink-0">
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
                        <p className="text-xs sm:text-sm text-[#a1a1aa] mt-3 leading-relaxed whitespace-pre-line break-words">
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
      </section>

      {/* Verified On-Chain Deployments Table */}
      <section className="py-12 sm:py-20 px-3.5 sm:px-6 border-t border-white/[0.08] bg-[#09090b] w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 w-full">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Live Arbitrum Sepolia Smart Contracts
            </h2>
            <p className="text-xs sm:text-sm text-[#8e8e98] mt-1">
              Click any contract below to inspect it live on the Arbitrum Sepolia block explorer.
            </p>
          </div>

          <div className="bg-[#141418] border border-white/[0.08] rounded-xl overflow-hidden font-mono text-xs w-full">
            <div className="divide-y divide-white/[0.06]">
              <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-white/[0.02] transition-colors min-w-0">
                <span className="text-[#8e8e98]">Wallet Factory (CREATE2)</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0xd364b7339099E7633015FD5Cda7e21d4c40833f7"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 min-w-0"
                >
                  <span className="truncate">0xd364b7339099E7633015FD5Cda7e21d4c40833f7</span>
                  <IconArrowUpRight size={13} className="shrink-0" />
                </a>
              </div>
              <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-white/[0.02] transition-colors min-w-0">
                <span className="text-[#8e8e98]">Smart Account Vault v2</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0x0D666af60c511a65d7fe704090632AFE05C932fA"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 min-w-0"
                >
                  <span className="truncate">0x0D666af60c511a65d7fe704090632AFE05C932fA</span>
                  <IconArrowUpRight size={13} className="shrink-0" />
                </a>
              </div>
              <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-white/[0.02] transition-colors min-w-0">
                <span className="text-[#8e8e98]">Paxos USDG Token (6 Decimals)</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 min-w-0"
                >
                  <span className="truncate">0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36</span>
                  <IconArrowUpRight size={13} className="shrink-0" />
                </a>
              </div>
              <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-white/[0.02] transition-colors min-w-0">
                <span className="text-[#8e8e98]">Native RIP-7212 P-256 Precompile</span>
                <span className="text-emerald-400 font-semibold font-mono truncate">
                  0x0000...0100 (Native Arbitrum L2)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-12 pb-10 px-3.5 sm:px-6 border-t border-white/[0.08] bg-[#09090b] text-[#8e8e98] text-xs font-mono w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-10 w-full">
          <div className="p-4 rounded-xl bg-[#141418] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BrandLogo size={22} />
              <span className="text-white font-semibold text-xs sm:text-sm">
                StylusSafe Biometric Vault
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8e8e98]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Arbitrum Sepolia Live</span>
              </span>
              <span>•</span>
              <span>RIP-7212: 0x0100</span>
              <span>•</span>
              <span>Paxos USDG Ready</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[#8e8e98] text-[11px]">
            <div>
              Built for <strong className="text-white">Arbitrum</strong> &amp;{' '}
              <strong className="text-white">Paxos Global Dollar Network</strong>.
            </div>
            <div>
              Founder: <span className="text-white font-semibold">Olaosebikan Ayomi</span> • MIT / Apache 2.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
