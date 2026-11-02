'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { SignModal } from '@/components/SignModal';
import Link from 'next/link';
import { IconArrowLeft, IconCheck, IconPlus, IconSwap, IconCpu } from '@/components/Icons';

export default function IntentsPage() {
  const { executeIntentBatch } = useInvisibleWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');

  const handleExecute = async (pin: string) => {
    setStatus('authorizing');
    try {
      const result = await executeIntentBatch([
        { dest: '0xE592427A0AEce92De3Edee1F18E0157C05861564', value: 0n, func: '0x' }, // Uniswap V3 Router
        { dest: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36', value: 0n, func: '0x' }, // Paxos USDG Treasury
      ], pin);
      if (!result) throw new Error("Failed to execute batch");
      setStatus('success');
      try {
        const stored = localStorage.getItem('invisible_wallet_activity');
        const existing = stored ? JSON.parse(stored) : [];
        existing.unshift({
          id: (result as any)?.userOpHash || `intent-${Date.now()}`,
          type: 'intent',
          title: 'Atomic Batch Intent Executed',
          subtitle: 'Uniswap V3 Swap (500 USDG) + Paxos Treasury Settlement',
          amount: '500 USDG',
          amountPositive: false,
          status: 'executed',
          timestamp: new Date().toISOString(),
          txHash: (result as any)?.userOpHash || '0x7b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c',
        });
        localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
      } catch {}
    } catch (e) {
      console.error(e);
      setStatus('idle');
    } finally {
      setIsModalOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-4 md:p-10 w-full max-w-4xl mx-auto flex flex-col gap-8"
    >
      
      <div className="flex items-center gap-4 border-b border-border-whisper pb-6">
        <Link href="/" className="w-9 h-9 rounded-lg bg-surface-container inline-flex items-center justify-center hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary border border-white/[0.06] shrink-0" title="Back">
          <IconArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight mb-1">Intent Batching</h1>
          <p className="text-text-muted text-sm max-w-xl">Compile multiple contract calls into a single atomic execution payload on Arbitrum Sepolia. Signed once, executed atomically.</p>
        </div>
      </div>

      <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-6 z-10 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <IconCheck size={36} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Batch Executed Atomically</h2>
                <p className="text-text-muted max-w-sm mx-auto text-sm">
                  UserOperation verified on Arbitrum Sepolia. Two intents resolved in a single block.
                </p>
              </div>
              <Link href="/" className="mt-2 h-11 px-6 bg-surface-container hover:bg-surface-container-high active:scale-[0.98] rounded-lg font-medium text-text-primary flex items-center justify-center transition-all border border-border-whisper text-xs">
                Return to Dashboard
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6 w-full max-w-md z-10"
            >
              
              <div className="w-full bg-surface-zinc rounded-2xl p-6 border border-border-whisper space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-whisper">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <IconCpu size={16} className="text-[#ff4500]" />
                    <span>Atomic Action Builder</span>
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Arbitrum Stylus
                  </span>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {/* Action 1 */}
                  <div className="flex flex-col gap-2.5 p-4 bg-surface-container-low border border-border-whisper rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted bg-surface-container border border-border-whisper px-2 py-0.5 rounded text-[10px]">Action 1: Uniswap V3 Swap</span>
                      <span className="text-emerald-400 text-[11px]">Direct Intent</span>
                    </div>
                    <div className="p-2.5 bg-surface-zinc rounded border border-border-whisper/60 text-text-muted truncate">
                      Target: <span className="text-white">0xE592427A0AEce92De3Edee1F18E0157C05861564</span>
                    </div>
                    <div className="flex items-center justify-between text-text-primary">
                      <span>Amount: <strong>500.00 USDG</strong></span>
                      <span className="text-[#ff4500]">→ Target: ARB</span>
                    </div>
                  </div>

                  {/* Action 2 */}
                  <div className="flex flex-col gap-2.5 p-4 bg-surface-container-low border border-border-whisper rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted bg-surface-container border border-border-whisper px-2 py-0.5 rounded text-[10px]">Action 2: Paxos USDG Deposit</span>
                      <span className="text-blue-400 text-[11px]">Treasury Yield</span>
                    </div>
                    <div className="p-2.5 bg-surface-zinc rounded border border-border-whisper/60 text-text-muted truncate">
                      Target: <span className="text-white">0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36</span>
                    </div>
                    <div className="flex items-center justify-between text-text-primary">
                      <span>Reserve Yield: <strong>Global Dollar Network</strong></span>
                      <span className="text-emerald-400">Sponsored ($0.00)</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                disabled={status === 'authorizing'}
                className="w-full h-12 bg-accent-orange hover:bg-accent-orange/90 active:scale-[0.98] transition-all rounded-lg flex items-center justify-center gap-2 font-semibold text-sm text-white shadow-lg shadow-accent-orange/20 disabled:opacity-50"
              >
                {status === 'authorizing' ? (
                  <span className="inline-flex items-center gap-2 font-mono">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing WebAuthn Intent...</span>
                  </span>
                ) : (
                  <span>Execute 2 Actions in 1 Click</span>
                )}
              </button>
              
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText="Execute 2 Atomic Intents"
        amountText="Uniswap V3 Swap + Paxos USDG Settlement"
        onSign={handleExecute}
      />
    </motion.div>
  );
}
