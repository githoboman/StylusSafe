'use client';

import { useState } from 'react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { SignModal } from '@/components/SignModal';
import Link from 'next/link';

export default function IntentsPage() {
  const { executeIntentBatch } = useInvisibleWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');

  const handleExecute = async (pin: string) => {
    setStatus('authorizing');
    try {
      const result = await executeIntentBatch([
        { dest: '0x1234567890123456789012345678901234567890', value: 0n, func: '0x' },
        { dest: '0x0987654321098765432109876543210987654321', value: 0n, func: '0x' }
      ], pin);
      if (!result) throw new Error("Failed to execute batch");
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
          <h1 className="text-3xl md:text-5xl font-semibold text-text-primary tracking-tight mb-2">Intent Batching</h1>
          <p className="text-text-muted max-w-xl">Compile multiple contract calls into a single atomic execution payload. Signed once, executed sequentially.</p>
        </div>
      </div>

      <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500 delay-150 z-10">
            <div className="w-24 h-24 rounded-full bg-surface-container border border-border-whisper flex items-center justify-center text-text-primary">
              <span className="material-symbols-outlined text-[48px] text-accent-orange">check_circle</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-2">Batch Executed</h2>
              <p className="text-text-muted max-w-sm mx-auto">Payload resolved and settled on-chain atomically.</p>
            </div>
            <Link href="/" className="mt-4 h-12 px-8 bg-surface-container hover:bg-surface-container-high rounded-[8px] font-medium text-text-primary flex items-center justify-center transition-all border border-border-whisper">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8 w-full max-w-md z-10">
            
            <div className="w-full bg-surface-zinc rounded-2xl p-6 border border-border-whisper relative">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium text-text-primary">Action Builder</h3>
                <button className="text-xs text-accent-orange flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-[14px]">add</span> Add Action
                </button>
              </div>

              <div className="space-y-4">
                {/* Action 1 */}
                <div className="flex flex-col gap-3 p-4 bg-surface-container-low border border-border-whisper rounded-[4px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-text-muted bg-surface-container border border-border-whisper px-2 py-0.5 rounded-[2px]">Action 1</span>
                    <span className="material-symbols-outlined text-[16px] text-text-muted cursor-pointer hover:text-error transition-colors">close</span>
                  </div>
                  <select className="w-full h-10 bg-surface-zinc border border-border-whisper rounded-[4px] text-sm text-text-primary outline-none focus:border-accent-orange px-2">
                    <option value="swap">Swap Tokens (Across Protocol)</option>
                    <option value="deposit">Deposit to Yield (Aave)</option>
                    <option value="transfer">Transfer</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <input type="number" defaultValue="500" className="flex-1 h-10 bg-surface-zinc border border-border-whisper rounded-[4px] font-mono text-sm px-3 text-text-primary outline-none focus:border-accent-orange" placeholder="Amount" />
                    <select className="w-24 h-10 bg-surface-zinc border border-border-whisper rounded-[4px] font-mono text-sm px-2 text-text-primary outline-none focus:border-accent-orange">
                      <option>USDC</option>
                      <option>ETH</option>
                    </select>
                  </div>
                </div>

                {/* Action 2 */}
                <div className="flex flex-col gap-3 p-4 bg-surface-container-low border border-border-whisper rounded-[4px] relative">
                  {/* Visual connection line */}
                  <div className="absolute -top-4 left-6 w-[1px] h-4 bg-border-whisper" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-text-muted bg-surface-container border border-border-whisper px-2 py-0.5 rounded-[2px]">Action 2</span>
                    <span className="material-symbols-outlined text-[16px] text-text-muted cursor-pointer hover:text-error transition-colors">close</span>
                  </div>
                  <select className="w-full h-10 bg-surface-zinc border border-border-whisper rounded-[4px] text-sm text-text-primary outline-none focus:border-accent-orange px-2">
                    <option value="deposit">Deposit to Yield (Aave)</option>
                    <option value="swap">Swap Tokens (Across Protocol)</option>
                    <option value="transfer">Transfer</option>
                  </select>
                  <div className="flex items-center bg-surface-zinc border border-border-whisper rounded-[4px] px-3 h-10">
                    <span className="text-sm text-text-primary font-mono opacity-50">100% of Action 1 Output (WETH)</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full h-14 bg-accent-orange hover:bg-accent-orange/90 active:translate-y-[1px] transition-all rounded-[4px] flex items-center justify-center gap-2 font-semibold text-base text-white"
            >
              Execute Batch
            </button>
            
          </div>
        )}
      </div>

      <SignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText="Execute 2 Actions"
        amountText="Gas only"
        onSign={handleExecute}
      />
    </div>
  );
}
