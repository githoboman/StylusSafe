'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { BrandLogo } from '@/components/BrandLogo';
import {
  IconSwap,
  IconShield,
  IconWallet,
  IconAutoRenew,
  IconStacks,
  IconFingerprint,
  IconActivity,
  IconLogout,
} from '@/components/Icons';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const navExecution: NavItem[] = [
  { href: '/transfer', label: 'Cross-Chain Swap', icon: IconSwap },
  { href: '/trading', label: 'Agent Firewall', icon: IconShield },
  { href: '/dashboard', label: 'Treasury Vault', icon: IconWallet },
];

const navAutomations: NavItem[] = [
  { href: '/subscription', label: 'DCA & Recurring', icon: IconAutoRenew },
  { href: '/intents', label: 'Intent Batches', icon: IconStacks },
];

const navSecurity: NavItem[] = [
  { href: '/security', label: 'Enclave Security', icon: IconFingerprint },
  { href: '/activity', label: 'Activity Log', icon: IconActivity },
];

const allNavItems = [...navExecution, ...navAutomations, ...navSecurity];

const mobileNavItems: NavItem[] = [
  { href: '/transfer', label: 'Swap', icon: IconSwap },
  { href: '/trading', label: 'Firewall', icon: IconShield },
  { href: '/dashboard', label: 'Vault', icon: IconWallet },
  { href: '/activity', label: 'Activity', icon: IconActivity },
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

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <div className="text-[11px] font-mono text-[#8e8e98] uppercase tracking-wider px-3 mb-1.5 font-medium">
        {title}
      </div>
      {items.map((item) => {
        const active = pathname === item.href;
        const IconComponent = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              active
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-[#8e8e98] hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <span className={`inline-flex items-center justify-center shrink-0 ${active ? 'text-[#ff4500]' : 'text-[#8e8e98]'}`}>
              <IconComponent size={18} />
            </span>
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col md:flex-row text-[#ffffff] selection:bg-[#ff4500] selection:text-white font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.08] bg-[#0d0d10] p-5 justify-between h-screen sticky top-0 z-30 shrink-0">
        <div className="space-y-6 overflow-y-auto">
          
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <Link href="/" className="hover:opacity-90 transition-opacity">
              <BrandLogo size={28} />
            </Link>
            <span className="text-[11px] font-mono text-[#8e8e98] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
              Arb Sepolia
            </span>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-5">
            {renderNavGroup('Execution', navExecution)}
            {renderNavGroup('Automations', navAutomations)}
            {renderNavGroup('Security', navSecurity)}
          </nav>
        </div>

        {/* User Account Bar */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="p-3 rounded-lg bg-[#141418] border border-white/[0.06] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="w-7 h-7 rounded-md bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#ff4500] shrink-0">
                <IconFingerprint size={16} />
              </span>
              <div className="truncate">
                <div className="font-mono text-xs text-white truncate font-medium">
                  {address ? formatAddress(address) : 'No Wallet'}
                </div>
                <div className="text-[10px] text-[#8e8e98] leading-tight">
                  {address ? 'Hardware Enclave' : 'Connect Vault'}
                </div>
              </div>
            </div>
            {address && (
              <button
                type="button"
                onClick={disconnect}
                title="Disconnect"
                className="w-7 h-7 rounded-md hover:bg-white/[0.06] text-[#8e8e98] hover:text-red-400 flex items-center justify-center transition-colors shrink-0"
              >
                <IconLogout size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0 overflow-x-hidden">
        
        {/* Top App Header */}
        <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.08] px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <Link href="/">
                <BrandLogo size={24} />
              </Link>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-[#8e8e98]">
              <span className="font-normal">StylusSafe</span>
              <span className="text-white/20">/</span>
              <span className="text-white font-medium">
                {allNavItems.find(i => i.href === pathname)?.label || 'App'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/transfer"
              className="h-8 px-3 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md inline-flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <IconSwap size={14} className="text-[#ff4500]" />
              <span>Swap</span>
            </Link>
            <Link
              href="/trading"
              className="h-8 px-3 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md inline-flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <IconShield size={14} className="text-emerald-400" />
              <span>Firewall</span>
            </Link>
            <Link
              href="/"
              className="h-8 px-3 text-xs text-[#8e8e98] hover:text-white rounded-md inline-flex items-center transition-colors"
            >
              Overview
            </Link>
          </div>
        </header>

        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d10]/95 backdrop-blur-md border-t border-white/[0.08] px-2 py-1">
        <div className="flex justify-around items-center h-13">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
                  active ? 'text-white font-medium' : 'text-[#8e8e98]'
                }`}
              >
                <span className={`inline-flex items-center justify-center ${active ? 'text-[#ff4500]' : 'text-[#8e8e98]'}`}>
                  <IconComponent size={19} />
                </span>
                <span className="text-[10px] mt-1 leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
