'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';

const navItems = [
  { href: '/transfer', icon: 'sync_alt', label: 'Cross-Chain Swap', badge: '1-Click Intent' },
  { href: '/trading', icon: 'shield', label: 'Agent Firewall', badge: 'Guardrails' },
  { href: '/dashboard', icon: 'account_balance_wallet', label: 'Vault Portfolio', badge: 'Multi-Chain' },
  { href: '/subscription', icon: 'autorenew', label: 'DCA & Recurring', badge: null },
  { href: '/intents', icon: 'stacks', label: 'Intent Batches', badge: 'Atomic' },
  { href: '/security', icon: 'fingerprint', label: 'Enclave Security', badge: 'RIP-7212' },
  { href: '/activity', icon: 'receipt_long', label: 'Activity Log', badge: null },
];

const mobileNavItems = [
  { href: '/transfer', icon: 'sync_alt', label: 'Cross Swap' },
  { href: '/trading', icon: 'shield', label: 'Firewall' },
  { href: '/dashboard', icon: 'account_balance_wallet', label: 'Vault' },
  { href: '/activity', icon: 'receipt_long', label: 'Activity' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address, disconnect } = useInvisibleWallet();

  if (pathname === '/') {
    return <>{children}</>;
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background-ink flex flex-col md:flex-row text-text-primary selection:bg-accent-orange selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-border-whisper bg-surface-zinc/40 backdrop-blur-xl p-6 justify-between h-screen sticky top-0 z-30">
        <div>
          {/* Logo & Vault Identity */}
          <Link href="/" className="flex flex-col mb-8 group">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="StylusSafe" className="w-8 h-8 rounded-lg shadow-md shadow-accent-orange/20 group-hover:scale-105 transition-transform" />
              <div>
                <span className="text-xl font-bold tracking-tight block">StylusSafe</span>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">
                  Intents • Agent Firewall
                </span>
              </div>
            </div>
          </Link>

          {/* Network & Live Status Pill */}
          <div className="mb-6 p-3 rounded-xl bg-surface-container/60 border border-border-whisper flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${address ? 'bg-emerald-400 animate-pulse' : 'bg-accent-orange'}`}></span>
              <span className="text-text-primary font-medium">Arbitrum Sepolia</span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
              Live
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col space-y-1">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1.5 px-3">
              Core Execution
            </p>
            {navItems.slice(0, 3).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all
                    ${active
                      ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/25 font-semibold'
                      : 'text-text-muted hover:bg-surface-container hover:text-text-primary'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      active ? 'bg-black/20 text-white' : 'bg-surface-container-high text-accent-orange border border-accent-orange/20'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1.5 px-3 pt-4">
              Automation &amp; Batches
            </p>
            {navItems.slice(3, 5).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all
                    ${active
                      ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/25 font-semibold'
                      : 'text-text-muted hover:bg-surface-container hover:text-text-primary'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      active ? 'bg-black/20 text-white' : 'bg-surface-container-high text-text-muted'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1.5 px-3 pt-4">
              Security &amp; Audit
            </p>
            {navItems.slice(5).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all
                    ${active
                      ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/25 font-semibold'
                      : 'text-text-muted hover:bg-surface-container hover:text-text-primary'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      active ? 'bg-black/20 text-white' : 'bg-surface-container-high text-emerald-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Vault Status & Disconnect */}
        <div className="pt-4 border-t border-border-whisper">
          <div className="p-3 rounded-xl bg-surface-container/40 border border-border-whisper flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-border-whisper text-accent-orange">
                <span className="material-symbols-outlined text-[18px]">fingerprint</span>
              </div>
              <div className="flex flex-col truncate">
                <span className="font-mono text-xs font-semibold text-text-primary truncate">
                  {address ? formatAddress(address) : 'Not Connected'}
                </span>
                <span className="font-mono text-[10px] text-text-muted uppercase">
                  {address ? 'Hardware Passkey' : 'Guest'}
                </span>
              </div>
            </div>
            {address && (
              <button
                onClick={disconnect}
                title="Disconnect"
                className="text-text-muted hover:text-red-400 p-1 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-background-ink/80 backdrop-blur-xl border-b border-border-whisper px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <img src="/logo.jpg" alt="StylusSafe" className="w-6 h-6 rounded-md" />
              <span className="font-bold text-lg tracking-tight">StylusSafe</span>
            </div>
            <div className="hidden md:flex items-center gap-3 font-mono text-xs text-text-muted">
              <span>Universal Intent Engine</span>
              <span>•</span>
              <span className="text-accent-orange">1-Click Cross Swap</span>
              <span>•</span>
              <span className="text-emerald-400">Agent Guardrails</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/transfer"
              className="h-9 px-3.5 bg-accent-orange/10 hover:bg-accent-orange/20 text-accent-orange border border-accent-orange/30 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-sm">sync_alt</span>
              <span className="hidden sm:inline">1-Click</span> Swap
            </Link>
            <Link
              href="/trading"
              className="h-9 px-3.5 bg-surface-container hover:bg-surface-container-high text-text-primary border border-border-whisper rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-sm text-emerald-400">shield</span>
              <span className="hidden sm:inline">Agent</span> Firewall
            </Link>
            <Link
              href="/"
              className="h-9 px-3 text-text-muted hover:text-text-primary text-xs font-mono flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">help</span>
              <span className="hidden sm:inline">Overview</span>
            </Link>
          </div>
        </header>

        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-background-ink/95 backdrop-blur-xl border-t border-border-whisper">
        <div className="flex justify-around items-center h-16 px-2">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] transition-colors
                  ${active ? 'text-accent-orange font-semibold' : 'text-text-muted hover:text-text-primary'}`}
              >
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
