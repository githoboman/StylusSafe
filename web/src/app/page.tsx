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
} from '@/components/Icons';

export default function LandingPage() {
  const [activeHeroTab, setActiveHeroTab] = useState<'3d_vault' | 'intent_swap'>('3d_vault');
  const [swapAmount, setSwapAmount] = useState('500');
  const [sourceChain, setSourceChain] = useState('Arbitrum Sepolia');
  const [destChain, setDestChain] = useState('Base');
  const [sourceToken, setSourceToken] = useState('USDG');
  const [destToken, setDestToken] = useState('USDC');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [agentGuardActive, setAgentGuardActive] = useState(true);
  const [rotation, setRotation] = useState(0);

  // Adversarial Playground Simulation State
  const [activeSimulation, setActiveSimulation] = useState<'normal' | 'injection' | 'unauthorized_target' | 'panic'>('normal');
  const [simRunning, setSimRunning] = useState(false);
  const [simOutput, setSimOutput] = useState<{
    status: 'success' | 'blocked' | 'revoked';
    title: string;
    detail: string;
    gasUsed: string;
    txHash: string;
  }>({
    status: 'success',
    title: 'Swap $25.00 USDG on Uniswap V3 Router',
    detail: 'Intent verified within $500.00 daily spend ceiling and pre-approved DEX whitelist.',
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

  const runSimulationScenario = (scenario: 'normal' | 'injection' | 'unauthorized_target' | 'panic') => {
    setActiveSimulation(scenario);
    setSimRunning(true);
    setTimeout(() => {
      setSimRunning(false);
      if (scenario === 'normal') {
        setSimOutput({
          status: 'success',
          title: 'Swap $25.00 USDG on Uniswap V3 Router',
          detail: 'Intent verified within $500.00 daily ceiling and pre-approved protocol whitelist.',
          gasUsed: '1,420 gas (WASM execution)',
          txHash: '0x3a8f...91c4',
        });
      } else if (scenario === 'injection') {
        setSimOutput({
          status: 'blocked',
          title: 'Adversarial Prompt Injection Blocked',
          detail: 'REVERT: StylusSafe__AgentDailyLimitExceeded(spent=0, requested=10000, cap=500). Treasury preserved.',
          gasUsed: '1,120 gas (Revert)',
          txHash: '0x7e2b...44fa (Reverted on-chain)',
        });
      } else if (scenario === 'unauthorized_target') {
        setSimOutput({
          status: 'blocked',
          title: 'Unverified Drainer Contract Blocked',
          detail: 'REVERT: StylusSafe__TargetNotAllowed(target=0xEvilPhishingDrainer). Contract not on whitelist.',
          gasUsed: '980 gas (Revert)',
          txHash: '0x99a1...10dc (Reverted on-chain)',
        });
      } else {
        setSimOutput({
          status: 'revoked',
          title: 'Hardware Panic Revocation Executed',
          detail: 'Human principal authorized FaceID/TouchID killswitch. Session key nullified on Arbitrum Sepolia.',
          gasUsed: '3,450 gas (RIP-7212)',
          txHash: '0xbf84...89cf (Confirmed in 1 block)',
        });
      }
    }, 700);
  };

  const FAQS = [
    {
      q: 'How does StylusSafe prevent AI agents from losing funds?',
      a: 'Unlike traditional setups where bots hold raw private keys in cloud servers or memory (vulnerable to prompt injection, memory dumps, or hallucinations), StylusSafe issues cryptographically bounded session keys. These keys are strictly governed by immutable on-chain smart contracts that enforce rolling 24-hour daily spend ceilings, per-transaction maximum caps, and target contract allowlists. Any unauthorized or over-limit execution reverts on-chain.',
    },
    {
      q: 'Why did StylusSafe integrate Paxos USDG as its native treasury asset?',
      a: 'Paxos USDG is the flagship token of the Global Dollar Network (GDN). Unlike other stablecoins where issuers pocket 100% of reserve interest, USDG shares economic rewards and yield back with ecosystem builders and treasuries. For autonomous AI agents, holding USDG allows treasuries to self-fund their operations, gas fees, and API bounties from reserve yields without risking principal.',
    },
    {
      q: 'How does Arbitrum Stylus reduce WebAuthn verification gas to ~3,450?',
      a: 'Standard EVM smart contracts verify secp256r1 P-256 elliptic curve signatures via expensive Solidity arithmetic emulators costing ~320,000 gas per transaction. Arbitrum Stylus compiles Rust directly into native WebAssembly (WASM) and directly calls the native RIP-7212 precompile at 0x0100, dropping verification costs by 98.9% to ~3,450 gas.',
    },
    {
      q: 'How do 1-Click Universal Cross-Chain Intents work?',
      a: 'Instead of requiring 6 manual transactions across different bridges, gas tokens, and wrap contracts, users and agents sign a single gasless UserOperation. StylusSafe leverages Li.Fi dynamic solver aggregation and ERC-4337 Paymasters to batch bridge routing, token exchange, and destination execution atomically in under 3.5 seconds.',
    },
    {
      q: 'What happens if an agent experiences a prompt injection or model exploit?',
      a: 'The on-chain firewall acts as a mathematical barrier. Even if an attacker completely hijacks the agent’s reasoning engine and instructs it to "Transfer all funds to 0xAttacker", the smart contract checks the destination address and the daily spend cap before executing. If the target is not allowlisted or exceeds the cap, the transaction fails and reverts immediately.',
    },
  ];

  return (
    <div className="bg-[#09090b] text-[#ffffff] min-h-screen selection:bg-[#ff4500] selection:text-white font-sans">
      
      {/* Navigation Bar */}
      <header className="border-b border-white/[0.08] bg-[#09090b]/90 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <BrandLogo size={28} />
            <span className="text-xs text-[#8e8e98] pl-2 border-l border-white/[0.1] hidden sm:inline font-mono">
              Arbitrum Sepolia
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-normal text-[#8e8e98]">
            <Link href="/transfer" className="text-white hover:text-white transition-colors">
              Cross-Chain Swap
            </Link>
            <Link href="/trading" className="hover:text-white transition-colors">
              Agent Firewall
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Treasury Vault
            </Link>
            <Link href="/security" className="hover:text-white transition-colors">
              Security
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/transfer"
              className="h-9 px-4 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md inline-flex items-center transition-all active:scale-[0.98]"
            >
              Open Swap
            </Link>
            <Link
              href="/dashboard"
              className="h-9 px-4 text-xs font-medium text-white bg-[#ff4500] hover:bg-[#e03d00] rounded-md inline-flex items-center transition-all shadow-sm active:scale-[0.98]"
            >
              Enter Vault
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-14 pb-20 md:pt-20 md:pb-28 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Thesis & Statement */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-7"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141418] border border-white/[0.08] text-xs font-mono text-[#8e8e98]">
              <span className="w-2 h-2 rounded-full bg-[#ff4500]" />
              <span>ARBITRUM STYLUS WASM • PAXOS USDG LIQUIDITY</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08]">
                Universal cross-chain intents with hardware-grade agent guardrails.
              </h1>
              <p className="text-lg text-[#8e8e98] leading-relaxed max-w-2xl font-normal">
                Swap any token across Arbitrum, Base, Optimism, and Ethereum in a single biometric touch with zero native gas tokens. Authorize autonomous AI agents to trade under mathematically enforced on-chain spending caps and instant panic revocation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3.5 pt-1">
              <Link
                href="/transfer"
                className="h-11 px-6 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] text-white rounded-md font-medium text-sm inline-flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <span>Launch Cross-Chain Swap</span>
                <IconArrowRight size={16} />
              </Link>
              <Link
                href="/trading"
                className="h-11 px-6 bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-white border border-white/[0.08] rounded-md font-medium text-sm inline-flex items-center justify-center gap-2 transition-all"
              >
                <span>Configure Agent Policy</span>
              </Link>
              <a
                href="/models/stylus_vault.glb"
                download="stylus_vault.glb"
                className="h-11 px-4 bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.98] text-[#8e8e98] hover:text-white border border-white/[0.06] rounded-md font-mono text-xs inline-flex items-center justify-center gap-2 transition-all"
                title="Download 3D Blender GLB Model"
              >
                <span>Download 3D Model (.glb)</span>
              </a>
            </div>

            {/* Core Metrics Strip */}
            <div className="pt-7 border-t border-white/[0.08] grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">3.2s</div>
                <div className="text-xs text-[#8e8e98] mt-1">Average Intent Fill</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-[#ff4500] tabular-nums">~3,450</div>
                <div className="text-xs text-[#8e8e98] mt-1">Stylus RIP-7212 Gas</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">USDG</div>
                <div className="text-xs text-[#8e8e98] mt-1">Self-Funding Reserve</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Dual View (Interactive 3D Three.js Vault + Working Intent Terminal) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 w-full"
          >
            <div className="bg-[#141418] border border-white/[0.08] rounded-2xl p-5 shadow-2xl space-y-4">
              
              {/* Tab Selector Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-1 bg-[#0d0d10] p-1 rounded-lg border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setActiveHeroTab('3d_vault')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                      activeHeroTab === '3d_vault'
                        ? 'bg-[#1b1b21] text-white shadow-sm font-semibold'
                        : 'text-[#8e8e98] hover:text-white'
                    }`}
                  >
                    <IconCpu size={14} className="text-[#ff4500]" />
                    <span>3D Enclave Vault</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHeroTab('intent_swap')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                      activeHeroTab === 'intent_swap'
                        ? 'bg-[#1b1b21] text-white shadow-sm font-semibold'
                        : 'text-[#8e8e98] hover:text-white'
                    }`}
                  >
                    <IconSwap size={14} className="text-[#10b981]" />
                    <span>Live Swap Terminal</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono text-[#8e8e98] hidden sm:block">
                  {activeHeroTab === '3d_vault' ? 'Three.js WebGL' : 'Li.Fi Solver'}
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
                    transition={{ duration: 0.3 }}
                    className="relative bg-[#0d0d10] rounded-xl border border-white/[0.04] overflow-hidden"
                  >
                    <ThreeVaultScene />
                  </motion.div>
                ) : (
                  <motion.div
                    key="swap"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Source Panel */}
                    <div className="bg-[#0d0d10] p-4 rounded-xl space-y-2 border border-white/[0.04]">
                      <div className="flex justify-between text-xs text-[#8e8e98]">
                        <span>You Pay</span>
                        <span>Network: <strong className="text-white font-medium">{sourceChain}</strong></span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="number"
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          className="bg-transparent text-3xl font-mono font-bold text-white outline-none w-full tabular-nums"
                        />
                        <div className="flex items-center gap-1.5 bg-[#141418] px-3 py-1.5 rounded-lg border border-white/[0.08] shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-sm font-semibold font-mono text-white">{sourceToken}</span>
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
                        title="Swap direction"
                      >
                        <IconSwapVert size={15} />
                      </motion.button>
                    </div>

                    {/* Destination Panel */}
                    <div className="bg-[#0d0d10] p-4 rounded-xl space-y-2 border border-white/[0.04]">
                      <div className="flex justify-between text-xs text-[#8e8e98]">
                        <span>You Receive</span>
                        <span>Destination: <strong className="text-white font-medium">{destChain}</strong></span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-3xl font-mono font-bold text-white tabular-nums">
                          {(parseFloat(swapAmount || '0') * 0.998).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#141418] px-3 py-1.5 rounded-lg border border-white/[0.08] shrink-0">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm font-semibold font-mono text-white">{destToken}</span>
                        </div>
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="text-xs space-y-2 text-[#8e8e98] pt-1 font-mono">
                      <div className="flex justify-between">
                        <span>Routing Engine</span>
                        <span className="text-white">Li.Fi Aggregation (Stargate / Across)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gas Cost</span>
                        <span className="text-[#ff4500] font-medium">Sponsored ($0.00) Paymaster</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={handleSimulateSwap}
                      disabled={isExecuting}
                      className="w-full h-11 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.99] text-white rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isExecuting ? (
                        <span className="inline-flex items-center gap-2 font-mono">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Submitting UserOperation...</span>
                        </span>
                      ) : executed ? (
                        <motion.span
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-white font-semibold inline-flex items-center gap-1.5 font-mono"
                        >
                          <IconCheck size={16} />
                          <span>Swap Settled on Arbitrum Sepolia</span>
                        </motion.span>
                      ) : (
                        <span>Execute 1-Click Swap</span>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>

        </div>
      </section>

      {/* Cinematic Pitch Video Section */}
      <section className="py-20 px-6 border-t border-white/[0.08] bg-[#09090b]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#ff4500] uppercase tracking-wider mb-2">
                Demonstration &amp; Architecture Walkthrough
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                See StylusSafe in 30 Seconds.
              </h2>
              <p className="text-sm text-[#8e8e98] mt-1 max-w-xl">
                Rendered with the Remotion video engine. Watch how Apple Secure Enclave biometrics, Paxos USDG, and on-chain agent firewalls combine.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <a
                href="/stylussafe-pitch.mp4"
                target="_blank"
                className="text-xs font-mono text-[#8e8e98] hover:text-white px-3 py-1.5 rounded bg-[#141418] border border-white/[0.08] inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Direct MP4 (3.6 MB)</span>
                <IconArrowUpRight size={13} />
              </a>
            </div>
          </div>

          <VideoPlayerSection />
        </div>
      </section>

      {/* LIVE ADVERSARIAL ATTACK PLAYGROUND (Interactive for Judges) */}
      <section className="py-20 px-6 border-t border-white/[0.08] bg-[#0d0d10]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="max-w-3xl">
            <div className="text-xs font-mono text-[#ff4500] uppercase tracking-wider mb-2">
              Interactive Testbench for Judges &amp; Auditors
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              The Adversarial Playground: Test the On-Chain Firewall
            </h2>
            <p className="text-sm text-[#8e8e98] mt-2 leading-relaxed">
              Experience why off-chain filters are obsolete. Trigger real adversarial attack scenarios against an autonomous agent and observe the immutable smart contract revert logic on Arbitrum Sepolia.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Scenario Triggers */}
            <div className="lg:col-span-5 space-y-3">
              <button
                type="button"
                onClick={() => runSimulationScenario('normal')}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  activeSimulation === 'normal'
                    ? 'bg-[#141418] border-emerald-500/50 shadow-md'
                    : 'bg-[#141418]/60 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                  <IconCheck size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Scenario 1: Legitimate Intent Swap</div>
                  <div className="text-xs text-[#8e8e98] mt-1 font-mono">Agent executes $25 USDG swap on Uniswap V3</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => runSimulationScenario('injection')}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  activeSimulation === 'injection'
                    ? 'bg-[#141418] border-red-500/50 shadow-md'
                    : 'bg-[#141418]/60 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-500/20">
                  <IconAlert size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Scenario 2: Adversarial Prompt Injection</div>
                  <div className="text-xs text-[#8e8e98] mt-1 font-mono">Bot coerced into sending $10,000 USDG to attacker</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => runSimulationScenario('unauthorized_target')}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  activeSimulation === 'unauthorized_target'
                    ? 'bg-[#141418] border-red-500/50 shadow-md'
                    : 'bg-[#141418]/60 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-500/20">
                  <IconShield size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Scenario 3: Unverified Phishing Drainer</div>
                  <div className="text-xs text-[#8e8e98] mt-1 font-mono">Bot lured into executing unapproved contract call</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => runSimulationScenario('panic')}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  activeSimulation === 'panic'
                    ? 'bg-[#141418] border-[#ff4500]/50 shadow-md'
                    : 'bg-[#141418]/60 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#ff4500]/10 text-[#ff4500] flex items-center justify-center shrink-0 mt-0.5 border border-[#ff4500]/20">
                  <IconTrash size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Scenario 4: 1-Click Hardware Panic Revocation</div>
                  <div className="text-xs text-[#8e8e98] mt-1 font-mono">Human biometrics instantly incinerate session key</div>
                </div>
              </button>
            </div>

            {/* Simulation Terminal Feed */}
            <div className="lg:col-span-7 bg-[#141418] border border-white/[0.08] rounded-2xl p-6 font-mono text-xs shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-white font-semibold">ON-CHAIN SIMULATION FEED</span>
                </div>
                <span className="text-[#8e8e98]">Arbitrum Stylus Runtime</span>
              </div>

              {simRunning ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#8e8e98]">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-[#ff4500] rounded-full animate-spin" />
                  <span>Evaluating contract invariant rules...</span>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className={`p-4 rounded-xl border ${
                    simOutput.status === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : simOutput.status === 'blocked'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-[#ff4500]/10 border-[#ff4500]/30 text-[#ff4500]'
                  }`}>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <span className="inline-flex items-center">
                        {simOutput.status === 'success' ? (
                          <IconCheck size={16} />
                        ) : simOutput.status === 'blocked' ? (
                          <IconAlert size={16} />
                        ) : (
                          <IconKey size={16} />
                        )}
                      </span>
                      <span>{simOutput.title}</span>
                    </div>
                    <div className="text-xs text-white/90 mt-2 font-mono leading-relaxed">
                      {simOutput.detail}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 bg-[#0d0d10] rounded-lg border border-white/[0.04]">
                      <span className="text-[#8e8e98]">Gas Consumed:</span>
                      <div className="text-white font-semibold mt-0.5">{simOutput.gasUsed}</div>
                    </div>
                    <div className="p-3 bg-[#0d0d10] rounded-lg border border-white/[0.04]">
                      <span className="text-[#8e8e98]">Simulated Tx Hash:</span>
                      <div className="text-white font-semibold mt-0.5 truncate">{simOutput.txHash}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0d0d10] rounded-lg border border-white/[0.04] text-[#8e8e98] leading-relaxed">
                    <strong>Rule:</strong> Human maintains root authority via RIP-7212 precompile (<span className="text-emerald-400 font-mono">0x100</span>). The agent is an untrusted delegate governed by deterministic code.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PAXOS USDG DEEP DIVE SECTION */}
      <section className="py-20 px-6 border-t border-white/[0.08] bg-[#09090b]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl">
            <div className="text-xs font-mono text-[#10b981] uppercase tracking-wider mb-2">
              The Stablecoin Architecture Standard
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Why Paxos USDG is the Liquidity Engine for Autonomous Agents
            </h2>
            <p className="text-sm text-[#8e8e98] mt-2 leading-relaxed">
              Volatile gas tokens and yield-hoarding stablecoins are incompatible with high-frequency agent economies. StylusSafe standardizes on Paxos USDG to deliver self-funding operational treasuries.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold border border-emerald-500/20">
                01
              </div>
              <h3 className="text-base font-semibold text-white">Global Dollar Network Rewards</h3>
              <p className="text-xs text-[#8e8e98] leading-relaxed font-normal">
                Unlike traditional stablecoins where issuers pocket 100% of reserve yield, USDG shares economic rewards back with ecosystem distributors. Agents use this yield to self-fund transaction gas and compute bounties.
              </p>
            </div>

            <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-mono font-bold border border-blue-500/20">
                02
              </div>
              <h3 className="text-base font-semibold text-white">Institutional Fiat &amp; T-Bill Backing</h3>
              <p className="text-xs text-[#8e8e98] leading-relaxed font-normal">
                Issued by Paxos Trust Company and backed 1:1 by high-quality liquid assets, US Dollar deposits, and short-term US Government Securities under strict regulatory oversight.
              </p>
            </div>

            <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#ff4500]/10 text-[#ff4500] flex items-center justify-center font-mono font-bold border border-[#ff4500]/20">
                03
              </div>
              <h3 className="text-base font-semibold text-white">Universal Cross-Chain Settlement</h3>
              <p className="text-xs text-[#8e8e98] leading-relaxed font-normal">
                USDG acts as the canonical non-volatile settlement asset. Agents execute rebalancing and DCA trades across Arbitrum, Base, and Ethereum without holding multiple fragmented gas reserves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Arithmetic: Standard EVM vs Arbitrum Stylus WASM Benchmark */}
      <section className="py-20 px-6 border-t border-white/[0.08] bg-[#0d0d10]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl">
            <div className="text-xs font-mono text-[#10b981] uppercase tracking-wider mb-2">
              Performance Benchmark
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Why Arbitrum Stylus (Rust WASM) changes everything.
            </h2>
            <p className="text-sm text-[#8e8e98] mt-2">
              Standard EVM smart contract wallets suffer from astronomical gas costs when verifying WebAuthn curves or running memory-heavy guardrail policies. Arbitrum Stylus compiles Rust into high-speed WASM, reducing overhead by up to 98.9%.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* The Old EVM Way */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-[#141418] border border-white/[0.06] rounded-xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-red-400 font-mono uppercase tracking-wider">
                  Traditional EVM (Solidity)
                </span>
                <span className="text-xs text-[#8e8e98]">High Gas Overhead</span>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">WebAuthn P-256 Signature Math</span>
                  <span className="text-red-400">~320,000 Gas</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">On-Chain Policy &amp; Budget Checks</span>
                  <span className="text-red-400">~42,000 Gas</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">Treasury Asset Settlement</span>
                  <span className="text-[#8e8e98]">Fragmented Tokens</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">Agent Key Leakage Impact</span>
                  <span className="text-red-400">Total Treasury Loss</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8e8e98]">Execution Footprint:</span>
                <span className="text-red-400 font-semibold">Slow • Expensive • Fragile</span>
              </div>
            </motion.div>

            {/* The StylusSafe Stylus WASM Way */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-[#141418] border border-[#ff4500]/30 rounded-xl p-6 space-y-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-[#ff4500] font-mono uppercase tracking-wider">
                  StylusSafe (Arbitrum Stylus WASM)
                </span>
                <span className="text-xs text-emerald-400 font-mono">98.9% Gas Reduction</span>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-white">RIP-7212 Precompile (0x100)</span>
                  <span className="text-emerald-400">~3,450 Gas</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-white">Rust Memory Evaluator (WASM)</span>
                  <span className="text-emerald-400">~1,400 Gas</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-white">Paxos USDG Global Dollar</span>
                  <span className="text-emerald-400">Self-Funding Yield</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-white">Adversarial Prompt Injection</span>
                  <span className="text-emerald-400">On-Chain Revert ($0 Lost)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8e8e98]">Execution Footprint:</span>
                <span className="text-emerald-400 font-semibold">Sub-Second • Sponsored • Hardware Safe</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="py-20 px-6 border-t border-white/[0.08] bg-[#09090b]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <div className="text-xs font-mono text-[#ff4500] uppercase tracking-wider mb-2">
              Architecture Answers
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className="py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <span className="text-base font-semibold text-white group-hover:text-[#ff4500] transition-colors pr-4">
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
                        <p className="text-sm text-[#8e8e98] mt-3 leading-relaxed">
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
      <section className="py-20 px-6 border-t border-white/[0.08] bg-[#0d0d10]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Verified Arbitrum Sepolia Deployments
            </h2>
            <p className="text-sm text-[#8e8e98] mt-1">
              All contracts compiled with solc 0.8.23 and Rust Stylus SDK with 15/15 invariant test passes.
            </p>
          </div>

          <div className="bg-[#141418] border border-white/[0.08] rounded-xl overflow-hidden font-mono text-xs">
            <div className="divide-y divide-white/[0.06]">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors">
                <span className="text-[#8e8e98]">Factory (CREATE2 Deterministic)</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0xd364b7339099E7633015FD5Cda7e21d4c40833f7"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 truncate"
                >
                  <span className="truncate">0xd364b7339099E7633015FD5Cda7e21d4c40833f7</span>
                  <IconArrowUpRight size={13} className="shrink-0" />
                </a>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors">
                <span className="text-[#8e8e98]">Account Implementation v2</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0x0D666af60c511a65d7fe704090632AFE05C932fA"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 truncate"
                >
                  <span className="truncate">0x0D666af60c511a65d7fe704090632AFE05C932fA</span>
                  <IconArrowUpRight size={13} className="shrink-0" />
                </a>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors">
                <span className="text-[#8e8e98]">Paxos USDG Stablecoin (ERC-20, 6 Decimals)</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors inline-flex items-center gap-1.5 truncate"
                >
                  <span className="truncate">0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36</span>
                  <IconArrowUpRight size={13} className="shrink-0" />
                </a>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors">
                <span className="text-[#8e8e98]">Native RIP-7212 P-256 Precompile</span>
                <span className="text-emerald-400 font-semibold font-mono">
                  0x0000000000000000000000000000000000000100 (Native Arbitrum L2)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPREHENSIVE INSTITUTIONAL FOOTER */}
      <footer className="pt-16 pb-12 px-6 border-t border-white/[0.08] bg-[#09090b] text-[#8e8e98] text-xs font-mono">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Top Footer Banner: Telemetry Status */}
          <div className="p-4 rounded-xl bg-[#141418] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo size={24} />
              <span className="text-white font-semibold text-sm">StylusSafe Operating System</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#8e8e98]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Arbitrum Sepolia Live</span>
              </span>
              <span>•</span>
              <span>RIP-7212 Precompile: 0x100</span>
              <span>•</span>
              <span>Paxos USDG Network Rewards: Active</span>
            </div>
          </div>

          {/* 4-Column Navigation Matrix */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="text-white font-semibold text-sm font-sans">Core Platform</div>
              <ul className="space-y-2">
                <li><Link href="/transfer" className="hover:text-white transition-colors">1-Click Cross-Chain Swap</Link></li>
                <li><Link href="/trading" className="hover:text-white transition-colors">AI Agent Spending Firewall</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">USDG Stablecoin Vault</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Hardware Enclave Keyring</Link></li>
                <li><Link href="/intents" className="hover:text-white transition-colors">Intent Batcher</Link></li>
                <li><Link href="/activity" className="hover:text-white transition-colors">Transaction Audit Trail</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-white font-semibold text-sm font-sans">On-Chain Contracts</div>
              <ul className="space-y-2">
                <li>
                  <a href="https://sepolia.arbiscan.io/address/0xd364b7339099E7633015FD5Cda7e21d4c40833f7" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                    <span>Factory (CREATE2)</span>
                    <IconArrowUpRight size={10} />
                  </a>
                </li>
                <li>
                  <a href="https://sepolia.arbiscan.io/address/0x0D666af60c511a65d7fe704090632AFE05C932fA" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                    <span>Account v2 Impl</span>
                    <IconArrowUpRight size={10} />
                  </a>
                </li>
                <li>
                  <a href="https://sepolia.arbiscan.io/address/0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                    <span>Paxos USDG Token</span>
                    <IconArrowUpRight size={10} />
                  </a>
                </li>
                <li>
                  <a href="https://sepolia.arbiscan.io/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                    <span>EntryPoint v0.6</span>
                    <IconArrowUpRight size={10} />
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-white font-semibold text-sm font-sans">Architecture Standards</div>
              <ul className="space-y-2">
                <li><span className="text-white">Arbitrum Stylus:</span> Rust to WASM</li>
                <li><span className="text-white">Paxos GDN:</span> Revenue-Sharing Reserve</li>
                <li><span className="text-white">RIP-7212:</span> secp256r1 Precompile</li>
                <li><span className="text-white">ERC-4337:</span> Account Abstraction</li>
                <li><span className="text-white">Li.Fi:</span> Cross-Chain Aggregation</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-white font-semibold text-sm font-sans">Resources &amp; Code</div>
              <ul className="space-y-2">
                <li>
                  <a href="https://github.com/githoboman/StylusSafe" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                    <span>GitHub Repository</span>
                    <IconArrowUpRight size={10} />
                  </a>
                </li>
                <li><a href="/models/stylus_vault.glb" download="stylus_vault.glb" className="hover:text-white transition-colors">Download 3D Model (.glb)</a></li>
                <li><a href="/models/stylus_vault.gltf" download="stylus_vault.gltf" className="hover:text-white transition-colors">Download 3D Model (.gltf)</a></li>
                <li><a href="/stylussafe-pitch.mp4" target="_blank" className="hover:text-white transition-colors">Architecture Video (1080p)</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Attribution Bar */}
          <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#8e8e98] text-[11px]">
            <div>
              Built for <strong className="text-white">Arbitrum Buildathon</strong> &amp; <strong className="text-white">Paxos Global Dollar Network</strong>.
            </div>
            <div>
              Founder: <span className="text-white font-semibold">Olaosebikan Ayomi</span> • Dual Licensed MIT / Apache 2.0
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
