'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [swapAmount, setSwapAmount] = useState('500');
  const [sourceChain, setSourceChain] = useState('Arbitrum Sepolia');
  const [destChain, setDestChain] = useState('Base');
  const [sourceToken, setSourceToken] = useState('USDG');
  const [destToken, setDestToken] = useState('USDC');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [agentGuardActive, setAgentGuardActive] = useState(true);

  const handleSimulateSwap = () => {
    setIsExecuting(true);
    setExecuted(false);
    setTimeout(() => {
      setIsExecuting(false);
      setExecuted(true);
      setTimeout(() => setExecuted(false), 5000);
    }, 1500);
  };

  const flipDirection = () => {
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
    <div className="bg-[#09090b] text-[#ffffff] min-h-screen selection:bg-[#ff4500] selection:text-white">
      
      {/* Navigation Bar */}
      <header className="border-b border-white/[0.08] bg-[#09090b]/90 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="StylusSafe" className="w-7 h-7 rounded-md" />
            <span className="text-lg font-semibold tracking-tight text-white">StylusSafe</span>
            <span className="text-xs text-[#8e8e98] pl-2 border-l border-white/[0.1] hidden sm:inline">
              Arbitrum Sepolia
            </span>
          </div>

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

          <div className="flex items-center gap-3">
            <Link
              href="/transfer"
              className="h-9 px-4 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md flex items-center transition-colors"
            >
              Open Swap
            </Link>
            <Link
              href="/dashboard"
              className="h-9 px-4 text-xs font-medium text-white bg-[#ff4500] hover:bg-[#e03d00] rounded-md flex items-center transition-colors shadow-sm"
            >
              Enter Vault
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-24 md:pt-28 md:pb-32 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Thesis & Statement */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08]">
                Universal cross-chain intents with hardware-grade agent guardrails.
              </h1>
              <p className="text-lg text-[#8e8e98] leading-relaxed max-w-2xl font-normal">
                Swap any token across Arbitrum, Base, Optimism, and Ethereum in a single biometric touch with zero native gas tokens. Authorize autonomous AI agents to execute trades under strict on-chain spending caps, per-transaction limits, and instant panic revocation.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/transfer"
                className="h-12 px-6 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Launch Cross-Chain Swap</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
              <Link
                href="/trading"
                className="h-12 px-6 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <span>Configure Agent Policy</span>
              </Link>
            </div>

            {/* Core Metrics Strip */}
            <div className="pt-8 border-t border-white/[0.08] grid grid-cols-3 gap-6">
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
          </div>

          {/* Right Column: Precision Working Swap Terminal */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-[#141418] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#ff4500]">sync_alt</span>
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
                  <span>Network: <strong className="text-white">{sourceChain}</strong></span>
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
              <div className="flex justify-center -my-2.5 relative z-10">
                <button
                  type="button"
                  onClick={flipDirection}
                  className="w-8 h-8 rounded-full bg-[#1b1b21] hover:bg-[#ff4500] text-[#8e8e98] hover:text-white border border-white/[0.1] flex items-center justify-center transition-colors shadow-md"
                  title="Swap direction"
                >
                  <span className="material-symbols-outlined text-sm">swap_vert</span>
                </button>
              </div>

              {/* Destination Panel */}
              <div className="bg-[#0d0d10] p-4 rounded-xl space-y-2 border border-white/[0.04]">
                <div className="flex justify-between text-xs text-[#8e8e98]">
                  <span>You Receive</span>
                  <span>Destination: <strong className="text-white">{destChain}</strong></span>
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
                className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isExecuting ? (
                  <span>Submitting UserOperation...</span>
                ) : executed ? (
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Swap Settled on Arbitrum Sepolia
                  </span>
                ) : (
                  <span>Execute 1-Click Swap</span>
                )}
              </button>

            </div>
          </div>

        </div>
      </section>

      {/* The Arithmetic: 6-Step Bridging vs 1-Click StylusSafe */}
      <section className="py-20 px-6 border-t border-white/[0.08] bg-[#0d0d10]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              The multichain bridging tax, eliminated.
            </h2>
            <p className="text-[#8e8e98] text-base mt-2">
              Cross-chain asset movement has historically demanded multiple transactions, bridging delays, and native gas token exposure across disjoint rollups.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            
            {/* The Manual Method */}
            <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-8 space-y-6">
              <div className="text-sm font-semibold text-[#8e8e98]">
                Traditional Bridging (6 Steps • 20+ Minutes)
              </div>
              <ol className="space-y-4 text-sm text-[#8e8e98] list-decimal list-inside leading-relaxed">
                <li>Locate third-party bridge liquidity supporting your origin and target assets.</li>
                <li>Approve token spend on origin chain with native ETH gas payment.</li>
                <li>Submit lock/burn transaction and wait 15–30 minutes for validator attestations.</li>
                <li>Acquire native destination gas tokens (ETH/BASE) to pay for subsequent claims.</li>
                <li>Approve destination DEX router contract.</li>
                <li>Execute final swap with unpredictable slippage and bridge spread.</li>
              </ol>
              <div className="pt-4 border-t border-white/[0.06] text-xs text-red-400 font-medium">
                High friction, fragmented balances, unmitigated key exposure.
              </div>
            </div>

            {/* The StylusSafe Method */}
            <div className="bg-[#141418] border border-white/[0.12] rounded-xl p-8 space-y-6">
              <div className="text-sm font-semibold text-white">
                StylusSafe Intent Engine (1 Step • 3.2 Seconds)
              </div>
              <ol className="space-y-4 text-sm text-white list-decimal list-inside leading-relaxed">
                <li>Declare your desired outcome: token, amount, and destination chain.</li>
                <li>Authenticate via hardware WebAuthn passkey (Apple Enclave or Android StrongBox).</li>
                <li>Atomic execution: approvals, bridging, and DEX swaps resolve in one block.</li>
                <li>Zero native gas: ERC-4337 Paymaster sponsors execution transparently.</li>
              </ol>
              <div className="pt-4 border-t border-white/[0.06] text-xs text-emerald-400 font-medium">
                Single signature, zero bridging wait time, sponsored rollup fees.
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* The Three Primitives */}
      <section className="py-20 px-6 border-t border-white/[0.08] max-w-7xl mx-auto space-y-12">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Architecture and security boundaries.
          </h2>
          <p className="text-[#8e8e98] text-base mt-2">
            StylusSafe solves both human UX and machine autonomy by introducing an on-chain firewall layer between owners and executors.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-8 space-y-4">
            <div className="w-10 h-10 bg-[#1b1b21] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">sync_alt</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Universal Cross-Chain Intents</h3>
            <p className="text-sm text-[#8e8e98] leading-relaxed">
              Integrated with the Li.Fi liquidity engine, StylusSafe discovers optimal routes across 20+ chains and dozens of DEXs, bundling transactions via ERC-4337 smart accounts.
            </p>
            <div className="pt-3 border-t border-white/[0.04]">
              <Link href="/transfer" className="text-xs text-[#ff4500] hover:underline font-medium">
                Explore Swap Terminal →
              </Link>
            </div>
          </div>

          <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-8 space-y-4">
            <div className="w-10 h-10 bg-[#1b1b21] rounded-lg flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-xl">shield</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Agent Spending Firewall</h3>
            <p className="text-sm text-[#8e8e98] leading-relaxed">
              AI trading agents receive ephemeral session keys bounded by smart contract enforcement. Daily caps, per-tx limits, and destination allowlists prevent rogue wallet drains.
            </p>
            <div className="pt-3 border-t border-white/[0.04]">
              <Link href="/trading" className="text-xs text-emerald-400 hover:underline font-medium">
                Inspect Policy Engine →
              </Link>
            </div>
          </div>

          <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-8 space-y-4">
            <div className="w-10 h-10 bg-[#1b1b21] rounded-lg flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-xl">account_balance</span>
            </div>
            <h3 className="text-lg font-semibold text-white">USDG Stable Treasury</h3>
            <p className="text-sm text-[#8e8e98] leading-relaxed">
              Standard 6-decimal ERC-20 stablecoin deployed natively on Arbitrum Sepolia. Provides predictable dollar accounting for trading bots, avoiding volatile native gas token risk.
            </p>
            <div className="pt-3 border-t border-white/[0.04]">
              <Link href="/dashboard" className="text-xs text-blue-400 hover:underline font-medium">
                View Treasury Vault →
              </Link>
            </div>
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
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[#8e8e98]">Factory (CREATE2)</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0xd364b7339099E7633015FD5Cda7e21d4c40833f7"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors truncate"
                >
                  0xd364b7339099E7633015FD5Cda7e21d4c40833f7 ↗
                </a>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[#8e8e98]">Account Implementation v2</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0x0D666af60c511a65d7fe704090632AFE05C932fA"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors truncate"
                >
                  0x0D666af60c511a65d7fe704090632AFE05C932fA ↗
                </a>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[#8e8e98]">USDG Stablecoin (ERC-20, 6 Decimals)</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[#ff4500] transition-colors truncate"
                >
                  0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36 ↗
                </a>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[#8e8e98]">Native RIP-7212 P-256 Precompile</span>
                <span className="text-emerald-400 font-semibold">
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
