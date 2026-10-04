'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';

const navItems = [
  { href: '/dashboard', icon: 'account_balance_wallet', label: 'Vault Overview' },
  { href: '/transfer', icon: 'sync_alt', label: 'Cross-Chain Swap' },
  { href: '/trading', icon: 'flash_on', label: '1-Click Trading' },
  { href: '/subscription', icon: 'autorenew', label: 'Subscriptions' },
  { href: '/intents', icon: 'stacks', label: 'Intent Batches' },
  { href: '/security', icon: 'shield', label: 'Security Policies' },
  { href: '/activity', icon: 'receipt_long', label: 'Activity Log' },
];

// Bottom nav only shows the 4 primary destinations on mobile
const mobileNavItems = [
  { href: '/dashboard', icon: 'account_balance_wallet', label: 'Vault' },
  { href: '/transfer', icon: 'sync_alt', label: 'Swap' },
  { href: '/security', icon: 'shield', label: 'Security' },
  { href: '/activity', icon: 'receipt_long', label: 'Activity' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address } = useInvisibleWallet();

  if (pathname === '/') {
    return <>{children}</>;
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background-ink flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border-whisper bg-surface-zinc p-6 justify-between h-screen sticky top-0">
        <div>
          <div className="flex flex-col mb-10">
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="StylusSafe" className="w-6 h-6 rounded-md" />
              <span className="text-2xl font-semibold text-text-primary leading-none tracking-tight">StylusSafe</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`w-1.5 h-1.5 rounded-full ${address ? 'bg-accent-orange animate-pulse' : 'bg-text-muted'}`}></span>
              <span className="text-xs text-text-muted uppercase tracking-wider font-mono">
                {address ? 'Vault 01 // Arbitrum' : 'Not Connected'}
              </span>
            </div>
          </div>

          <nav className="flex flex-col space-y-0.5">
            {/* Primary group */}
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2 px-3 pt-1">Wallet</p>
            {navItems.slice(0, 2).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] font-medium text-sm transition-colors
                    ${active
                      ? 'bg-surface-container text-accent-orange'
                      : 'text-text-muted hover:bg-surface-container-low hover:text-text-primary'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}

            {/* Capabilities group */}
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2 px-3 pt-5">Capabilities</p>
            {navItems.slice(2, 5).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] font-medium text-sm transition-colors
                    ${active
                      ? 'bg-surface-container text-accent-orange'
                      : 'text-text-muted hover:bg-surface-container-low hover:text-text-primary'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}

            {/* Account group */}
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2 px-3 pt-5">Account</p>
            {navItems.slice(5).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] font-medium text-sm transition-colors
                    ${active
                      ? 'bg-surface-container text-accent-orange'
                      : 'text-text-muted hover:bg-surface-container-low hover:text-text-primary'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 pt-6 border-t border-border-whisper">
          <div className="w-10 h-10 rounded-[4px] bg-surface-container flex items-center justify-center shrink-0 border border-border-whisper">
            <span className="material-symbols-outlined text-text-primary text-[20px]">person</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs text-text-primary tracking-tight">
              {address ? formatAddress(address) : 'Not Signed In'}
            </span>
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
              {address ? 'Owner' : 'Guest'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 bg-background-ink/90 backdrop-blur-xl border-b border-border-whisper px-4 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="StylusSafe" className="w-5 h-5 rounded-md" />
              <span className="text-xl font-semibold text-text-primary leading-none tracking-tight">StylusSafe</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${address ? 'bg-accent-orange animate-pulse' : 'bg-text-muted'}`}></span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
                {address ? 'Vault 01' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-[4px] bg-surface-container flex items-center justify-center border border-border-whisper">
            <span className="material-symbols-outlined text-text-primary text-[18px]">person</span>
          </div>
        </header>

        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-background-ink/95 backdrop-blur-xl border-t border-border-whisper">
        <div className="flex justify-around items-center h-16 px-2">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] transition-colors
                  ${active ? 'text-accent-orange' : 'text-text-muted hover:text-text-primary'}`}
              >
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
