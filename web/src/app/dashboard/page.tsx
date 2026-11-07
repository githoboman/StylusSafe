'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'motion/react';
import { SignModal } from '@/components/SignModal';
import { FundWalletModal } from '@/components/FundWalletModal';
import { SendModal } from '@/components/SendModal';
import { ImportTokenModal } from '@/components/ImportTokenModal';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';
import { IconSwap, IconShield, IconSend, IconArrowRight, IconArrowUpRight, IconFingerprint } from '@/components/Icons';

const CHAINS = [
  { name: 'Arbitrum Sepolia', id: 421614 },
  { name: 'Base', id: 8453 },
  { name: 'Optimism', id: 10 },
  { name: 'Polygon', id: 137 },
  { name: 'Ethereum', id: 1 },
];

export default function Dashboard() {
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  const [selectedChain, setSelectedChain] = useState(421614);
  const { address, register, disconnect, login } = useInvisibleWallet();
  const { usdgBalance, ethBalance, usdcBalance, customTokens, isFetching, addCustomToken } = useBalances(address, selectedChain);

  const handleImportToken = (addr: string) => {
    addCustomToken(addr);
  };

  const usdgValue = parseFloat((usdgBalance || '0').replace(/,/g, '')) * 1.0;
  const usdcValue = parseFloat((usdcBalance || '0').replace(/,/g, '')) * 1.0;
  const netWorth = (usdgValue + usdcValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 md:p-10 w-full max-w-6xl mx-auto space-y-8"
    >

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Treasury Vault
          </h1>
          <p className="text-sm text-[#8e8e98] mt-1">
            {address ? (
              <span className="flex items-center gap-2 flex-wrap font-mono text-xs">
                <span>Account: <strong className="text-white">{address}</strong></span>
                <button
                  type="button"
                  onClick={disconnect}
                  title="Disconnect"
                  className="text-red-400 hover:underline text-[11px]"
                >
                  [disconnect]
                </button>
              </span>
            ) : (
              'Universal Intent & Multi-Chain Treasury Vault.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs">
          <div className="flex items-center gap-2 bg-[#141418] border border-white/[0.08] px-3 py-1.5 rounded-md font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${address ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
            <span className="text-white">
              {address ? 'RIP-7212 Enclave' : 'Disconnected'}
            </span>
          </div>

          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(Number(e.target.value))}
            className="h-8 bg-[#141418] border border-white/[0.08] rounded-md px-2 text-xs font-mono text-white outline-none cursor-pointer"
          >
            {CHAINS.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Consolidated Value Card */}
          <div className="bg-[#141418] border border-white/[0.08] rounded-xl p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8e8e98]">Consolidated Treasury Balance</span>
              {isFetching && (
                <span className="text-xs text-[#ff4500] font-mono">Syncing RPC...</span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-6xl font-bold font-mono tracking-tight text-white tabular-nums">
                ${address ? netWorth : '0.00'}
              </span>
              <span className="text-base font-mono text-[#8e8e98]">USDG</span>
            </div>

            {/* Asset Row */}
            <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-white/[0.06] text-xs">
              <div className="flex items-center gap-2 bg-[#0d0d10] px-3 py-1.5 rounded-md border border-white/[0.04]">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono font-medium text-white tabular-nums">{address ? usdgBalance : '0.00'} USDG</span>
                <span className="text-[10px] text-emerald-400 font-semibold">(Treasury)</span>
              </div>

              <div className="flex items-center gap-2 bg-[#0d0d10] px-3 py-1.5 rounded-md border border-white/[0.04]">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-mono font-medium text-white tabular-nums">{address ? usdcBalance : '0.00'} USDC</span>
              </div>

              <div className="flex items-center gap-2 bg-[#0d0d10] px-3 py-1.5 rounded-md border border-white/[0.04]">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="font-mono font-medium text-white tabular-nums">{address ? ethBalance : '0.00'} ETH</span>
              </div>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="text-xs text-[#8e8e98] hover:text-white ml-auto transition-colors"
              >
                + Import Token
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/transfer"
              className="h-11 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-md font-medium text-xs inline-flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
            >
              <IconSwap size={15} />
              <span>1-Click Swap</span>
            </Link>

            <Link
              href="/trading"
              className="h-11 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-md font-medium text-xs inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <IconShield size={15} className="text-emerald-400" />
              <span>Agent Firewall</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsFundModalOpen(true)}
              disabled={!address}
              className="h-11 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-white border border-white/[0.08] rounded-md font-medium text-xs inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <IconFingerprint size={15} className="text-blue-400" />
              <span>Receive</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSendModalOpen(true)}
              disabled={!address}
              className="h-11 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-white border border-white/[0.08] rounded-md font-medium text-xs inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <IconSend size={15} />
              <span>Send</span>
            </button>
          </div>

          {/* Connect Bar if Unconnected */}
          {!address && (
            <div className="p-6 bg-[#141418] rounded-xl border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">No Hardware Enclave Key Connected</h3>
                <p className="text-xs text-[#8e8e98] mt-0.5">Create a seedless vault in seconds via FaceID or TouchID.</p>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setIsSigningIn(false);
                    setIsSignModalOpen(true);
                  }}
                  className="h-9 px-4 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-md text-xs font-semibold transition-colors"
                >
                  Create Vault
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setIsSigningIn(true);
                    setIsSignModalOpen(true);
                  }}
                  className="h-9 px-4 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-md text-xs font-medium transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* Activity Placeholder */}
          <div className="bg-[#141418] border border-white/[0.08] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] text-xs">
              <span className="font-semibold text-white">Intent Stream &amp; Swaps</span>
              <Link href="/activity" className="text-[#ff4500] hover:underline">
                View Activity →
              </Link>
            </div>
            <div className="py-6 text-center text-xs text-[#8e8e98]">
              Ready for execution. Mined cross-chain swaps and agent operations will stream here.
            </div>
          </div>

        </div>

        {/* Right Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">

          {/* Agent Guardrails Widget */}
          <div className="bg-[#141418] border border-white/[0.08] rounded-xl p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="font-semibold text-white">Agent Guardrails</span>
              <span className="text-emerald-400 font-mono text-[11px]">Enforced</span>
            </div>

            <p className="text-[#8e8e98] leading-relaxed">
              Autonomous bots execute intents under immutable on-chain caps. Zero risk of total treasury drainage.
            </p>

            <div className="p-3 bg-[#0d0d10] rounded-md space-y-2 border border-white/[0.04]">
              <div className="flex justify-between text-[#8e8e98]">
                <span>Daily Limit:</span>
                <span className="text-white font-mono font-medium">$500.00 USDG</span>
              </div>
              <div className="flex justify-between text-[#8e8e98]">
                <span>Spent Today:</span>
                <span className="text-emerald-400 font-mono font-medium tabular-nums">$0.00 USDG</span>
              </div>
              <div className="flex justify-between text-[#8e8e98]">
                <span>Whitelisted:</span>
                <span className="text-white">Uniswap V3 / USDG</span>
              </div>
            </div>

            <Link
              href="/trading"
              className="w-full h-9 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-md font-medium text-xs inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <span>Manage Agent Policy</span>
              <IconArrowRight size={14} />
            </Link>
          </div>

          {/* 1-Click Cross Swap Quick Shortcut */}
          <div className="bg-[#141418] border border-white/[0.08] rounded-xl p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="font-semibold text-white">Cross-Chain Routing</span>
              <span className="text-[#ff4500] font-mono text-[11px]">Sponsored Gas</span>
            </div>

            <p className="text-[#8e8e98] leading-relaxed">
              Move assets from Arbitrum Sepolia into Base, Optimism, or Ethereum in one biometric touch.
            </p>

            <Link
              href="/transfer"
              className="w-full h-9 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-md font-medium text-xs inline-flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            >
              <span>Open Swap Terminal</span>
              <IconArrowUpRight size={14} />
            </Link>
          </div>

        </div>

      </div>

      <SignModal 
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        actionText={isRegistering ? "Enroll OpenBR Biometrics & Create Vault" : "Verify Owner Biometrics"}
        amountText="Free / Sponsored Gas"
        defaultMode="faceid"
        enrollmentMode={isRegistering}
        onSign={async (pin) => {
          if (isRegistering) {
            await register('stylussafe-vault', pin || undefined);
          } else {
            await login();
          }
        }}
      />

      <FundWalletModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        address={address}
      />

      <SendModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />

      <ImportTokenModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportToken}
      />
    </motion.div>
  );
}
