'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { BrandLogo } from '@/components/BrandLogo';
import {
  IconSwap,
  IconArrowRight,
  IconArrowUpRight,
  IconSwapVert,
  IconCheck,
} from '@/components/Icons';

export default function LandingPage() {
  const [swapAmount, setSwapAmount] = useState('500');
  const [sourceChain, setSourceChain] = useState('Arbitrum Sepolia');
  const [destChain, setDestChain] = useState('Base');
  const [sourceToken, setSourceToken] = useState('USDG');
  const [destToken, setDestToken] = useState('USDC');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [agentGuardActive, setAgentGuardActive] = useState(true);
  const [rotation, setRotation] = useState(0);

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
    setRotation(prev => prev + 180);
    const sC = sourceChain;
    const dC = destChain;
    const sT = sourceToken;
    const dT = destToken;
    setSourceChain(dC);
    setDestChain(sC);
    setSourceToken(dT);
    setDestToken(sT);
  };

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
      <section className="pt-16 pb-20 md:pt-24 md:pb-28 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Thesis & Statement */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-7"
          >
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08]">
                Universal cross-chain intents with hardware-grade agent guardrails.
              </h1>
              <p className="text-lg text-[#8e8e98] leading-relaxed max-w-2xl font-normal">
                Swap any token across Arbitrum, Base, Optimism, and Ethereum in a single biometric touch with zero native gas tokens. Authorize autonomous AI agents to execute trades under strict on-chain spending caps, per-transaction limits, and instant panic revocation.
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
            </div>

            {/* Core Metrics Strip */}
            <div className="pt-7 border-t border-white/[0.08] grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">3.2s</div>
                <div className="text-xs text-[#8e8e98] mt-1">Average Intent Fill</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-[#ff4500] tabular-nums">$0.00</div>
                <div className="text-xs text-[#8e8e98] mt-1">Sponsored Gas Fees</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">15 / 15</div>
                <div className="text-xs text-[#8e8e98] mt-1">On-Chain Invariants Verified</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Precision Working Swap Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 w-full"
          >
            <div className="bg-[#141418] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
                  <IconSwap size={15} className="text-[#ff4500]" />
                  Universal Intent Terminal
                </span>
                <button
                  type="button"
                  onClick={() => setAgentGuardActive(!agentGuardActive)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    agentGuardActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-white/[0.04] text-[#8e8e98] border-white/[0.08]'
                  }`}
                >
                  {agentGuardActive ? 'Guardrails Active' : 'Unrestricted'}
                </button>
              </div>

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

              {/* Direction Switcher with Precision Center Alignment */}
              <div className="flex justify-center -my-2.5 relative z-10">
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

              {/* Route & Fee Breakdown */}
              <div className="text-xs space-y-2 text-[#8e8e98] pt-1">
                <div className="flex justify-between">
                  <span>Routing Engine</span>
                  <span className="text-white">Li.Fi Aggregation (Stargate / Across)</span>
                </div>
                <div className="flex justify-between">
                  <span>Gas Cost</span>
                  <span className="text-[#ff4500] font-medium">Sponsored ($0.00) via Paymaster</span>
                </div>
                {agentGuardActive && (
                  <div className="flex justify-between">
                    <span>Agent 24h Ceiling</span>
                    <span className="text-emerald-400 font-medium">$500.00 USDG Max</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSimulateSwap}
                disabled={isExecuting}
                className="w-full h-11 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.99] text-white rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isExecuting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting UserOperation...</span>
                  </span>
                ) : executed ? (
                  <motion.span
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-white font-semibold inline-flex items-center gap-1.5"
                  >
                    <IconCheck size={16} />
                    <span>Swap Settled on Arbitrum Sepolia</span>
                  </motion.span>
                ) : (
                  <span>Execute 1-Click Swap</span>
                )}
              </button>

            </div>
          </motion.div>

        </div>
      </section>

      {/* The Arithmetic: 6-Step Bridging vs 1-Click StylusSafe */}
      <section className="py-20 px-6 border-t border-white/[0.08] bg-[#0d0d10]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              The multichain bridging tax, eliminated.
            </h2>
            <p className="text-sm text-[#8e8e98] mt-2">
              Cross-chain liquidity operations previously demanded multiple transactions, bridge tokens, and destination gas management. StylusSafe collapses this entire chain into a single gasless intent.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* The Old Way */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-[#141418] border border-white/[0.06] rounded-xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-red-400 font-mono uppercase tracking-wider">
                  Traditional Multichain Flow
                </span>
                <span className="text-xs text-[#8e8e98]">6 Transactions Required</span>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">1. Approve Token to Bridge</span>
                  <span className="text-red-400">Gas: $1.20</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">2. Deposit into Bridge Lock Contract</span>
                  <span className="text-red-400">Gas: $3.50</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">3. Acquire Destination Gas (ETH/Base)</span>
                  <span className="text-red-400">Gas: $2.10</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">4. Wait for Relayer Attestation</span>
                  <span className="text-[#8e8e98]">Time: ~12-20 mins</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">5. Claim Wrapped Tokens on Dest Chain</span>
                  <span className="text-red-400">Gas: $1.80</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">6. Swap Wrapped Token → Target Asset</span>
                  <span className="text-red-400">Gas: $2.40</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8e8e98]">Total Friction:</span>
                <span className="text-red-400 font-semibold">$11.00+ Gas • 6 Popups • 15 Mins</span>
              </div>
            </motion.div>

            {/* The StylusSafe Intent Way */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-[#141418] border border-[#ff4500]/30 rounded-xl p-6 space-y-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-[#ff4500] font-mono uppercase tracking-wider">
                  StylusSafe Universal Intent
                </span>
                <span className="text-xs text-emerald-400 font-mono">1 Biometric Signature</span>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-white">1. Sign Hardware Passkey (FaceID)</span>
                  <span className="text-emerald-400">Sponsored ($0.00)</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">Bundler Submits Single UserOperation</span>
                  <span className="text-white">ERC-4337</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">Stylus Account Validates RIP-7212 P-256</span>
                  <span className="text-white">Precompile 0x100</span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[#8e8e98]">Li.Fi Route Solvers Settle Target Asset</span>
                  <span className="text-emerald-400">Atomic Fill</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8e8e98]">Total Friction:</span>
                <span className="text-emerald-400 font-semibold">$0.00 Gas • 1 Touch • 3.2s</span>
              </div>
            </motion.div>

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
              All contracts compiled with solc 0.8.23 and verified with 15/15 invariant test passes.
            </p>
          </div>

          <div className="bg-[#141418] border border-white/[0.08] rounded-xl overflow-hidden font-mono text-xs">
            <div className="divide-y divide-white/[0.06]">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors">
                <span className="text-[#8e8e98]">Factory (CREATE2)</span>
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
                <span className="text-[#8e8e98]">USDG Stablecoin (ERC-20, 6 Decimals)</span>
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
                  0x0000000000000000000000000000000000000100 (Native L2)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/[0.08] text-[#8e8e98] text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>StylusSafe — Universal Intent Engine &amp; Autonomous Agent Firewall</div>
          <div>Y Combinator Crypto Request for Startups (Oct 2026)</div>
        </div>
      </footer>

    </div>
  );
}
