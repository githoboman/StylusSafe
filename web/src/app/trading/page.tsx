'use client';

import { useState } from 'react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { SignModal } from '@/components/SignModal';
import Link from 'next/link';

export default function TradingPage() {
  const { createSessionKey } = useInvisibleWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');

  const handleAuthorize = async (pin: string) => {
    setStatus('authorizing');
    try {
      await createSessionKey(4, pin);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('idle');
    } finally {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="p-4 md:p-10 w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      <div className="flex items-center gap-4 border-b border-border-whisper pb-6">
        <Link href="/" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-3xl md:text-5xl font-semibold text-text-primary tracking-tight mb-2">1-Click Trading</h1>
          <p className="text-text-muted max-w-xl">Configure a session key. This permits automated signature generation for specified targets without continuous manual approval.</p>
        </div>
      </div>

      <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500 delay-150">
            <div className="w-24 h-24 rounded-full bg-surface-container border border-border-whisper flex items-center justify-center text-text-primary">
              <span className="material-symbols-outlined text-[48px] text-accent-azure">check_circle</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-2">Session Key Issued</h2>
              <p className="text-text-muted max-w-sm mx-auto">Policy written to registry. Session expires in 4 hours.</p>
            </div>
            <Link href="/" className="mt-4 h-12 px-8 bg-surface-container hover:bg-surface-container-high rounded-[8px] font-medium text-text-primary flex items-center justify-center transition-all border border-border-whisper">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8 w-full max-w-md z-10">
            
            <div className="w-full bg-surface-zinc rounded-2xl p-6 border border-border-whisper relative">
              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-primary">Target Contract</label>
                  <select className="w-full h-12 bg-surface-container-low border border-border-whisper rounded-[4px] px-4 text-text-primary outline-none focus:border-accent-azure transition-colors">
                    <option value="uniswap">Uniswap V3 Router</option>
                    <option value="gmx">GMX V2 Exchange</option>
                    <option value="aave">Aave V3 Pool</option>
                    <option value="cowswap">CoW Swap Settlement</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-primary">Spending Cap</label>
                  <div className="flex items-center bg-surface-container-low border border-border-whisper rounded-[4px] px-4 focus-within:border-accent-azure transition-colors">
                    <span className="text-text-muted font-mono">$</span>
                    <input 
                      type="number" 
                      defaultValue="500" 
                      className="w-full h-12 bg-transparent outline-none px-2 text-text-primary font-mono"
                    />
                    <span className="text-xs text-text-muted uppercase tracking-widest">USDC</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-primary">Session Expiry</label>
                  <select defaultValue="4" className="w-full h-12 bg-surface-container-low border border-border-whisper rounded-[4px] px-4 text-text-primary outline-none focus:border-accent-azure transition-colors font-mono">
                    <option value="1">1 Hour</option>
                    <option value="4">4 Hours</option>
                    <option value="24">24 Hours</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full h-14 bg-accent-azure hover:bg-accent-azure/90 active:translate-y-[1px] transition-all rounded-[4px] flex items-center justify-center gap-2 font-semibold text-base text-white"
            >
              Issue Session Key
            </button>
            
          </div>
        )}
      </div>

      <SignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText="Issue Session Key"
        amountText="No cost"
        onSign={handleAuthorize}
      />
    </div>
  );
}
