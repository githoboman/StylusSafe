'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { BrandLogo } from '@/components/BrandLogo';
import { FirstTimeOnboardingOverlay } from '@/components/OnboardingSwiper';
import {
  IconShield,
  IconWallet,
  IconAutoRenew,
  IconStacks,
  IconFingerprint,
  IconActivity,
  IconLogout,
  IconDialpad,
} from '@/components/Icons';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const navExecution: NavItem[] = [
  { href: '/dashboard', label: 'My Wallet', icon: IconWallet },
  { href: '/trading', label: 'AI Allowances', icon: IconShield },
];

const navAutomations: NavItem[] = [
  { href: '/subscription', label: 'Auto-Pay & DCA', icon: IconAutoRenew },
  { href: '/intents', label: 'Batch Actions', icon: IconStacks },
];

const navSecurity: NavItem[] = [
  { href: '/security', label: 'Biometric Keys', icon: IconFingerprint },
  { href: '/activity', label: 'Activity History', icon: IconActivity },
];

const allNavItems = [...navExecution, ...navAutomations, ...navSecurity];

const mobileNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Wallet', icon: IconWallet },
  { href: '/trading', label: 'AI Limits', icon: IconShield },
  { href: '/intents', label: 'Batches', icon: IconStacks },
  { href: '/security', label: 'Keys', icon: IconFingerprint },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address, disconnect } = useInvisibleWallet();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  if (pathname === '/') {
    return (
      <>
        <FirstTimeOnboardingOverlay />
        {children}
      </>
    );
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const renderNavGroup = (title: string, items: NavItem[], onNavigate?: () => void) => (
    <div className="space-y-1.5">
      <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider px-3 mb-2 font-medium">
        {title}
      </div>
      {items.map((item) => {
        const active = pathname === item.href;
        const IconComponent = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
              active
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <span className={`inline-flex items-center justify-center shrink-0 ${active ? 'text-[#ff4500]' : 'text-zinc-400'}`}>
              <IconComponent size={18} />
            </span>
            <span className="leading-none truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#09090b] flex flex-col md:flex-row text-white selection:bg-[#ff4500] selection:text-white font-sans">
      {/* First-Time User Onboarding Swiper */}
      <FirstTimeOnboardingOverlay />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.08] bg-[#0d0d10] p-6 justify-between h-screen sticky top-0 z-30 shrink-0">
        <div className="space-y-8 overflow-y-auto">
          <div className="flex items-center justify-between pb-5 border-b border-white/[0.06]">
            <Link href="/" className="hover:opacity-90 transition-opacity">
              <BrandLogo size={28} />
            </Link>
            <span className="text-xs font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.06]">
              Arb Sepolia
            </span>
          </div>

          <nav className="space-y-6">
            {renderNavGroup('Wallet', navExecution)}
            {renderNavGroup('Automations', navAutomations)}
            {renderNavGroup('Security', navSecurity)}
          </nav>
        </div>

        {/* User Account Bar */}
        <div className="pt-5 border-t border-white/[0.06]">
          <div className="p-3.5 rounded-xl bg-[#141418] border border-white/[0.06] flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#ff4500] shrink-0">
                <IconFingerprint size={16} />
              </span>
              <div className="truncate">
                <div className="font-mono text-xs text-white truncate font-medium">
                  {address ? formatAddress(address) : 'Not Connected'}
                </div>
                <div className="text-xs text-zinc-400 leading-tight mt-0.5">
                  {address ? 'Biometric Active' : 'Create Vault'}
                </div>
              </div>
            </div>
            {address && (
              <button
                type="button"
                onClick={disconnect}
                title="Disconnect"
                className="w-8 h-8 rounded-lg hover:bg-white/[0.06] text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <IconLogout size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area — No overflow-x-hidden so native mobile vertical scroll works smoothly */}
      <main className="flex-1 flex flex-col min-h-screen w-full min-w-0 pb-24 md:pb-0">
        {/* Top App Header */}
        <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-8 h-16 flex items-center justify-between gap-3 shrink-0 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="md:hidden flex items-center gap-2 shrink-0">
              <Link href="/">
                <BrandLogo size={24} />
              </Link>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400 truncate">
              <span className="font-normal hidden sm:inline">StylusSafe</span>
              <span className="text-white/20 hidden sm:inline">/</span>
              <span className="text-white font-medium truncate">
                {allNavItems.find((i) => i.href === pathname)?.label || 'My Wallet'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/trading"
              className="h-9 px-3.5 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg inline-flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <IconShield size={14} className="text-[#ff4500]" />
              <span>AI Limits</span>
            </Link>
            <Link
              href="/"
              className="h-9 px-3 text-xs text-zinc-400 hover:text-white rounded-lg inline-flex items-center transition-colors"
            >
              Home
            </Link>
          </div>
        </header>

        {/* Page Container */}
        <div className="flex-1 w-full min-w-0">
          {children}
        </div>
      </main>

      {/* Mobile Slide-Up Full Navigation Drawer */}
      <AnimatePresence>
        {isMobileSheetOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="bg-[#0d0d10] border-t border-white/[0.1] rounded-t-3xl p-5 pb-10 space-y-5 max-h-[82vh] overflow-y-auto w-full"
            >
              <div className="w-10 h-1 bg-white/[0.2] rounded-full mx-auto" />

              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <BrandLogo size={22} />
                  <span className="text-sm font-semibold text-white">Wallet Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="text-xs font-mono text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.05]"
                >
                  Close ✕
                </button>
              </div>

              <div className="space-y-5">
                {renderNavGroup('Wallet', navExecution, () => setIsMobileSheetOpen(false))}
                {renderNavGroup('Automations', navAutomations, () => setIsMobileSheetOpen(false))}
                {renderNavGroup('Security', navSecurity, () => setIsMobileSheetOpen(false))}
              </div>

              <div className="pt-3 border-t border-white/[0.06]">
                <div className="p-4 rounded-xl bg-[#141418] border border-white/[0.06] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#ff4500] shrink-0">
                      <IconFingerprint size={18} />
                    </span>
                    <div className="truncate">
                      <div className="font-mono text-sm text-white truncate font-medium">
                        {address ? formatAddress(address) : 'No Wallet Connected'}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {address ? 'Biometric Bound' : 'Create Vault on Dashboard'}
                      </div>
                    </div>
                  </div>
                  {address && (
                    <button
                      type="button"
                      onClick={() => {
                        disconnect();
                        setIsMobileSheetOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-zinc-300 border border-white/[0.1] text-xs font-medium shrink-0"
                    >
                      Lock
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d10]/95 backdrop-blur-md border-t border-white/[0.08] px-2 py-2 w-full">
        <div className="flex justify-around items-center h-12">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
                  active ? 'text-white font-medium' : 'text-zinc-400'
                }`}
              >
                <span className={`inline-flex items-center justify-center ${active ? 'text-[#ff4500]' : 'text-zinc-400'}`}>
                  <IconComponent size={19} />
                </span>
                <span className="text-xs mt-1 leading-none">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMobileSheetOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
              isMobileSheetOpen ? 'text-white font-medium' : 'text-zinc-400'
            }`}
          >
            <span className={`inline-flex items-center justify-center ${isMobileSheetOpen ? 'text-[#ff4500]' : 'text-zinc-400'}`}>
              <IconDialpad size={19} />
            </span>
            <span className="text-xs mt-1 leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
