'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Reveal, RevealStagger, RevealItem } from '@/components/Reveal';

export default function LandingPage() {
  // Hero Interactive Terminal State
  const [activeTab, setActiveTab] = useState<'swap' | 'firewall'>('swap');
  
  // Cross Swap Demo State
  const [swapAmount, setSwapAmount] = useState('500');
  const [swapSourceChain, setSwapSourceChain] = useState('Arbitrum Sepolia');
  const [swapDestChain, setSwapDestChain] = useState('Base');
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapDone, setSwapDone] = useState(false);

  // Agent Firewall Demo State
  const [simLog, setSimLog] = useState<{ type: 'ok' | 'blocked' | 'info'; text: string; time: string }[]>([
    { type: 'info', text: 'On-chain policy active: $500/day limit, Uniswap V3 whitelist.', time: '00:01' }
  ]);
  const [agentSpent, setAgentSpent] = useState(0);

  const handleSimulateSwap = () => {
    setIsSwapping(true);
    setSwapDone(false);
    setTimeout(() => {
      setIsSwapping(false);
      setSwapDone(true);
      setTimeout(() => setSwapDone(false), 4000);
    }, 1800);
  };

  const handleAgentTestTrade = (amount: number) => {
    const time = new Date().toLocaleTimeString();
    if (agentSpent + amount > 500) {
      setSimLog(prev => [{
        type: 'blocked',
        text: `REVERT: StylusSafe__AgentDailyLimitExceeded(spent=${agentSpent}, requested=${amount}, cap=500)`,
        time,
      }, ...prev.slice(0, 4)]);
    } else {
      const next = agentSpent + amount;
      setAgentSpent(next);
      setSimLog(prev => [{
        type: 'ok',
        text: `PERMITTED: Agent executed $${amount} USDG swap. Daily spend: $${next}/$500`,
        time,
      }, ...prev.slice(0, 4)]);
    }
  };

  const handlePanicRevoke = () => {
    setAgentSpent(0);
    setSimLog(prev => [{
      type: 'blocked',
      text: 'PANIC REVOKE: revokeSessionKey() mined. All agent privileges terminated.',
      time: new Date().toLocaleTimeString(),
    }, ...prev.slice(0, 4)]);
  };

  return (
    <div className="bg-[#08080A] text-text-primary selection:bg-accent-orange selection:text-white min-h-screen">
      
      {/* ──────────────────────────────────────────────────────────────────────────
          TOP NAVBAR
      ────────────────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full border-b border-white/[0.08] bg-[#08080A]/85 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="StylusSafe" className="w-9 h-9 rounded-xl shadow-lg shadow-accent-orange/20" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">StylusSafe</span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-accent-orange/10 text-accent-orange border border-accent-orange/30">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse"></span>
                Universal Intents &amp; Agent Firewall
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-text-muted">
            <Link href="/transfer" className="hover:text-text-primary transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-accent-orange">sync_alt</span>
              1-Click Cross Swap
            </Link>
            <Link href="/trading" className="hover:text-text-primary transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-emerald-400">shield</span>
              Agent Firewall
            </Link>
            <Link href="/dashboard" className="hover:text-text-primary transition-colors">
              USDG Treasury
            </Link>
            <Link href="/security" className="hover:text-text-primary transition-colors">
              WebAuthn Enclave
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/transfer"
              className="h-10 px-5 bg-surface-container hover:bg-surface-container-high text-text-primary border border-white/[0.1] rounded-full font-mono text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-sm text-accent-orange">bolt</span>
              Try Swap
            </Link>
            <Link 
              href="/dashboard"
              className="h-10 px-6 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-full font-medium text-sm flex items-center transition-all shadow-[0_0_25px_rgba(255,69,0,0.35)] hover:shadow-[0_0_35px_rgba(255,69,0,0.5)]"
            >
              Launch Vault
            </Link>
          </div>
        </div>
      </nav>

      {/* ──────────────────────────────────────────────────────────────────────────
          HERO SECTION WITH INTEGRATED INTERACTIVE DUAL-TERMINAL
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-6 overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-orange/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative z-10">
          
          {/* Left Column: The Main Pitch */}
          <div className="flex-1 text-center lg:text-left space-y-6">
            <Reveal>
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-container/90 border border-white/[0.1] text-xs font-mono uppercase tracking-widest text-text-muted">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>YC Crypto RFS Oct 2026</span>
                <span className="text-white/30">•</span>
                <span className="text-accent-orange font-bold">Live on Arbitrum Sepolia</span>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-4xl sm:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05]">
                1-Click Cross-Chain Intents. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-orange via-red-500 to-amber-500">
                  On-Chain Firewalls for AI.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="text-lg sm:text-xl text-text-muted leading-relaxed max-w-2xl mx-auto lg:mx-0 font-light">
                Swap ANY token on ANY rollup in 1-click without holding gas tokens. 
                Retain <strong className="text-text-primary font-semibold">hardware WebAuthn sovereignty</strong> with FaceID, while empowering 
                <strong className="text-text-primary font-semibold"> autonomous trading bots</strong> under strict on-chain budget caps and target allowlists.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/transfer"
                  className="w-full sm:w-auto h-14 px-8 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-accent-orange/30 hover:scale-[1.02]"
                >
                  <span className="material-symbols-outlined text-xl">sync_alt</span>
                  Launch 1-Click Cross Swap
                </Link>
                <Link
                  href="/trading"
                  className="w-full sm:w-auto h-14 px-8 bg-surface-container hover:bg-surface-container-high border border-white/[0.1] text-text-primary rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 transition-all"
                >
                  <span className="material-symbols-outlined text-xl text-emerald-400">shield</span>
                  Configure Agent Firewall
                </Link>
              </div>
            </Reveal>

            {/* Quick telemetry badges */}
            <Reveal delay={0.4} className="pt-4">
              <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-mono text-text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">verified</span>
                  <span>RIP-7212 at <code className="text-text-primary">0x0100</code></span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-accent-orange">account_balance</span>
                  <span>Native USDG (6 Decimals)</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-blue-400">lock</span>
                  <span>15/15 Invariants Passed</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Interactive Live Terminal Widget */}
          <div className="flex-1 w-full max-w-xl">
            <Reveal delay={0.2}>
              <div className="bg-[#111116] border border-white/[0.1] rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                
                {/* Terminal Header Tabs */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
                  <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl border border-white/[0.05]">
                    <button
                      onClick={() => setActiveTab('swap')}
                      className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        activeTab === 'swap' 
                          ? 'bg-accent-orange text-white shadow-md shadow-accent-orange/20' 
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">sync_alt</span>
                      1-Click Cross Swap
                    </button>
                    <button
                      onClick={() => setActiveTab('firewall')}
                      className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        activeTab === 'firewall' 
                          ? 'bg-accent-orange text-white shadow-md shadow-accent-orange/20' 
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">shield</span>
                      Agent Firewall
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Interactive Preview</span>
                  </div>
                </div>

                {/* TAB 1: 1-Click Cross-Chain Swap Terminal */}
                {activeTab === 'swap' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Pay Box */}
                    <div className="bg-surface-container-low border border-white/[0.08] rounded-2xl p-4">
                      <div className="flex justify-between items-center text-xs text-text-muted mb-2 font-mono">
                        <span>You Pay (From Intent)</span>
                        <span>Chain: <strong className="text-text-primary">{swapSourceChain}</strong></span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="number"
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          className="bg-transparent text-3xl font-bold font-mono text-text-primary outline-none w-full"
                        />
                        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-white/[0.08]">
                          <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                          <span className="font-mono text-sm font-semibold">USDG</span>
                        </div>
                      </div>
                    </div>

                    {/* Routing Bridge Pill */}
                    <div className="flex items-center justify-center -my-2 relative z-10">
                      <div className="bg-surface-container-high border border-white/[0.1] px-4 py-1 rounded-full text-[11px] font-mono text-text-muted flex items-center gap-1.5 shadow-md">
                        <span className="material-symbols-outlined text-xs text-accent-orange animate-spin" style={{ animationDuration: '6s' }}>sync</span>
                        <span>Li.Fi Router: Stargate • 0 Gas Fees</span>
                      </div>
                    </div>

                    {/* Receive Box */}
                    <div className="bg-surface-container-low border border-white/[0.08] rounded-2xl p-4">
                      <div className="flex justify-between items-center text-xs text-text-muted mb-2 font-mono">
                        <span>You Receive (Destination)</span>
                        <span>Chain: <strong className="text-blue-400">{swapDestChain}</strong></span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-3xl font-bold font-mono text-text-primary">
                          ~{(parseFloat(swapAmount || '0') * 0.998).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-white/[0.08]">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          <span className="font-mono text-sm font-semibold">USDC</span>
                        </div>
                      </div>
                    </div>

                    {/* Gasless & Sponsor Notice */}
                    <div className="p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20 text-xs font-mono text-accent-orange flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">ev_station</span>
                        <span>ERC-4337 Paymaster Sponsored</span>
                      </div>
                      <span className="font-bold">$0.00 Gas</span>
                    </div>

                    {/* Execute CTA */}
                    <button
                      onClick={handleSimulateSwap}
                      disabled={isSwapping}
                      className="w-full h-14 bg-gradient-to-r from-accent-orange to-red-600 hover:from-accent-orange/90 hover:to-red-600/90 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent-orange/25 active:scale-[0.99]"
                    >
                      {isSwapping ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                          <span>Routing Intent Across Chains...</span>
                        </>
                      ) : swapDone ? (
                        <>
                          <span className="material-symbols-outlined text-xl text-emerald-300">check_circle</span>
                          <span>Swap Settled in 1.8s!</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xl">fingerprint</span>
                          <span>1-Click Universal Swap (FaceID)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* TAB 2: Agent Spending Firewall Terminal */}
                {activeTab === 'firewall' && (
                  <div className="space-y-4 animate-in fade-in duration-300 font-mono text-xs">
                    {/* Status Meter */}
                    <div className="bg-surface-container-low border border-white/[0.08] rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-text-muted">
                        <span>Agent 24h Spend Cap:</span>
                        <span className="text-text-primary font-bold">${agentSpent} / $500 USDG</span>
                      </div>
                      <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent-orange transition-all duration-300"
                          style={{ width: `${Math.min(100, (agentSpent / 500) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-text-muted pt-1">
                        <span>Whitelisted Target: Uniswap Router</span>
                        <span className="text-emerald-400 font-semibold">Guard Active</span>
                      </div>
                    </div>

                    {/* Simulation Triggers */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleAgentTestTrade(50)}
                        className="p-3 bg-surface-container hover:bg-surface-container-high border border-white/[0.08] rounded-xl text-left transition-all"
                      >
                        <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">play_arrow</span>
                          Test $50 Trade
                        </div>
                        <div className="text-[10px] text-text-muted leading-tight">Within caps; executes cleanly on-chain.</div>
                      </button>

                      <button
                        onClick={() => handleAgentTestTrade(5000)}
                        className="p-3 bg-surface-container hover:bg-surface-container-high border border-white/[0.08] rounded-xl text-left transition-all"
                      >
                        <div className="text-red-400 font-bold mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">block</span>
                          Test $5,000 Rogue Spend
                        </div>
                        <div className="text-[10px] text-text-muted leading-tight">Exceeds cap; triggers on-chain firewall revert.</div>
                      </button>
                    </div>

                    {/* Panic Revoke Button */}
                    <button
                      onClick={handlePanicRevoke}
                      className="w-full h-10 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">lock_reset</span>
                      Test 1-Click Panic Revocation
                    </button>

                    {/* Mini Log Console */}
                    <div className="p-3 bg-black/60 rounded-xl border border-white/[0.05] space-y-1.5 max-h-28 overflow-y-auto">
                      {simLog.map((log, i) => (
                        <div key={i} className="flex flex-col text-[10px]">
                          <span className="text-text-muted">{log.time}</span>
                          <span className={log.type === 'ok' ? 'text-emerald-400' : log.type === 'blocked' ? 'text-red-400' : 'text-blue-400'}>
                            {log.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </Reveal>
          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          COMPARISON SECTION: 20-MIN NIGHTMARE VS 1-CLICK INTENT
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/[0.08] bg-surface-zinc/20">
        <div className="max-w-7xl mx-auto space-y-16">
          <Reveal className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-white/[0.1] text-accent-orange text-xs font-mono uppercase tracking-widest mb-4">
              The Intent Revolution
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Cross-Chain Swaps, Finally Solved.
            </h2>
            <p className="text-base md:text-lg text-text-muted">
              Stop suffering through bridging delays, fragmented liquidity, and gas token management.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* The Old Way */}
            <Reveal className="bg-[#111116] border border-red-500/20 p-8 rounded-3xl flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-red-400 font-mono text-sm uppercase tracking-wider font-semibold">
                  <span className="material-symbols-outlined">cancel</span>
                  The Traditional Way (20+ Minutes)
                </div>
                <div className="space-y-4 text-sm text-text-muted">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                    <span className="text-red-400 font-mono font-bold">1.</span>
                    <span>Find bridge supporting your token pair across Arbitrum and destination rollup.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                    <span className="text-red-400 font-mono font-bold">2.</span>
                    <span>Pay native ETH gas on the origin chain to approve bridge contract.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                    <span className="text-red-400 font-mono font-bold">3.</span>
                    <span>Wait 15–30 minutes for bridge attestations and multi-block confirmations.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                    <span className="text-red-400 font-mono font-bold">4.</span>
                    <span>Realize you have no gas tokens on destination chain; find faucet or bridge ETH.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                    <span className="text-red-400 font-mono font-bold">5.</span>
                    <span>Approve DEX router and execute final swap with unpredictable slippage.</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-white/[0.08] text-xs font-mono text-red-400 font-semibold">
                Result: High drop-off, stolen private keys, lost funds.
              </div>
            </Reveal>

            {/* The StylusSafe Way */}
            <Reveal delay={0.2} className="bg-gradient-to-b from-[#181820] to-[#111116] border border-accent-orange/30 p-8 rounded-3xl flex flex-col justify-between shadow-xl shadow-accent-orange/5">
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-accent-orange font-mono text-sm uppercase tracking-wider font-semibold">
                  <span className="material-symbols-outlined">check_circle</span>
                  The StylusSafe Intent Way (3 Seconds)
                </div>
                <div className="space-y-4 text-sm text-text-primary">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20">
                    <span className="text-accent-orange font-mono font-bold">1.</span>
                    <span><strong>Declare Your Intent:</strong> "Turn my 500 Arbitrum USDG into Base USDC."</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20">
                    <span className="text-accent-orange font-mono font-bold">2.</span>
                    <span><strong>1-Click Hardware Scan:</strong> Approve with FaceID / TouchID via RIP-7212 passkey.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20">
                    <span className="text-accent-orange font-mono font-bold">3.</span>
                    <span><strong>Atomic Execution:</strong> Approvals, bridging, swaps, and gas sponsorship executed in 1 block.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20">
                    <span className="text-accent-orange font-mono font-bold">4.</span>
                    <span><strong>Zero Gas Tokens:</strong> ERC-4337 Paymaster sponsors execution across all rollups.</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-white/[0.08] text-xs font-mono text-emerald-400 font-semibold">
                Result: 1-Click universal liquidity for humans &amp; autonomous agents.
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          THE 3 CORE PILLARS (YC CRFS ARCHITECTURE)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/[0.08] bg-[#08080A]">
        <div className="max-w-7xl mx-auto space-y-16">
          <Reveal className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-white/[0.1] text-text-muted text-xs font-mono uppercase tracking-widest mb-4">
              Comprehensive Platform Pillars
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Three Primitives. One Sovereign Architecture.
            </h2>
            <p className="text-base md:text-lg text-text-muted">
              Built to power the next generation of cross-chain DeFi workflows and autonomous on-chain agents.
            </p>
          </Reveal>

          <RevealStagger className="grid lg:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <RevealItem className="bg-[#111116] border border-white/[0.08] p-8 rounded-3xl flex flex-col justify-between hover:border-accent-orange/40 transition-colors">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-surface-container-high border border-white/[0.08] rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-accent-orange text-3xl">sync_alt</span>
                </div>
                <div className="text-xs font-mono text-accent-orange uppercase tracking-wider font-semibold">
                  Pillar 1 • Cross-Chain
                </div>
                <h3 className="text-2xl font-bold">Universal Cross-Chain Intents</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  Swap any token on Arbitrum, Optimism, Base, or Polygon into any destination asset with Li.Fi routing. Gas is fully sponsored by our Paymaster network.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.08] text-xs font-mono text-text-muted">
                Route: <Link href="/transfer" className="text-accent-orange hover:underline">/transfer →</Link>
              </div>
            </RevealItem>

            {/* Pillar 2 */}
            <RevealItem className="bg-[#111116] border border-white/[0.08] p-8 rounded-3xl flex flex-col justify-between hover:border-accent-orange/40 transition-colors">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-surface-container-high border border-white/[0.08] rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-400 text-3xl">shield</span>
                </div>
                <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                  Pillar 2 • Agent Infra
                </div>
                <h3 className="text-2xl font-bold">Agent Spending Firewall</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  Delegate scoped session keys to AI trading bots with immutable on-chain guardrails: 24h budget limits, per-tx ceilings, whitelisted DeFi routers, and 1-click panic button.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.08] text-xs font-mono text-text-muted">
                Route: <Link href="/trading" className="text-emerald-400 hover:underline">/trading →</Link>
              </div>
            </RevealItem>

            {/* Pillar 3 */}
            <RevealItem className="bg-[#111116] border border-white/[0.08] p-8 rounded-3xl flex flex-col justify-between hover:border-accent-orange/40 transition-colors">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-surface-container-high border border-white/[0.08] rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400 text-3xl">account_balance</span>
                </div>
                <div className="text-xs font-mono text-blue-400 uppercase tracking-wider font-semibold">
                  Pillar 3 • Stable Treasury
                </div>
                <h3 className="text-2xl font-bold">USDG Programmable Treasury</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  Standard 6-decimal ERC-20 stablecoin treasury designed for autonomous agents. Eliminate volatile native gas token risk with clean dollar accounting.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.08] text-xs font-mono text-text-muted">
                Token: <span className="text-text-primary">0xDa4D...BD36</span>
              </div>
            </RevealItem>
          </RevealStagger>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          CALL TO ACTION & FOOTER
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center border-t border-white/[0.08] bg-[#08080A] relative">
        <div className="max-w-4xl mx-auto space-y-8">
          <Reveal>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              Ready to navigate the multichain?
            </h2>
            <p className="text-lg text-text-muted max-w-xl mx-auto mt-4">
              Deploy your hardware-secured vault, execute 1-click cross-chain swaps, and arm autonomous agent guardrails.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <Link
                href="/transfer"
                className="h-16 px-10 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-full font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-accent-orange/30 hover:scale-105"
              >
                <span className="material-symbols-outlined">sync_alt</span>
                Execute Cross Swap
              </Link>
              <Link
                href="/dashboard"
                className="h-16 px-8 bg-surface-container hover:bg-surface-container-high border border-white/[0.1] text-text-primary rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                Open Vault Dashboard
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="py-8 text-center border-t border-white/[0.08] text-text-muted text-xs font-mono flex flex-col items-center gap-2 bg-[#050507]">
        <div>StylusSafe — Universal Cross-Chain Intent Engine &amp; Autonomous Agent Firewall</div>
        <div>Y Combinator Crypto Request for Startups (Oct 2026) • Arbitrum Sepolia</div>
      </footer>

    </div>
  );
}
