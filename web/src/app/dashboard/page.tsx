'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SignModal } from '@/components/SignModal';
import { SessionKeyCard } from '@/components/SessionKeyCard';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { IntentBatchCard } from '@/components/IntentBatchCard';
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
  const { ethBalance, usdcBalance, customTokens, isFetching, addCustomToken } = useBalances(address, selectedChain);

  const handleImportToken = (addr: string) => {
    addCustomToken(addr);
  };

  // Calculate Net Worth
  const ethValue = parseFloat(ethBalance.replace(/,/g, '')) * 3000;
  const usdcValue = parseFloat(usdcBalance.replace(/,/g, ''));
  const netWorth = (ethValue + usdcValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 md:p-10 w-full max-w-7xl mx-auto flex flex-col gap-8 md:gap-12">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-semibold text-text-primary tracking-tight mb-2">Portfolio Overview</h1>
          <p className="text-text-muted">
            {address ? (
              <span className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm break-all">Wallet: {address}</span>
                <button
                  onClick={disconnect}
                  title="Disconnect wallet"
                  className="font-mono text-[11px] text-text-muted hover:text-error transition-colors uppercase tracking-wider"
                >
                  [disconnect]
                </button>
              </span>
            ) : (
              'Manage your cross-chain assets securely without seed phrases.'
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3 self-start md:self-auto">
          <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-[4px] border border-border-whisper">
            <span className={`w-2 h-2 rounded-full ${address ? 'bg-accent-orange' : 'bg-error'}`}></span>
            <span className="font-mono text-[11px] text-text-primary uppercase tracking-wider">
              {address ? '3 of 5 Policy Active' : 'Unregistered'}
            </span>
          </div>
          
          <div className="relative group">
            <div className="flex items-center justify-between gap-3 bg-surface-container border border-border-whisper text-text-primary px-3 py-2 rounded-[4px] cursor-pointer hover:border-text-muted transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHAINS.find(c => c.id === selectedChain)?.color }}></span>
                <span className="font-mono text-[11px] uppercase tracking-wider">{CHAINS.find(c => c.id === selectedChain)?.name}</span>
              </div>
              <span className="material-symbols-outlined text-[14px] text-text-muted">expand_more</span>
            </div>
            
            <div className="absolute right-0 top-full mt-1 w-full min-w-[160px] bg-surface-container-high border border-border-whisper rounded-[4px] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
              {CHAINS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChain(c.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-zinc transition-colors ${selectedChain === c.id ? 'bg-surface-zinc' : ''}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></span>
                  <span className="font-mono text-[11px] text-text-primary uppercase tracking-wider">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left column — 8 cols */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Net Worth card */}
          <div className="bg-surface-zinc rounded-[24px] p-8 md:p-10 border border-border-whisper">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted uppercase tracking-widest font-medium">Consolidated Net Worth</span>
              {isFetching && <span className="w-4 h-4 border-2 border-accent-orange border-t-transparent rounded-full animate-spin"></span>}
            </div>
            
            <div className="flex items-baseline gap-3 my-4">
              <span className="text-5xl md:text-7xl text-text-primary tracking-tight font-semibold">
                ${address ? netWorth : '0.00'}
              </span>
              <span className="font-mono text-lg text-text-muted">USD</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-border-whisper">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[2px] bg-accent-orange"></span>
                <span className="font-mono text-base text-text-primary">{address ? ethBalance : '0.00'} ETH</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[2px] bg-text-muted"></span>
                <span className="font-mono text-base text-text-primary">{address ? usdcBalance : '0.00'} USDC</span>
              </div>
              {customTokens.map(t => (
                <div key={t.address} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[2px] border border-text-muted/30"></span>
                  <span className="font-mono text-base text-text-primary" title={t.address}>{t.balance} {t.symbol}</span>
                </div>
              ))}
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="font-mono text-[11px] text-text-muted hover:text-accent-orange uppercase tracking-wider underline underline-offset-4 ml-auto transition-colors"
              >
                + Import Token
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/transfer"
              className={`h-14 px-6 rounded-[4px] flex items-center justify-center gap-3 transition-all font-medium text-base shadow-sm
                ${address ? 'bg-accent-orange hover:bg-accent-orange/90 text-white' : 'bg-surface-container text-text-muted cursor-not-allowed pointer-events-none'}`}
            >
              <span className="material-symbols-outlined text-[20px]">swap_calls</span>
              Cross-Chain Swap
            </Link>
            
            {!address ? (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsRegistering(true);
                    setIsSigningIn(false);
                    setIsSignModalOpen(true);
                  }}
                  className="h-14 px-6 flex-1 bg-accent-orange hover:bg-accent-orange/90 rounded-[4px] flex items-center justify-center gap-3 transition-all text-white font-semibold text-base shadow-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  Create Wallet
                </button>
                <button
                  onClick={() => {
                    setIsRegistering(false);
                    setIsSigningIn(true);
                    setIsSignModalOpen(true);
                  }}
                  className="h-14 px-6 flex-1 bg-surface-container hover:bg-surface-container-high rounded-[4px] flex items-center justify-center gap-3 transition-all text-text-primary font-medium text-base border border-border-whisper shadow-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  Sign In
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setIsFundModalOpen(true)}
                  className="h-14 px-4 flex-1 min-w-[100px] bg-surface-container hover:bg-surface-container-high rounded-[4px] flex items-center justify-center gap-2 transition-all text-text-primary font-medium text-sm md:text-base border border-border-whisper shadow-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">qr_code</span>
                  Fund
                </button>
                <button
                  onClick={() => setIsSendModalOpen(true)}
                  className="h-14 px-4 flex-1 min-w-[100px] bg-surface-container hover:bg-surface-container-high rounded-[4px] flex items-center justify-center gap-2 transition-all text-text-primary font-medium text-sm md:text-base border border-border-whisper shadow-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  Send
                </button>
                <button
                  onClick={() => {
                    setIsRegistering(false);
                    setIsSigningIn(false);
                    setIsSignModalOpen(true);
                  }}
                  className="h-14 px-4 flex-[2] min-w-[180px] bg-surface-container hover:bg-surface-container-high rounded-[4px] flex items-center justify-center gap-2 transition-all text-text-primary font-medium text-sm md:text-base border border-border-whisper shadow-sm"
                  type="button"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-orange opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-orange"></span>
                  </span>
                  Sign Pending
                  <span className="font-mono text-xs text-white bg-accent-orange px-2 py-0.5 rounded-[4px] ml-1">2</span>
                </button>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-surface-zinc rounded-[24px] p-6 border border-border-whisper mt-2">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-sm text-text-muted uppercase tracking-widest font-medium">Recent Activity</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container/30 border border-dashed border-border-whisper rounded-xl">
              <span className="material-symbols-outlined text-text-muted text-4xl mb-3">receipt_long</span>
              <h4 className="text-sm font-medium text-text-primary mb-1">No Activity Yet</h4>
              <p className="text-xs text-text-muted">When you execute swaps or transfers, they will appear here.</p>
            </div>
          </div>

        </div>

        {/* Right column — 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          <h2 className="text-sm text-text-muted uppercase tracking-widest font-medium px-1">Advanced Capabilities</h2>

          <div className="flex flex-col gap-4">
            <SessionKeyCard />
            <SubscriptionCard />
            <IntentBatchCard />
          </div>

          <div className="p-5 bg-surface-container/30 rounded-[4px] flex items-center justify-between border border-border-whisper">
            <div className="flex items-center gap-3 text-text-muted">
              <span className="material-symbols-outlined text-[20px] text-accent-orange">verified_user</span>
              <span className="font-mono text-sm">Rust-WASM Verified</span>
            </div>
            <span className="font-mono text-xs text-accent-orange bg-accent-orange/10 px-2 py-1 rounded-[4px]">Stylus 0.5.2</span>
          </div>

        </div>
      </div>

      <SignModal 
        isOpen={isSignModalOpen} 
        onClose={() => setIsSignModalOpen(false)} 
        actionText={isRegistering ? "Create Wallet" : isSigningIn ? "Sign In" : "Sign Batch"}
        amountText={isRegistering ? "No cost" : isSigningIn ? "Recover Session" : "Pending..."}
        onSign={async (pin) => {
          if (isRegistering) {
            await register("StylusUser", pin);
          } else if (isSigningIn) {
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
