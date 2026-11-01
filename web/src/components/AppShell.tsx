'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';

const navItems = [
  { href: '/transfer', icon: 'sync_alt', label: 'Cross-Chain Swap' },
  { href: '/trading', icon: 'shield', label: 'Agent Firewall' },
  { href: '/dashboard', icon: 'account_balance_wallet', label: 'Treasury Vault' },
  { href: '/subscription', icon: 'autorenew', label: 'DCA & Recurring' },
  { href: '/intents', icon: 'stacks', label: 'Intent Batches' },
  { href: '/security', icon: 'fingerprint', label: 'Enclave Security' },
  { href: '/activity', icon: 'receipt_long', label: 'Activity Log' },
];

const mobileNavItems = [
  { href: '/transfer', icon: 'sync_alt', label: 'Swap' },
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
    <div className="min-h-screen bg-[#09090b] flex flex-col md:flex-row text-[#ffffff] selection:bg-[#ff4500] selection:text-white">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.08] bg-[#0d0d10] p-5 justify-between h-screen sticky top-0 z-30">
        <div className="space-y-6">
          
          {/* Brand & Network */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.jpg" alt="StylusSafe" className="w-6 h-6 rounded-md" />
              <span className="text-base font-semibold tracking-tight text-white">StylusSafe</span>
            </Link>
            <span className="text-[11px] font-mono text-[#8e8e98]">
              Arb Sepolia
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <div className="text-xs text-[#8e8e98] font-medium px-3 mb-2">
              Execution
            </div>
            {navItems.slice(0, 3).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-[#8e8e98] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${active ? 'text-[#ff4500]' : 'text-[#8e8e98]'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="text-xs text-[#8e8e98] font-medium px-3 pt-5 mb-2">
              Automations
            </div>
            {navItems.slice(3, 5).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-[#8e8e98] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${active ? 'text-[#ff4500]' : 'text-[#8e8e98]'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="text-xs text-[#8e8e98] font-medium px-3 pt-5 mb-2">
              Security
            </div>
            {navItems.slice(5).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-[#8e8e98] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${active ? 'text-[#ff4500]' : 'text-[#8e8e98]'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Account / Identity Bar */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="p-3 rounded-lg bg-[#141418] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="material-symbols-outlined text-[#8e8e98] text-[18px]">fingerprint</span>
              <div className="truncate">
                <div className="font-mono text-xs text-white truncate">
                  {address ? formatAddress(address) : 'No Wallet'}
                </div>
                <div className="text-[11px] text-[#8e8e98]">
                  {address ? 'Hardware Passkey' : 'Guest'}
                </div>
              </div>
            </div>
            {address && (
              <button
                onClick={disconnect}
                title="Disconnect"
                className="text-[#8e8e98] hover:text-red-400 p-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0 overflow-x-hidden">
        
        {/* Top App Header */}
        <header className="sticky top-0 z-40 bg-[#09090b]/85 backdrop-blur-md border-b border-white/[0.08] px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <img src="/logo.jpg" alt="StylusSafe" className="w-5 h-5 rounded" />
              <span className="font-semibold text-sm">StylusSafe</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-[#8e8e98]">
              <span>Intent Infrastructure</span>
              <span>/</span>
              <span className="text-white">
                {navItems.find(i => i.href === pathname)?.label || 'App'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/transfer"
              className="h-8 px-3 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-[#ff4500]">sync_alt</span>
              Swap
            </Link>
            <Link
              href="/trading"
              className="h-8 px-3 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-emerald-400">shield</span>
              Firewall
            </Link>
            <Link
              href="/"
              className="h-8 px-2.5 text-xs text-[#8e8e98] hover:text-white flex items-center transition-colors"
            >
              Overview
            </Link>
          </div>
        </header>

        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-[#0d0d10]/95 backdrop-blur-md border-t border-white/[0.08]">
        <div className="flex justify-around items-center h-14 px-2">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[40px] transition-colors ${
                  active ? 'text-white font-medium' : 'text-[#8e8e98]'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${active ? 'text-[#ff4500]' : 'text-[#8e8e98]'}`}>
                  {item.icon}
                </span>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
