import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background-ink text-text-primary overflow-x-hidden selection:bg-accent-orange selection:text-white">
      
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
      <section className="relative pt-48 pb-32 px-6">
        {/* Abstract background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-orange/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-accent-orange/30 text-accent-orange text-xs font-mono uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse"></span>
            ZeroDev ERC-4337 Live on Arbitrum
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Make Blockchains <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-orange to-red-600">Completely Invisible.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-text-muted max-w-3xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            The ultimate Intent-Based Smart Wallet. Create an account with FaceID. Execute 1-click cross-chain swaps without ever holding gas tokens.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link 
              href="/dashboard"
              className="h-14 px-8 bg-text-primary text-background-ink hover:bg-gray-200 rounded-full font-semibold text-lg flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              Enter the Vault
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <a 
              href="#features"
              className="h-14 px-8 bg-surface-container hover:bg-surface-container-high border border-border-whisper text-text-primary rounded-full font-medium text-lg flex items-center transition-all w-full sm:w-auto justify-center"
            >
              Explore Architecture
            </a>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-32 px-6 bg-surface-zinc/30 border-y border-border-whisper relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-20 text-center">Engineered for absolute frictionlessness.</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-surface-container/50 border border-border-whisper p-8 rounded-[32px] hover:border-accent-orange/50 transition-colors group">
              <div className="w-14 h-14 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <span className="material-symbols-outlined text-accent-orange text-3xl">fingerprint</span>
              </div>
              <h3 className="text-2xl font-semibold mb-3">Seedless Onboarding</h3>
              <p className="text-text-muted leading-relaxed">
                Powered by WebAuthn passkeys. Create a secure, non-custodial wallet instantly using FaceID, TouchID, or your device passcode. No 24-word phrases to lose.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface-container/50 border border-border-whisper p-8 rounded-[32px] hover:border-accent-orange/50 transition-colors group">
              <div className="w-14 h-14 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <span className="material-symbols-outlined text-accent-orange text-3xl">route</span>
              </div>
              <h3 className="text-2xl font-semibold mb-3">1-Click Cross-Chain</h3>
              <p className="text-text-muted leading-relaxed">
                Integrated deeply with Li.Fi. Declare your intent to turn Arbitrum USDC into a Base meme coin. We handle the bridging, routing, and swapping in a single atomic transaction.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface-container/50 border border-border-whisper p-8 rounded-[32px] hover:border-accent-orange/50 transition-colors group">
              <div className="w-14 h-14 bg-surface-container-high border border-border-whisper rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <span className="material-symbols-outlined text-accent-orange text-3xl">local_gas_station</span>
              </div>
              <h3 className="text-2xl font-semibold mb-3">Zero Gas Fees</h3>
              <p className="text-text-muted leading-relaxed">
                Never worry about holding ETH on a new chain. Our ZeroDev ERC-4337 Paymaster architecture sponsors your gas fees transparently across all EVM rollups.
              </p>
            </div>
            
            {/* Feature 4 (Large spanning) */}
            <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-surface-container to-background-ink border border-border-whisper p-10 md:p-16 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative group">
              <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-accent-orange/10 blur-[100px] pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2" />
              
              <div className="max-w-xl relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-orange/10 text-accent-orange text-xs font-mono uppercase tracking-widest mb-6 border border-accent-orange/20">
                  Developer Experience
                </div>
                <h3 className="text-4xl font-bold mb-6 leading-tight">Built for automated trading & AI Agents.</h3>
                <p className="text-lg text-text-muted mb-8 leading-relaxed">
                  Instead of handing over your private keys to a Telegram trading bot, StylusSafe allows you to issue <strong>cryptographically scoped Session Keys</strong>. Restrict your AI agents to only trade on Uniswap, with a $1,000 limit, expiring in 24 hours. Speed meets absolute security.
                </p>
                <ul className="space-y-4 font-mono text-sm text-text-primary">
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-accent-orange text-lg">check_circle</span> ERC-4337 Account Abstraction</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-accent-orange text-lg">check_circle</span> Passkey / WebAuthn Signatures</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-accent-orange text-lg">check_circle</span> Modular Session Keys</li>
                </ul>
              </div>
              
              {/* Abstract Visual Representation */}
              <div className="relative w-full max-w-sm aspect-square bg-surface-container-high border border-border-whisper rounded-2xl shadow-2xl flex items-center justify-center z-10 group-hover:border-accent-orange/30 transition-colors">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border border-accent-orange/20 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute w-32 h-32 rounded-full border border-accent-orange/40 animate-[spin_7s_linear_infinite_reverse]" />
                  <div className="absolute w-16 h-16 rounded-full bg-accent-orange shadow-[0_0_50px_rgba(255,69,0,0.8)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">smart_toy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8">Ready to navigate the multichain?</h2>
        <Link 
          href="/dashboard"
          className="inline-flex h-16 px-10 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-full font-semibold text-lg items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(255,69,0,0.4)] hover:shadow-[0_0_50px_rgba(255,69,0,0.6)] hover:scale-105"
        >
          Create Wallet with FaceID
          <span className="material-symbols-outlined">fingerprint</span>
        </Link>
      </section>
      
      <footer className="py-8 text-center border-t border-border-whisper text-text-muted text-sm font-mono">
        Built for the Arbitrum Singapore Buildathon
      </footer>
    </div>
  );
}
