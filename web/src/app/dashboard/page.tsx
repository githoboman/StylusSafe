'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SignModal } from '@/components/SignModal';
import { FundWalletModal } from '@/components/FundWalletModal';
import { SendModal } from '@/components/SendModal';
import { ImportTokenModal } from '@/components/ImportTokenModal';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';

const CHAINS = [
  { name: 'Arbitrum Sepolia', id: 421614, color: '#12AAFF' },
  { name: 'Base', id: 8453, color: '#0052FF' },
  { name: 'Optimism', id: 10, color: '#FF0420' },
  { name: 'Polygon', id: 137, color: '#8247E5' },
  { name: 'Ethereum', id: 1, color: '#627EEA' },
];

export default function Dashboard() {
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  const [selectedChain, setSelectedChain] = useState(421614);
  const { address, register, signAuthEntry, disconnect, login } = useInvisibleWallet();
  const { usdgBalance, ethBalance, usdcBalance, customTokens, isFetching, addCustomToken } = useBalances(address, selectedChain);

  const handleImportToken = (addr: string) => {
    addCustomToken(addr);
  };

  // Calculate Net Worth with USDG as native stable token ($1.00 USD)
  const usdgValue = parseFloat((usdgBalance || '0').replace(/,/g, '')) * 1.0;
  const usdcValue = parseFloat((usdcBalance || '0').replace(/,/g, '')) * 1.0;
  const netWorth = (usdgValue + usdcValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 md:p-10 w-full max-w-7xl mx-auto flex flex-col gap-8 md:gap-10 animate-in fade-in duration-300">

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
              Multi-Chain Treasury Vault
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              Hardware Enclave Protected
            </span>
          </div>
          <p className="text-text-muted text-sm mt-1">
            {address ? (
              <span className="flex items-center gap-2 flex-wrap font-mono text-xs">
                <span>Account: <strong className="text-text-primary">{address}</strong></span>
                <button
                  onClick={disconnect}
                  title="Disconnect"
                  className="text-red-400 hover:underline uppercase text-[10px]"
                >
                  [disconnect]
                </button>
              </span>
            ) : (
              'Universal Intent & Agent Treasury. Zero seed phrases.'
            )}
          </p>
        </div>

        {/* Network & Status Pills */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 bg-[#121216] border border-white/[0.08] px-3.5 py-2 rounded-xl text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${address ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
            <span className="text-text-primary font-medium">
              {address ? 'RIP-7212 Enclave Active' : 'Not Connected'}
            </span>
          </div>

          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(Number(e.target.value))}
            className="h-10 bg-[#121216] border border-white/[0.08] rounded-xl px-3 text-xs font-mono text-text-primary outline-none focus:border-accent-orange cursor-pointer"
          >
            {CHAINS.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Consolidated Treasury Card */}
          <div className="bg-[#111116] border border-white/[0.08] rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent-orange/10 rounded-full blur-[90px] pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-mono uppercase tracking-widest text-text-muted">
                Consolidated Portfolio Value
              </span>
              {isFetching && (
                <span className="flex items-center gap-1.5 text-xs font-mono text-accent-orange">
                  <span className="w-2 h-2 rounded-full bg-accent-orange animate-ping" />
                  Syncing RPC...
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3 my-4 relative z-10">
              <span className="text-5xl md:text-7xl font-bold font-mono tracking-tight text-text-primary">
                ${address ? netWorth : '0.00'}
              </span>
              <span className="text-lg font-mono text-text-muted">USDG</span>
            </div>

            {/* Asset Breakdown Row */}
            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-white/[0.06] relative z-10">
              <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-white/[0.06]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-sm font-semibold">{address ? usdgBalance : '0.00'} USDG</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold">Treasury</span>
              </div>

              <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-white/[0.06]">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="font-mono text-sm font-semibold">{address ? usdcBalance : '0.00'} USDC</span>
              </div>

              <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-white/[0.06]">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="font-mono text-sm font-semibold">{address ? ethBalance : '0.00'} ETH</span>
              </div>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="font-mono text-xs text-text-muted hover:text-accent-orange ml-auto transition-colors"
              >
                + Import Token
              </button>
            </div>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/transfer"
              className="h-14 bg-gradient-to-r from-accent-orange to-red-600 hover:from-accent-orange/90 hover:to-red-600/90 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-orange/20 transition-all hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-lg">sync_alt</span>
              1-Click Swap
            </Link>

            <Link
              href="/trading"
              className="h-14 bg-surface-container hover:bg-surface-container-high border border-white/[0.08] text-text-primary rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-lg text-emerald-400">shield</span>
              Agent Firewall
            </Link>

            <button
              onClick={() => setIsFundModalOpen(true)}
              disabled={!address}
              className="h-14 bg-surface-container hover:bg-surface-container-high disabled:opacity-40 border border-white/[0.08] text-text-primary rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-lg text-blue-400">qr_code</span>
              Receive
            </button>

            <button
              onClick={() => setIsSendModalOpen(true)}
              disabled={!address}
              className="h-14 bg-surface-container hover:bg-surface-container-high disabled:opacity-40 border border-white/[0.08] text-text-primary rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-lg">send</span>
              Send
            </button>
          </div>

          {/* Auth CTA if Not Connected */}
          {!address && (
            <div className="p-6 bg-gradient-to-r from-surface-zinc to-surface-container rounded-3xl border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">No Hardware Wallet Connected</h3>
                <p className="text-text-muted text-sm mt-1">Create a seedless vault in 2 seconds with TouchID or FaceID.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsRegistering(true);
                    setIsSigningIn(false);
                    setIsSignModalOpen(true);
                  }}
                  className="h-11 px-6 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
                >
                  Create Vault
                </button>
                <button
                  onClick={() => {
                    setIsRegistering(false);
                    setIsSigningIn(true);
                    setIsSignModalOpen(true);
                  }}
                  className="h-11 px-6 bg-surface-container hover:bg-surface-container-high border border-white/[0.1] rounded-xl text-sm font-semibold transition-all"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* Recent Intents & Swaps Feed */}
          <div className="bg-[#111116] border border-white/[0.08] rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                Live Intent Stream &amp; Swaps
              </span>
              <Link href="/activity" className="text-xs font-mono text-accent-orange hover:underline">
                View All Activity →
              </Link>
            </div>

            <div className="p-8 text-center bg-black/30 rounded-2xl border border-dashed border-white/[0.08] space-y-2">
              <span className="material-symbols-outlined text-text-muted text-3xl">swap_calls</span>
              <h4 className="text-sm font-semibold text-text-primary">Ready for 1-Click Execution</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Execute cross-chain swaps or delegate trading tasks to AI agents. Your transaction receipts will stream here in real time.
              </p>
            </div>
          </div>

        </div>

        {/* Right Column (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Agent Firewall Guardrail Widget */}
          <div className="bg-[#111116] border border-white/[0.08] rounded-3xl p-6 space-y-4 font-mono text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-semibold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-base">shield</span>
                Agent Guardrails
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                ACTIVE
              </span>
            </div>

            <p className="text-text-muted text-[11px] leading-relaxed">
              Autonomous bots can trade within strict on-chain limits. Zero risk of complete wallet drainage.
            </p>

            <div className="p-3 bg-black/40 rounded-xl border border-white/[0.04] space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-text-muted">Daily Spend Limit:</span>
                <span className="text-text-primary font-bold">$500.00 USDG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Spent Today:</span>
                <span className="text-emerald-400 font-bold">$0.00 USDG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Target Allowlist:</span>
                <span className="text-text-primary">Uniswap V3 / USDG</span>
              </div>
            </div>

            <Link
              href="/trading"
              className="w-full h-10 bg-surface-container hover:bg-surface-container-high border border-white/[0.08] text-text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>Manage Agent Policies</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {/* Cross-Chain Quick Swap Shortcut */}
          <div className="bg-[#111116] border border-white/[0.08] rounded-3xl p-6 space-y-4 font-mono text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-semibold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-orange text-base">sync_alt</span>
                1-Click Cross Swap
              </span>
              <span className="text-[10px] text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded border border-accent-orange/20 font-semibold">
                Gasless
              </span>
            </div>

            <p className="text-text-muted text-[11px] leading-relaxed">
              Move funds from Arbitrum into Base, Optimism, or Ethereum instantly without bridging delays.
            </p>

            <Link
              href="/transfer"
              className="w-full h-10 bg-accent-orange/10 hover:bg-accent-orange/20 text-accent-orange border border-accent-orange/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>Open Swap Terminal</span>
              <span className="material-symbols-outlined text-sm">north_east</span>
            </Link>
          </div>

        </div>

      </div>

      <SignModal 
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        actionText={isRegistering ? "Register Hardware Passkey" : "Authenticate FaceID"}
        amountText="Free / Sponsored Gas"
        onSign={async (pin) => {
          if (isRegistering) {
            await register('stylussafe-vault', pin);
          } else {
            await login();
          }
          setIsSignModalOpen(false);
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
    </div>
  );
}
