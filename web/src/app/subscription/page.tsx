'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { SignModal } from '@/components/SignModal';
import Link from 'next/link';
import { IconArrowLeft, IconCheck, IconAutoRenew } from '@/components/Icons';

export default function SubscriptionPage() {
  const { setupDCA } = useInvisibleWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');

  const [merchantAddress, setMerchantAddress] = useState('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
  const [amountInput, setAmountInput] = useState('15.00');
  const [frequency, setFrequency] = useState(30);

  const handleSubscribe = async (pin: string) => {
    setStatus('authorizing');
    try {
      const amountRaw = BigInt(Math.floor(parseFloat(amountInput) * 1e6));
      const result = await setupDCA(merchantAddress as `0x${string}`, amountRaw, frequency, pin);
      if (!result) throw new Error("Failed to setup subscription");
      setStatus('success');
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
      <div className="flex items-center gap-4 border-b border-white/[0.08] pb-6">
        <Link href="/" className="w-9 h-9 rounded-lg bg-surface-container inline-flex items-center justify-center hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary border border-white/[0.06] shrink-0" title="Back">
          <IconArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight mb-1">Pull Payments</h1>
          <p className="text-text-muted text-sm max-w-xl">Configure automated, recurring on-chain transfers. No manual signatures required after setup.</p>
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
              <div className="text-center">
                <h2 className="text-2xl font-bold text-text-primary mb-2">Subscription Active</h2>
                <p className="text-text-muted max-w-sm mx-auto text-sm">{amountInput} USDC will be pulled automatically every {frequency} days.</p>
              </div>
              <Link href="/" className="mt-4 h-11 px-8 bg-surface-container hover:bg-surface-container-high rounded-lg font-medium text-text-primary flex items-center justify-center transition-all border border-border-whisper text-xs">
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
              <div className="w-full bg-[#141418] rounded-2xl p-6 border border-white/[0.08] relative space-y-4">
                <div className="space-y-4 text-xs font-mono">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Merchant Contract / Address</label>
                    <div className="flex items-center bg-[#0d0d10] border border-white/[0.08] rounded-lg px-3 focus-within:border-[#ff4500] transition-colors">
                      <input 
                        type="text" 
                        value={merchantAddress}
                        onChange={(e) => setMerchantAddress(e.target.value)}
                        className="w-full h-11 bg-transparent outline-none text-text-primary font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Recurring Amount</label>
                    <div className="flex items-center bg-[#0d0d10] border border-white/[0.08] rounded-lg px-3 focus-within:border-[#ff4500] transition-colors">
                      <span className="text-text-muted font-mono mr-1">$</span>
                      <input 
                        type="number" 
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        className="w-full h-11 bg-transparent outline-none text-text-primary font-mono text-sm"
                      />
                      <span className="text-xs text-text-muted uppercase tracking-widest">USDG</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Billing Frequency</label>
                    <select 
                      value={frequency}
                      onChange={(e) => setFrequency(Number(e.target.value))}
                      className="w-full h-11 bg-[#0d0d10] border border-white/[0.08] rounded-lg px-3 text-text-primary outline-none focus:border-[#ff4500] transition-colors font-mono text-xs"
                    >
                      <option value="30">Monthly (Every 30 Days)</option>
                      <option value="7">Weekly (Every 7 Days)</option>
                      <option value="365">Yearly (Every 365 Days)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                disabled={status === 'authorizing'}
                className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] transition-all rounded-lg flex items-center justify-center gap-2 font-semibold text-sm text-white shadow-lg shadow-[#ff4500]/20 disabled:opacity-50"
              >
                {status === 'authorizing' ? (
                  <span className="inline-flex items-center gap-2 font-mono">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing Subscription...</span>
                  </span>
                ) : (
                  <>
                    <IconAutoRenew size={16} />
                    <span>Setup Automated Subscription</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText="Setup Subscription"
        amountText={`${amountInput} USDG / ${frequency} Days`}
        onSign={handleSubscribe}
      />
    </motion.div>
  );
}