'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SignModal } from '@/components/SignModal';
import { SessionKeyCard } from '@/components/SessionKeyCard';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { IntentBatchCard } from '@/components/IntentBatchCard';
import { FundWalletModal } from '@/components/FundWalletModal';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';

export default function Dashboard() {
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  const { address, register, signAuthEntry } = useInvisibleWallet();
  const { ethBalance, usdcBalance, isFetching } = useBalances(address);

  // Approximate Net Worth for demo purposes
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
              <span className="font-mono text-sm break-all">Wallet: {address}</span>
            ) : (
              'Manage your cross-chain assets securely without seed phrases.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-[4px] shrink-0 border border-border-whisper self-start md:self-auto">
          <span className={`w-2 h-2 rounded-full ${address ? 'bg-accent-azure' : 'bg-error'}`}></span>
          <span className="font-mono text-[11px] text-text-primary uppercase tracking-wider">
            {address ? '3 of 5 Policy Active' : 'Unregistered'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left column — 8 cols */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Net Worth card */}
          <div className="bg-surface-zinc rounded-[24px] p-8 md:p-10 border border-border-whisper">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted uppercase tracking-widest font-medium">Consolidated Net Worth</span>
              {isFetching && <span className="w-4 h-4 border-2 border-accent-azure border-t-transparent rounded-full animate-spin"></span>}
            </div>
            
            <div className="flex items-baseline gap-3 my-4">
              <span className="text-5xl md:text-7xl text-text-primary tracking-tight font-semibold">
                ${address ? netWorth : '0.00'}
              </span>
              <span className="font-mono text-lg text-text-muted">USD</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-border-whisper">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[2px] bg-accent-azure"></span>
                <span className="font-mono text-base text-text-primary">{address ? ethBalance : '0.00'} ETH</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[2px] bg-text-muted"></span>
                <span className="font-mono text-base text-text-primary">{address ? usdcBalance : '0.00'} USDC</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/transfer"
              className={`h-14 px-6 rounded-[4px] flex items-center justify-center gap-3 transition-all font-medium text-base shadow-sm
                ${address ? 'bg-accent-azure hover:bg-accent-azure/90 text-white' : 'bg-surface-container text-text-muted cursor-not-allowed pointer-events-none'}`}
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
                  className="h-14 px-6 flex-1 bg-accent-azure hover:bg-accent-azure/90 rounded-[4px] flex items-center justify-center gap-3 transition-all text-white font-semibold text-base shadow-sm"
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
              <div className="flex gap-4">
                <button
                  onClick={() => setIsFundModalOpen(true)}
                  className="h-14 px-4 flex-1 bg-surface-container hover:bg-surface-container-high rounded-[4px] flex items-center justify-center gap-2 transition-all text-text-primary font-medium text-sm md:text-base border border-border-whisper shadow-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">qr_code</span>
                  Fund
                </button>
                <button
                  onClick={() => {
                    setIsRegistering(false);
                    setIsSigningIn(false);
                    setIsSignModalOpen(true);
                  }}
                  className="h-14 px-4 flex-[2] bg-surface-container hover:bg-surface-container-high rounded-[4px] flex items-center justify-center gap-2 transition-all text-text-primary font-medium text-sm md:text-base border border-border-whisper shadow-sm"
                  type="button"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-azure opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-azure"></span>
                  </span>
                  Sign Pending
                  <span className="font-mono text-xs text-white bg-accent-azure px-2 py-0.5 rounded-[4px] ml-1">2</span>
                </button>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          {address && (
            <div className="bg-surface-zinc rounded-[24px] p-6 border border-border-whisper mt-2">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-sm text-text-muted uppercase tracking-widest font-medium">Recent Activity</span>
                <Link href="/activity" className="text-xs text-accent-azure hover:underline">View All</Link>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3 hover:bg-surface-container rounded-xl transition-colors cursor-pointer border border-transparent hover:border-border-whisper">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent-azure/10 text-accent-azure flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-primary">Cross-Chain Swap</h4>
                      <p className="text-xs text-text-muted">Arbitrum → Base</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-medium text-text-primary">-1.50 ETH</h4>
                    <p className="text-xs text-green-500 font-mono">Success</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 hover:bg-surface-container rounded-xl transition-colors cursor-pointer border border-transparent hover:border-border-whisper">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent-azure/10 text-accent-azure flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">autorenew</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-primary">Netflix Web3</h4>
                      <p className="text-xs text-text-muted">Pull Payment</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-medium text-text-primary">-15.00 USDC</h4>
                    <p className="text-xs text-green-500 font-mono">Success</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 hover:bg-surface-container rounded-xl transition-colors cursor-pointer border border-transparent hover:border-border-whisper">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">south_west</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-primary">Receive</h4>
                      <p className="text-xs text-text-muted">From 0x71C...9A23</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-medium text-green-500">+4,500.00 USDC</h4>
                    <p className="text-xs text-text-muted font-mono">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              <span className="material-symbols-outlined text-[20px] text-accent-azure">verified_user</span>
              <span className="font-mono text-sm">Rust-WASM Verified</span>
            </div>
            <span className="font-mono text-xs text-accent-azure bg-accent-azure/10 px-2 py-1 rounded-[4px]">Stylus 0.5.2</span>
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
            // Simulate a sign-in recovery delay
            await new Promise(r => setTimeout(r, 1000));
            // In a real app, we'd fetch the address via indexer from the Passkey ID
            alert("Sign In Simulated!");
          } else {
            // Mock a 32-byte hash payload to sign
            const dummyPayload = new Uint8Array(32);
            crypto.getRandomValues(dummyPayload);
            await signAuthEntry(dummyPayload, pin);
          }
        }}
      />
    </div>
  );
}
