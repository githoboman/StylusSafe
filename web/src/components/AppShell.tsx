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
  { href: '/dashboard', label: 'My Wallet Vault', icon: IconWallet },
  { href: '/trading', label: 'AI Spending Limits', icon: IconShield },
];

const navAutomations: NavItem[] = [
  { href: '/subscription', label: 'Auto-Pay & DCA', icon: IconAutoRenew },
  { href: '/intents', label: 'Batch Actions', icon: IconStacks },
];

const navSecurity: NavItem[] = [
  { href: '/security', label: 'Face & Fingerprint Keys', icon: IconFingerprint },
  { href: '/activity', label: 'Activity History', icon: IconActivity },
];

const allNavItems = [...navExecution, ...navAutomations, ...navSecurity];

const mobileNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Vault', icon: IconWallet },
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
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-[#8e8e98] hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <span className={`inline-flex items-center justify-center shrink-0 ${active ? 'text-[#ff4500]' : 'text-[#8e8e98]'}`}>
              <IconComponent size={18} />
            </span>
            <span className="leading-none truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen w-full max-w-full bg-[#09090b] flex flex-col md:flex-row text-[#ffffff] selection:bg-[#ff4500] selection:text-white font-sans overflow-x-hidden">
      {/* First-Time User Onboarding Swiper (Automatically disappears once completed) */}
      <FirstTimeOnboardingOverlay />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.08] bg-[#0d0d10] p-5 justify-between h-screen sticky top-0 z-30 shrink-0">
        <div className="space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <Link href="/" className="hover:opacity-90 transition-opacity">
              <BrandLogo size={28} />
            </Link>
            <span className="text-[11px] font-mono text-[#8e8e98] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
              Arb Sepolia
            </span>
          </div>

          <nav className="space-y-5">
            {renderNavGroup('My Wallet', navExecution)}
            {renderNavGroup('Automations', navAutomations)}
            {renderNavGroup('Security & History', navSecurity)}
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
                  {address ? formatAddress(address) : 'Not Connected'}
                </div>
                <div className="text-[10px] text-[#8e8e98] leading-tight">
                  {address ? 'Face & Fingerprint Locked' : 'Tap Create Vault'}
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
      <main className="flex-1 flex flex-col min-h-screen w-full max-w-full min-w-0 pb-20 md:pb-0 overflow-x-hidden">
        {/* Top App Header */}
        <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.08] px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 shrink-0 w-full max-w-full">
          <div className="flex items-center gap-2 min-w-0">
            <div className="md:hidden flex items-center gap-2 shrink-0">
              <Link href="/">
                <BrandLogo size={22} />
              </Link>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8e8e98] truncate">
              <span className="font-normal hidden sm:inline">StylusSafe</span>
              <span className="text-white/20 hidden sm:inline">/</span>
              <span className="text-white font-medium truncate">
                {allNavItems.find((i) => i.href === pathname)?.label || 'My Wallet Vault'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/trading"
              className="h-8 px-2.5 sm:px-3 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md inline-flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <IconShield size={14} className="text-emerald-400" />
              <span>AI Limits</span>
            </Link>
            <Link
              href="/"
              className="h-8 px-2.5 text-xs text-[#8e8e98] hover:text-white rounded-md inline-flex items-center transition-colors"
            >
              Home
            </Link>
          </div>
        </header>

        {/* Swipe-Physics Animated Route Container */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: 16, scale: 0.99 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
          className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden"
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile Slide-Up Full Navigation Drawer */}
      <AnimatePresence>
        {isMobileSheetOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 80 || info.velocity.y > 400) {
                  setIsMobileSheetOpen(false);
                }
              }}
              className="bg-[#0d0d10] border-t border-white/[0.1] rounded-t-2xl p-4 pb-8 space-y-4 max-h-[82vh] overflow-y-auto w-full max-w-full"
            >
              <div className="w-10 h-1 bg-white/[0.2] rounded-full mx-auto" />

              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <BrandLogo size={20} />
                  <span className="text-xs font-mono text-white font-semibold">Wallet Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="text-xs font-mono text-[#8e8e98] hover:text-white px-2 py-1 rounded bg-white/[0.05]"
                >
                  Close [✕]
                </button>
              </div>

              <div className="space-y-4">
                {renderNavGroup('My Wallet', navExecution, () => setIsMobileSheetOpen(false))}
                {renderNavGroup('Automations', navAutomations, () => setIsMobileSheetOpen(false))}
                {renderNavGroup('Security & History', navSecurity, () => setIsMobileSheetOpen(false))}
              </div>

              <div className="pt-3 border-t border-white/[0.06]">
                <div className="p-3 rounded-xl bg-[#141418] border border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#ff4500] shrink-0">
                      <IconFingerprint size={17} />
                    </span>
                    <div className="truncate">
                      <div className="font-mono text-xs text-white truncate font-medium">
                        {address ? formatAddress(address) : 'No Wallet Connected'}
                      </div>
                      <div className="text-[10px] text-[#8e8e98]">
                        {address ? 'Face & Fingerprint Bound' : 'Create Vault on Dashboard'}
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
                      className="px-2.5 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono shrink-0"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d10]/95 backdrop-blur-md border-t border-white/[0.08] px-1 py-1.5 w-full max-w-full">
        <div className="flex justify-around items-center h-12">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[52px] py-1 transition-colors ${
                  active ? 'text-white font-medium' : 'text-[#8e8e98]'
                }`}
              >
                <span className={`inline-flex items-center justify-center ${active ? 'text-[#ff4500]' : 'text-[#8e8e98]'}`}>
                  <IconComponent size={18} />
                </span>
                <span className="text-[10px] mt-1 leading-none">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMobileSheetOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center min-w-[52px] py-1 transition-colors ${
              isMobileSheetOpen ? 'text-white font-medium' : 'text-[#8e8e98]'
            }`}
          >
            <span className={`inline-flex items-center justify-center ${isMobileSheetOpen ? 'text-[#ff4500]' : 'text-[#8e8e98]'}`}>
              <IconDialpad size={18} />
            </span>
            <span className="text-[10px] mt-1 leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
