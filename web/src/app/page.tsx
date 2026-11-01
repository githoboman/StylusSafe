import Link from 'next/link';
import { Reveal, RevealStagger, RevealItem } from '@/components/Reveal';

export default function LandingPage() {
  return (
    <div className="bg-background-ink text-text-primary selection:bg-accent-orange selection:text-white">
      
      {/* 
        ========================================================================
        MOBILE VIEW (Swipeable Full-Screen Cards)
        ========================================================================
      */}
      <div className="block md:hidden h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar relative">
        
        {/* Mobile Nav Overlay */}
        <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="StylusSafe" className="w-8 h-8 rounded-lg shadow-lg shadow-accent-orange/20" />
            <span className="text-xl font-bold tracking-tight shadow-black drop-shadow-md">StylusSafe</span>
          </div>
          <Link 
            href="/dashboard"
            className="pointer-events-auto h-10 px-5 bg-accent-orange/90 backdrop-blur-md text-white rounded-full font-medium text-sm flex items-center shadow-[0_0_15px_rgba(255,69,0,0.3)] active:scale-95 transition-transform"
          >
            Launch
          </Link>
        </div>

        {/* Card 1: Hero */}
        <section className="snap-start snap-always h-[100dvh] w-full relative flex flex-col justify-end p-6 pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-ink/40 to-background-ink z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-accent-orange/20 rounded-full blur-[80px]" />
          
          <Reveal className="relative z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container/80 backdrop-blur-md border border-accent-orange/30 text-accent-orange text-[10px] font-mono uppercase tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse"></span>
              YC Crypto RFS • Agent Infra
            </div>
            <h1 className="text-4xl font-bold tracking-tighter mb-4 leading-[1.05]">
              On-Chain Firewall for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-orange to-red-500">Autonomous Agents.</span>
            </h1>
            <p className="text-base text-text-muted mb-6 leading-snug">
              Hardware WebAuthn security for humans. Programmatic spending limits and target allowlists for trading agents.
            </p>
            <div className="flex items-center gap-2 text-text-muted/50 text-xs font-mono animate-bounce mt-2">
              <span className="material-symbols-outlined text-sm">expand_more</span>
              Swipe down to explore architecture
            </div>
          </Reveal>
        </section>

        {/* Card 2: Agent Firewall */}
        <section className="snap-start snap-always h-[100dvh] w-full relative flex flex-col justify-center p-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-zinc/20 to-background-ink z-0" />
          <div className="relative z-10 bg-surface-container/40 backdrop-blur-xl border border-border-whisper rounded-[40px] p-8 w-full h-[70vh] flex flex-col items-center justify-center text-center shadow-2xl">
            <Reveal delay={0.1} className="flex flex-col items-center">
              <div className="w-20 h-20 bg-surface-container-high border border-border-whisper rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <span className="material-symbols-outlined text-accent-orange text-4xl">shield</span>
              </div>
              <h2 className="text-2xl font-bold mb-3">Agent Spending Firewall</h2>
              <p className="text-text-muted text-sm leading-relaxed mb-4">
                Delegate scoped execution keys to AI agents with strict on-chain constraints: 24h budget caps, per-tx ceilings, and whitelisted DeFi routers.
              </p>
              <div className="px-3 py-1.5 rounded-lg bg-surface-zinc border border-border-whisper text-xs font-mono text-accent-orange">
                revert StylusSafe__AgentDailyLimitExceeded()
              </div>
            </Reveal>
          </div>
        </section>

        {/* Card 3: USDG Treasury */}
        <section className="snap-start snap-always h-[100dvh] w-full relative flex flex-col justify-center p-6 overflow-hidden">
          <div className="relative z-10 bg-gradient-to-b from-surface-container/60 to-background-ink border border-border-whisper rounded-[40px] p-8 w-full h-[70vh] flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-accent-orange/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2" />
            
            <Reveal delay={0.1} className="flex flex-col items-center relative z-20">
              <div className="w-16 h-16 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="material-symbols-outlined text-accent-orange text-3xl">account_balance</span>
              </div>
              <h2 className="text-2xl font-bold mb-3">USDG Agent Treasury</h2>
              <p className="text-text-muted text-sm leading-relaxed mb-4">
                Autonomous trading agents settle in standard 6-decimal USDG. Eliminate volatile gas exposure with sponsored ERC-4337 Paymasters.
              </p>
              <div className="text-[11px] font-mono text-text-muted bg-surface-zinc/80 px-3 py-1 rounded border border-border-whisper">
                0xDa4D2948...BD36 (Arbitrum Sepolia)
              </div>
            </Reveal>
          </div>
        </section>

        {/* Card 4: CTA */}
        <section className="snap-start snap-always h-[100dvh] w-full relative flex flex-col justify-center items-center p-6 text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent-orange/10 to-background-ink z-0 pointer-events-none" />
          
          <Reveal delay={0.1} className="relative z-10 w-full">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-accent-orange to-red-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,69,0,0.4)] animate-pulse">
              <span className="material-symbols-outlined text-white text-4xl">smart_toy</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tighter mb-4">Deploy an Agent Vault</h2>
            <p className="text-text-muted text-sm max-w-xs mx-auto mb-6">
              Production-grade ERC-4337 smart account with on-chain firewall policy engine.
            </p>
            <Link 
              href="/dashboard"
              className="inline-flex h-14 w-full max-w-[260px] mx-auto bg-white text-background-ink rounded-full font-bold text-base items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              Enter Dashboard
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </Reveal>
        </section>

      </div>

      {/* 
        ========================================================================
        DESKTOP VIEW (Production Agent Firewall & YC RFS Architecture)
        ========================================================================
      */}
      <div className="hidden md:block min-h-screen">
        {/* Navigation */}
        <nav className="fixed top-0 w-full border-b border-border-whisper bg-background-ink/80 backdrop-blur-md z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="StylusSafe" className="w-9 h-9 rounded-lg shadow-lg shadow-accent-orange/20" />
              <div>
                <span className="text-xl font-bold tracking-tight">StylusSafe</span>
                <span className="ml-2 text-[10px] font-mono uppercase bg-accent-orange/10 text-accent-orange border border-accent-orange/30 px-2 py-0.5 rounded">
                  Agent Firewall v2
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/trading" className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
                Agent Firewall
              </Link>
              <Link href="/transfer" className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
                USDG Treasury
              </Link>
              <Link href="/security" className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
                WebAuthn Enclave
              </Link>
              <Link 
                href="/dashboard"
                className="h-10 px-6 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-full font-medium text-sm flex items-center transition-all shadow-[0_0_20px_rgba(255,69,0,0.3)] hover:shadow-[0_0_30px_rgba(255,69,0,0.5)]"
              >
                Launch Dashboard
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center pt-24 px-6 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-orange/15 rounded-full blur-[150px] pointer-events-none" />
          
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <Reveal delay={0.1}>
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-surface-container border border-accent-orange/30 text-accent-orange text-xs font-mono uppercase tracking-widest mb-8">
                <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse"></span>
                <span>Y Combinator Crypto RFS (Oct 2026)</span>
                <span className="text-text-muted">•</span>
                <span className="text-text-primary font-semibold">Agent Infrastructure</span>
              </div>
            </Reveal>
            
            <Reveal delay={0.2}>
              <h1 className="text-6xl lg:text-[88px] font-bold tracking-tighter mb-8 leading-[0.95]">
                The On-Chain Firewall for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-orange via-red-500 to-accent-orange bg-[length:200%_auto] animate-[gradient_8s_linear_infinite]">
                  Autonomous AI Agents.
                </span>
              </h1>
            </Reveal>
            
            <Reveal delay={0.3}>
              <p className="text-xl lg:text-2xl text-text-muted max-w-3xl mx-auto mb-12 leading-relaxed font-light">
                Give trading and workflow agents autonomous execution authority without risking your treasury. 
                <span className="text-text-primary font-medium"> Hardware WebAuthn keys for humans</span>, backed by 
                <span className="text-text-primary font-medium"> immutable on-chain policy firewalls</span> and 
                <span className="text-text-primary font-medium"> USDG stablecoin liquidity</span>.
              </p>
            </Reveal>
            
            <Reveal delay={0.4}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                <Link 
                  href="/dashboard"
                  className="h-14 px-8 bg-text-primary text-background-ink hover:bg-gray-200 rounded-full font-semibold text-base flex items-center gap-3 transition-all justify-center hover:scale-105"
                >
                  Deploy Smart Account
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link 
                  href="/trading"
                  className="h-14 px-8 bg-surface-container hover:bg-surface-container-high border border-border-whisper text-text-primary rounded-full font-medium text-base flex items-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-accent-orange text-xl">shield</span>
                  Configure Agent Policy
                </Link>
              </div>
            </Reveal>

            {/* Live On-Chain Telemetry Pill */}
            <Reveal delay={0.5} className="mt-14">
              <div className="inline-flex flex-wrap items-center justify-center gap-4 py-2.5 px-6 rounded-2xl bg-surface-container/60 border border-border-whisper text-xs font-mono text-text-muted backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Arbitrum Sepolia Live</span>
                </div>
                <span>|</span>
                <div>
                  Factory: <span className="text-text-primary">0xd364b733...3f7</span>
                </div>
                <span>|</span>
                <div>
                  Impl: <span className="text-text-primary">0x0D666af6...2fA</span>
                </div>
                <span>|</span>
                <div>
                  USDG: <span className="text-text-primary">0xDa4D2948...BD36</span>
                </div>
                <span>|</span>
                <div className="text-emerald-400 font-semibold">
                  15/15 Invariants Verified
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Feature Section 1: The YC 3-Pillar Solution */}
        <section className="relative py-28 px-6 border-t border-border-whisper bg-surface-zinc/10 overflow-hidden">
          <div className="max-w-7xl mx-auto space-y-16">
            <Reveal className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-border-whisper text-text-muted text-xs font-mono uppercase tracking-widest mb-4">
                Architecture Alignment
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Engineered for the 3 YC Crypto RFS Priorities
              </h2>
              <p className="text-lg text-text-muted">
                Solving the missing security and settlement primitives holding back autonomous on-chain agents.
              </p>
            </Reveal>

            <RevealStagger className="grid lg:grid-cols-3 gap-8">
              {/* Pillar 1 */}
              <RevealItem className="bg-background-ink border border-border-whisper p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-accent-orange text-3xl">smart_toy</span>
                  </div>
                  <div className="text-xs font-mono text-accent-orange uppercase tracking-wider">
                    YC CRFS Category 1
                  </div>
                  <h3 className="text-2xl font-bold">Agent Infrastructure</h3>
                  <p className="text-text-muted text-sm leading-relaxed">
                    AI agents must not hold raw master private keys. StylusSafe issues cryptographically bounded session keys with hard on-chain daily caps, per-tx ceilings, and target allowlists.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border-whisper text-xs font-mono text-text-muted">
                  Contract Method: <span className="text-text-primary">setAgentPolicy()</span>
                </div>
              </RevealItem>

              {/* Pillar 2 */}
              <RevealItem className="bg-background-ink border border-border-whisper p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-accent-orange text-3xl">candlestick_chart</span>
                  </div>
                  <div className="text-xs font-mono text-accent-orange uppercase tracking-wider">
                    YC CRFS Category 2
                  </div>
                  <h3 className="text-2xl font-bold">Trading Agents (DeFi)</h3>
                  <p className="text-text-muted text-sm leading-relaxed">
                    Allow autonomous market makers, DCA bots, and rebalancing agents to execute trades on Uniswap, GMX, or CoW Swap. If an agent hallucinates or is compromised, rogue spend is blocked on-chain.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border-whisper text-xs font-mono text-text-muted">
                  Contract Method: <span className="text-text-primary">executeAsAgent()</span>
                </div>
              </RevealItem>

              {/* Pillar 3 */}
              <RevealItem className="bg-background-ink border border-border-whisper p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-accent-orange text-3xl">payments</span>
                  </div>
                  <div className="text-xs font-mono text-accent-orange uppercase tracking-wider">
                    YC CRFS Category 3
                  </div>
                  <h3 className="text-2xl font-bold">USDG Stablecoin Treasury</h3>
                  <p className="text-text-muted text-sm leading-relaxed">
                    Agents cannot operate safely with volatile gas tokens. StylusSafe settles agent intents in standard 6-decimal USDG with sponsored gas via ERC-4337 Paymasters.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border-whisper text-xs font-mono text-text-muted">
                  Token: <span className="text-text-primary">USDG (6 Decimals, ERC-20)</span>
                </div>
              </RevealItem>
            </RevealStagger>
          </div>
        </section>

        {/* Feature Section 2: Technical Deep Dive */}
        <section className="relative py-28 px-6 border-t border-border-whisper bg-background-ink overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <Reveal className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-border-whisper text-accent-orange text-xs font-mono uppercase tracking-widest">
                RIP-7212 + Enclave Security
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
                Master Authority Stays in Your Secure Enclave.
              </h2>
              <p className="text-lg text-text-muted leading-relaxed">
                Your primary account is secured by the hardware chip inside your iPhone or Android device (Secure Enclave / StrongBox). We verify the secp256r1 signature on-chain using the standard RIP-7212 precompile at <code className="text-accent-orange font-mono">0x0100</code>.
              </p>
              <ul className="space-y-3 text-sm text-text-muted font-mono">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                  Zero seed phrases to store, write down, or leak
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                  WebAuthn authenticator data &amp; clientDataJSON hash verification
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                  1-Click Panic Button: Instant on-chain revocation of all agent session keys
                </li>
              </ul>
            </Reveal>

            <Reveal delay={0.2} className="flex-1 relative w-full">
              <div className="bg-surface-zinc rounded-3xl p-6 border border-border-whisper shadow-2xl font-mono text-xs overflow-x-auto text-text-muted space-y-3">
                <div className="text-emerald-400 font-bold">// On-Chain Policy Verification (StylusSafeAccount.sol)</div>
                <div>
                  <span className="text-accent-orange">function</span> <span className="text-blue-400">executeAsAgent</span>(
                  <br />&nbsp;&nbsp;address agentKey,
                  <br />&nbsp;&nbsp;address target,
                  <br />&nbsp;&nbsp;uint256 value,
                  <br />&nbsp;&nbsp;bytes calldata data
                  <br />) external &#123;
                </div>
                <div className="text-gray-400 pl-4">
                  AgentPolicy memory p = agentPolicies[agentKey];<br />
                  if (block.timestamp &gt; p.expiry) <span className="text-red-400">revert StylusSafe__AgentPolicyExpired()</span>;<br />
                  if (p.allowedTarget != address(0) &amp;&amp; target != p.allowedTarget) <br />
                  &nbsp;&nbsp;<span className="text-red-400">revert StylusSafe__AgentTargetNotAllowed()</span>;<br />
                  if (value &gt; p.maxPerTx) <span className="text-red-400">revert StylusSafe__AgentPerTxLimitExceeded()</span>;<br />
                  if (spentToday + value &gt; p.dailyLimit) <br />
                  &nbsp;&nbsp;<span className="text-red-400">revert StylusSafe__AgentDailyLimitExceeded()</span>;
                </div>
                <div>&#125;</div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="py-28 px-6 text-center bg-background-ink relative border-t border-border-whisper">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
                Ready to deploy guarded AI agents?
              </h2>
              <p className="text-lg text-text-muted mb-10 max-w-2xl mx-auto">
                Connect via hardware WebAuthn, fund your USDG treasury, and configure autonomous trading policies with zero seed-phrase anxiety.
              </p>
              <div className="flex justify-center gap-4">
                <Link 
                  href="/dashboard"
                  className="inline-flex h-16 px-10 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-full font-semibold text-lg items-center justify-center gap-3 transition-all shadow-[0_0_40px_rgba(255,69,0,0.4)] hover:scale-105"
                >
                  Create Hardware Account
                  <span className="material-symbols-outlined text-xl">fingerprint</span>
                </Link>
                <Link 
                  href="/trading"
                  className="inline-flex h-16 px-8 bg-surface-container hover:bg-surface-container-high border border-border-whisper text-text-primary rounded-full font-semibold text-lg items-center justify-center gap-2 transition-all"
                >
                  Configure Agent Firewall
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
        
        <footer className="py-8 text-center border-t border-border-whisper text-text-muted text-xs font-mono flex flex-col items-center gap-2">
          <div>StylusSafe — Autonomous Agent Policy Engine &amp; Spending Firewall</div>
          <div>Y Combinator Crypto Request for Startups (Oct 2026) Implementation • Arbitrum Sepolia</div>
        </footer>
      </div>
    </div>
  );
}
