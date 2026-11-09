'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SignModal } from '@/components/SignModal';
import { FundWalletModal } from '@/components/FundWalletModal';
import { SendModal } from '@/components/SendModal';
import { ImportTokenModal } from '@/components/ImportTokenModal';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';
import {
  IconSwap,
  IconShield,
  IconSend,
  IconArrowRight,
  IconFingerprint,
} from '@/components/Icons';

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

  const [selectedChain, setSelectedChain] = useState(421614);
  const { address, register, disconnect, login } = useInvisibleWallet();
  const {
    usdgBalance,
    ethBalance,
    usdcBalance,
    isFetching,
    addCustomToken,
  } = useBalances(address, selectedChain);

  const handleImportToken = (addr: string) => {
    addCustomToken(addr);
  };

  const usdgValue = parseFloat((usdgBalance || '0').replace(/,/g, '')) * 1.0;
  const usdcValue = parseFloat((usdcBalance || '0').replace(/,/g, '')) * 1.0;
  const netWorth = (usdgValue + usdcValue).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const shortAddr = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '';

  return (
    <div className="p-5 sm:p-8 md:p-12 w-full max-w-5xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08] w-full">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            My Biometric Wallet
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            {address ? (
              <span className="flex items-center gap-3 flex-wrap font-mono text-xs sm:text-sm">
                <span className="text-zinc-300">{shortAddr}</span>
                <button
                  type="button"
                  onClick={disconnect}
                  className="text-zinc-400 hover:text-white underline text-xs"
                >
                  Lock Wallet
                </button>
              </span>
            ) : (
              'Protected by your face & fingerprint — zero recovery words to remember.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto text-xs">
          <div className="flex items-center gap-2 bg-[#141418] border border-white/[0.08] px-3.5 py-2 rounded-lg font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                address ? 'bg-[#ff4500]' : 'bg-zinc-500'
              }`}
            />
            <span className="text-zinc-200">
              {address ? 'Unlocked (RIP-7212)' : 'Locked'}
            </span>
          </div>

          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(Number(e.target.value))}
            className="h-9 bg-[#141418] border border-white/[0.08] rounded-lg px-3 text-xs font-mono text-white outline-none cursor-pointer"
          >
            {CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Unlock / Create Prompt (Shown when locked) */}
      {!address && (
        <div className="p-6 sm:p-8 bg-[#141418] rounded-2xl border border-white/[0.1] flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Unlock or Create Your Wallet with Face &amp; Fingerprint
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Scan your face and touch your fingerprint sensor to create your smart vault and receive{' '}
              <strong className="text-white font-semibold">$1,000.00 in free test USDG</strong>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setIsSignModalOpen(true);
              }}
              className="h-11 px-5 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Create New Wallet
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setIsSignModalOpen(true);
              }}
              className="h-11 px-5 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
            >
              Unlock Existing
            </button>
          </div>
        </div>
      )}

      {/* Main Balance Card */}
      <div className="bg-[#141418] border border-white/[0.08] rounded-3xl p-6 sm:p-10 space-y-8 w-full">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-zinc-400">
              Total Balance (Digital Dollars)
            </span>
            {isFetching && (
              <span className="text-xs text-zinc-400 font-mono">
                Updating...
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl sm:text-6xl font-bold font-mono tracking-tight text-white tabular-nums">
              ${address ? netWorth : '0.00'}
            </span>
            <span className="text-base sm:text-lg font-mono text-zinc-400">
              USDG
            </span>
          </div>
        </div>

        {/* Clean Token Balances */}
        <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/[0.06] text-xs sm:text-sm">
          <div className="flex items-center gap-2 bg-[#0d0d10] px-3.5 py-2 rounded-xl border border-white/[0.06]">
            <span className="font-mono font-semibold text-white tabular-nums">
              {address ? usdgBalance : '0.00'} USDG
            </span>
            <span className="text-xs text-zinc-400">Paxos</span>
          </div>

          <div className="flex items-center gap-2 bg-[#0d0d10] px-3.5 py-2 rounded-xl border border-white/[0.06]">
            <span className="font-mono font-semibold text-white tabular-nums">
              {address ? usdcBalance : '0.00'} USDC
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#0d0d10] px-3.5 py-2 rounded-xl border border-white/[0.06]">
            <span className="font-mono font-semibold text-white tabular-nums">
              {address ? ethBalance : '0.00'} ETH
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs sm:text-sm text-zinc-400 hover:text-white sm:ml-auto transition-colors px-2 py-1"
          >
            + Add Token
          </button>
        </div>

        {/* 4 Spacious Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <Link
            href="/transfer"
            className="h-12 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            <IconSwap size={16} />
            <span>Swap / Bridge</span>
          </Link>

          <Link
            href="/trading"
            className="h-12 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-xl font-medium text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <IconShield size={16} className="text-zinc-300" />
            <span>AI Limits</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsFundModalOpen(true)}
            disabled={!address}
            className="h-12 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-white border border-white/[0.08] rounded-xl font-medium text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <IconFingerprint size={16} className="text-zinc-300" />
            <span>Receive</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSendModalOpen(true)}
            disabled={!address}
            className="h-12 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-white border border-white/[0.08] rounded-xl font-medium text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <IconSend size={16} />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Bottom 2-Card Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* AI Allowance Summary */}
        <div className="bg-[#141418] border border-white/[0.08] rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white">
                AI Helper Allowance
              </h3>
              <span className="text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
                $500 / day
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Give an automated helper a safe daily spending cap and choose which apps it can use.
            </p>
          </div>

          <Link
            href="/trading"
            className="h-11 px-4 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-xl font-medium text-sm inline-flex items-center justify-between transition-all"
          >
            <span>Manage AI Allowance Rules</span>
            <IconArrowRight size={15} />
          </Link>
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-[#141418] border border-white/[0.08] rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Activity &amp; Security Keys
              </h3>
              <span className="text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
                Arbitrum L2
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Review your recent transfers or add a backup hardware passkey to your vault.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/activity"
              className="h-11 px-4 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-xl font-medium text-sm inline-flex items-center justify-center transition-all"
            >
              View History
            </Link>
            <Link
              href="/security"
              className="h-11 px-4 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-xl font-medium text-sm inline-flex items-center justify-center transition-all"
            >
              Biometric Keys
            </Link>
          </div>
        </div>
      </div>

      <SignModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        actionText={
          isRegistering
            ? 'Scan Face & Fingerprint to Create Wallet'
            : 'Scan Face & Fingerprint to Unlock Wallet'
        }
        amountText="$0.00 Gas Fee (Sponsored)"
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
    </div>
  );
}
