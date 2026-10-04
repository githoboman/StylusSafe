import Link from 'next/link';
import { Reveal, RevealStagger, RevealItem } from '@/components/Reveal';

export default function LandingPage() {
  return (
    <div className="bg-background-ink text-text-primary selection:bg-accent-orange selection:text-white">
      
      {/* 
        ========================================================================
        MOBILE VIEW (Tinder/TikTok style full-screen snap scrolling cards)
        ========================================================================
      */}
      <div className="block md:hidden h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar relative">
        
        {/* Mobile Nav Overlay */}
        <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-orange to-red-600 flex items-center justify-center shadow-lg shadow-accent-orange/20">
              <span className="material-symbols-outlined text-white text-xl">shield_lock</span>
            </div>
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
              Arbitrum Live
            </div>
            <h1 className="text-5xl font-bold tracking-tighter mb-4 leading-[1.05]">
              Invisible <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-orange to-red-500">Blockchains.</span>
            </h1>
            <p className="text-lg text-text-muted mb-6 leading-snug">
              The ultimate Intent-Based Smart Wallet. 1-click cross-chain swaps. Zero gas tokens.
            </p>
            <div className="flex items-center gap-2 text-text-muted/50 text-sm font-mono animate-bounce mt-4">
              <span className="material-symbols-outlined">expand_more</span>
              Swipe down to explore
            </div>
          </Reveal>
        </section>

        {/* Card 2: Passkeys */}
        <section className="snap-start snap-always h-[100dvh] w-full relative flex flex-col justify-center p-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-zinc/20 to-background-ink z-0" />
          <div className="relative z-10 bg-surface-container/40 backdrop-blur-xl border border-border-whisper rounded-[40px] p-8 w-full h-[70vh] flex flex-col items-center justify-center text-center shadow-2xl">
            <Reveal delay={0.1} className="flex flex-col items-center">
              <div className="w-20 h-20 bg-surface-container-high border border-border-whisper rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <span className="material-symbols-outlined text-accent-orange text-4xl">fingerprint</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">Seedless Onboarding</h2>
              <p className="text-text-muted leading-relaxed">
                Create a secure, non-custodial wallet instantly using FaceID, TouchID, or your device passcode. No 24-word phrases to lose.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Card 3: Gasless & Cross-chain */}
        <section className="snap-start snap-always h-[100dvh] w-full relative flex flex-col justify-center p-6 overflow-hidden">
          <div className="relative z-10 bg-gradient-to-b from-surface-container/60 to-background-ink border border-border-whisper rounded-[40px] p-8 w-full h-[70vh] flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-accent-orange/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2" />
            
            <Reveal delay={0.1} className="flex flex-col items-center relative z-20">
              <div className="flex gap-4 mb-8">
                <div className="w-16 h-16 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-accent-orange text-3xl">route</span>
                </div>
                <div className="w-16 h-16 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-accent-orange text-3xl">local_gas_station</span>
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4">Zero Gas. Any Chain.</h2>
              <p className="text-text-muted leading-relaxed">
                Declare your intent. We handle the bridging, routing, and sponsor your gas fees transparently across all EVM rollups.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Card 4: CTA */}
        <section className="snap-start snap-always h-[100dvh] w-full relative flex flex-col justify-center items-center p-6 text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent-orange/10 to-background-ink z-0 pointer-events-none" />
          
          <Reveal delay={0.1} className="relative z-10 w-full">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-accent-orange to-red-600 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(255,69,0,0.4)] animate-pulse">
              <span className="material-symbols-outlined text-white text-5xl">rocket_launch</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tighter mb-8">Ready to jump in?</h2>
            <Link 
              href="/dashboard"
              className="inline-flex h-16 w-full max-w-[280px] mx-auto bg-white text-background-ink rounded-full font-bold text-lg items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              Create Wallet
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </Reveal>
        </section>

      </div>

      {/* 
        ========================================================================
        DESKTOP VIEW (Premium Feature Showcase)
        ========================================================================
      */}
      <div className="hidden md:block min-h-screen">
        {/* Navigation */}
        <nav className="fixed top-0 w-full border-b border-border-whisper bg-background-ink/80 backdrop-blur-md z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-orange to-red-600 flex items-center justify-center shadow-lg shadow-accent-orange/20">
                <span className="material-symbols-outlined text-white text-xl">shield_lock</span>
              </div>
              <span className="text-xl font-bold tracking-tight">StylusSafe</span>
            </div>
            <Link 
              href="/dashboard"
              className="h-10 px-6 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-full font-medium text-sm flex items-center transition-all shadow-[0_0_20px_rgba(255,69,0,0.3)] hover:shadow-[0_0_30px_rgba(255,69,0,0.5)]"
            >
              Launch App
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 px-6 overflow-hidden">
          {/* Abstract background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-orange/15 rounded-full blur-[150px] pointer-events-none" />
          
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <Reveal delay={0.1}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-accent-orange/30 text-accent-orange text-xs font-mono uppercase tracking-widest mb-10">
                <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse"></span>
                ZeroDev ERC-4337 Live on Arbitrum
              </div>
            </Reveal>
            
            <Reveal delay={0.2}>
              <h1 className="text-7xl lg:text-[100px] font-bold tracking-tighter mb-10 leading-[0.95]">
                Blockchains, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-orange via-red-500 to-accent-orange bg-[length:200%_auto] animate-[gradient_8s_linear_infinite]">Made Invisible.</span>
              </h1>
            </Reveal>
            
            <Reveal delay={0.3}>
              <p className="text-2xl text-text-muted max-w-3xl mx-auto mb-16 leading-relaxed font-light">
                The ultimate Intent-Based Smart Wallet. Create an account with FaceID. Execute 1-click cross-chain swaps without ever holding gas tokens.
              </p>
            </Reveal>
            
            <Reveal delay={0.4}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link 
                  href="/dashboard"
                  className="h-16 px-10 bg-text-primary text-background-ink hover:bg-gray-200 rounded-full font-semibold text-xl flex items-center gap-3 transition-all justify-center hover:scale-105"
                >
                  Enter the Vault
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Feature Section 1: Passkeys */}
        <section className="relative py-32 px-6 border-t border-border-whisper bg-surface-zinc/10 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
            <Reveal className="flex-1 space-y-8">
              <div className="w-16 h-16 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center shadow-lg shadow-accent-orange/10">
                <span className="material-symbols-outlined text-accent-orange text-3xl">fingerprint</span>
              </div>
              <h2 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">Seedless <br/>Onboarding.</h2>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Powered by WebAuthn passkeys. Create a secure, non-custodial wallet instantly using FaceID, TouchID, or your device passcode. No 24-word phrases to write down, lose, or get stolen. Your biometric is your key.
              </p>
            </Reveal>
            <Reveal delay={0.2} className="flex-1 relative w-full">
              <div className="absolute inset-0 bg-accent-orange/20 blur-[100px] rounded-full" />
              <div className="relative aspect-square w-full max-w-lg mx-auto bg-surface-container border border-border-whisper rounded-[40px] shadow-2xl flex items-center justify-center p-10 overflow-hidden">
                {/* Simulated UI graphic */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:2rem_2rem]" />
                <div className="relative z-10 w-full bg-background-ink border border-border-whisper rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl transform hover:scale-105 transition-transform duration-500">
                  <span className="material-symbols-outlined text-6xl text-text-primary">face</span>
                  <div className="text-center">
                    <h4 className="text-xl font-bold mb-2">Scan FaceID</h4>
                    <p className="text-sm text-text-muted">To secure your StylusSafe</p>
                  </div>
                  <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-accent-orange rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Feature Section 2: Zero Gas */}
        <section className="relative py-32 px-6 border-t border-border-whisper bg-background-ink overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-20">
            <Reveal className="flex-1 space-y-8">
              <div className="w-16 h-16 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center shadow-lg shadow-accent-orange/10">
                <span className="material-symbols-outlined text-accent-orange text-3xl">local_gas_station</span>
              </div>
              <h2 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">Zero Gas. <br/>Any Chain.</h2>
              <p className="text-xl text-text-muted leading-relaxed max-w-xl">
                Never worry about holding ETH on a new chain. Our ZeroDev ERC-4337 Paymaster architecture sponsors your gas fees transparently across all EVM rollups. Transact seamlessly without friction.
              </p>
            </Reveal>
            <Reveal delay={0.2} className="flex-1 relative w-full">
              <div className="absolute inset-0 bg-red-600/10 blur-[100px] rounded-full" />
              <div className="relative aspect-square w-full max-w-lg mx-auto bg-surface-container border border-border-whisper rounded-[40px] shadow-2xl flex items-center justify-center p-10 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Circular expanding rings */}
                  <div className="w-full h-full border border-border-whisper rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-3/4 h-3/4 border border-accent-orange/30 rounded-full animate-ping opacity-40" style={{ animationDuration: '3s', animationDelay: '1s' }} />
                  <div className="absolute w-1/2 h-1/2 border border-accent-orange/60 rounded-full animate-ping opacity-60" style={{ animationDuration: '3s', animationDelay: '2s' }} />
                  <div className="absolute w-32 h-32 bg-gradient-to-br from-accent-orange to-red-600 rounded-full shadow-[0_0_50px_rgba(255,69,0,0.5)] flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-white text-4xl">ev_station</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Feature Section 3: AI Agents & Intents */}
        <section className="relative py-32 px-6 border-y border-border-whisper bg-surface-container-low overflow-hidden">
          <div className="max-w-7xl mx-auto text-center space-y-12">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-orange/10 border border-accent-orange/30 text-accent-orange text-sm font-mono uppercase tracking-widest mx-auto">
                Developer Experience
              </div>
            </Reveal>
            
            <Reveal delay={0.1}>
              <h2 className="text-5xl lg:text-7xl font-bold tracking-tight max-w-4xl mx-auto">Built for automated trading & AI Agents.</h2>
            </Reveal>
            
            <Reveal delay={0.2}>
              <p className="text-xl text-text-muted leading-relaxed max-w-3xl mx-auto">
                Instead of handing over your private keys to a Telegram trading bot, StylusSafe allows you to issue <strong>cryptographically scoped Session Keys</strong>. Restrict your AI agents to only trade on Uniswap, with a $1,000 limit, expiring in 24 hours. Speed meets absolute security.
              </p>
            </Reveal>
            
            <RevealStagger className="grid md:grid-cols-3 gap-8 pt-10">
              <RevealItem className="bg-background-ink border border-border-whisper p-8 rounded-3xl text-left hover:border-accent-orange/40 transition-colors">
                <span className="material-symbols-outlined text-accent-orange text-3xl mb-4">account_tree</span>
                <h4 className="text-xl font-bold mb-2">ERC-4337 Architecture</h4>
                <p className="text-text-muted">Native account abstraction enabling sponsored gas, batch transactions, and modular execution.</p>
              </RevealItem>
              <RevealItem className="bg-background-ink border border-border-whisper p-8 rounded-3xl text-left hover:border-accent-orange/40 transition-colors relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-orange/10 blur-[30px]" />
                <span className="material-symbols-outlined text-accent-orange text-3xl mb-4">memory</span>
                <h4 className="text-xl font-bold mb-2">Arbitrum Stylus</h4>
                <p className="text-text-muted">Written in Rust, compiled to WASM. P-256 signatures verified on-chain at speeds Solidity cannot match.</p>
              </RevealItem>
              <RevealItem className="bg-background-ink border border-border-whisper p-8 rounded-3xl text-left hover:border-accent-orange/40 transition-colors">
                <span className="material-symbols-outlined text-accent-orange text-3xl mb-4">key</span>
                <h4 className="text-xl font-bold mb-2">Modular Session Keys</h4>
                <p className="text-text-muted">Delegate restricted permissions to external services without giving up custody of your assets.</p>
              </RevealItem>
            </RevealStagger>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 px-6 text-center bg-background-ink relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[1px] bg-gradient-to-r from-transparent via-accent-orange to-transparent opacity-50" />
          <Reveal>
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-10">Ready to navigate the multichain?</h2>
            <Link 
              href="/dashboard"
              className="inline-flex h-20 px-12 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-full font-semibold text-xl items-center justify-center gap-4 transition-all shadow-[0_0_40px_rgba(255,69,0,0.4)] hover:shadow-[0_0_60px_rgba(255,69,0,0.6)] hover:scale-105"
            >
              Create Wallet with FaceID
              <span className="material-symbols-outlined text-2xl">fingerprint</span>
            </Link>
          </Reveal>
        </section>
        
        <footer className="py-8 text-center border-t border-border-whisper text-text-muted text-sm font-mono">
          Built for the Arbitrum Singapore Buildathon
        </footer>
      </div>
    </div>
  );
}
