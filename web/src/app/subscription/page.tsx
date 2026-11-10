'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances, USDG_ADDRESS } from '@/hooks/useBalances';
import { SignModal } from '@/components/SignModal';
import Link from 'next/link';
import { IconArrowLeft, IconCheck, IconAutoRenew, IconArrowUpRight } from '@/components/Icons';

type SavedSubscription = {
  id: string;
  label: string;
  merchant: string;
  amount: string;
  frequencyDays: number;
  createdAt: string;
  lastChargedAt?: string;
  txHash: string;
};

const PRESET_MERCHANTS = [
  { label: 'Arbitrum RPC Node Plan', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', amount: '15.00', days: 30 },
  { label: 'AI Trading Signal Feed', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', amount: '25.00', days: 30 },
  { label: 'Weekly Savings Vault', address: '0xFE5759aA7C45421b773E937B7B4aea2E21adD3Fc', amount: '50.00', days: 7 },
];

export default function SubscriptionPage() {
  const { address, setupDCA, sendTransaction, revokeSessionKey } = useInvisibleWallet();
  const { usdgBalance, refetch } = useBalances(address);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'charge' | 'cancel'>('create');
  const [selectedSub, setSelectedSub] = useState<SavedSubscription | null>(null);
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string>('');

  const [labelInput, setLabelInput] = useState(PRESET_MERCHANTS[0].label);
  const [merchantAddress, setMerchantAddress] = useState(PRESET_MERCHANTS[0].address);
  const [amountInput, setAmountInput] = useState(PRESET_MERCHANTS[0].amount);
  const [frequency, setFrequency] = useState(PRESET_MERCHANTS[0].days);
  const [subscriptions, setSubscriptions] = useState<SavedSubscription[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('invisible_wallet_subscriptions');
      if (raw) setSubscriptions(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const saveSubscriptions = (next: SavedSubscription[]) => {
    setSubscriptions(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('invisible_wallet_subscriptions', JSON.stringify(next));
    }
  };

  const handleModalSign = async (pin: string) => {
    setStatus('authorizing');
    setErrorMsg(null);
    try {
      if (modalMode === 'create') {
        const parsed = parseFloat(amountInput);
        if (!parsed || parsed <= 0) throw new Error('Enter a valid recurring USDG amount.');
        if (!/^0x[0-9a-fA-F]{40}$/.test(merchantAddress.trim())) {
          throw new Error('Enter a valid payee address (0x followed by 40 characters).');
        }
        if (address && merchantAddress.trim().toLowerCase() === address.toLowerCase()) {
          throw new Error('The payee cannot be your own wallet.');
        }
        const amountRaw = BigInt(Math.round(parsed * 1e6));
        const result = await setupDCA(merchantAddress as `0x${string}`, amountRaw, frequency, pin);
        if (!result) throw new Error('Failed to register subscription on Arbitrum Sepolia.');

        const newSub: SavedSubscription = {
          id: result.userOpHash || `sub-${Date.now()}`,
          label: labelInput || 'Recurring Pull Payment',
          merchant: merchantAddress,
          amount: parsed.toFixed(2),
          frequencyDays: frequency,
          createdAt: new Date().toISOString(),
          txHash: result.userOpHash,
        };
        saveSubscriptions([newSub, ...subscriptions]);
        setLastTxHash(result.userOpHash);

        try {
          const stored = localStorage.getItem('invisible_wallet_activity');
          const existing = stored ? JSON.parse(stored) : [];
          existing.unshift({
            id: result.userOpHash || `sub-${Date.now()}`,
            type: 'subscription',
            title: `Subscription Authorized: ${newSub.label}`,
            subtitle: `$${newSub.amount} USDG every ${frequency} days • ${merchantAddress.slice(0, 6)}...${merchantAddress.slice(-4)}`,
            amount: `${newSub.amount} USDG`,
            amountPositive: false,
            status: 'executed',
            timestamp: new Date().toISOString(),
            txHash: result.userOpHash,
          });
          localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
        } catch {}

        setStatus('success');
      } else if (modalMode === 'charge' && selectedSub) {
        const amountRaw = BigInt(Math.round(parseFloat(selectedSub.amount) * 1e6));
        const res = await sendTransaction(USDG_ADDRESS, amountRaw, selectedSub.merchant as `0x${string}`, pin);
        if (!res) throw new Error('Pull payment execution failed.');
        const updated = subscriptions.map((s) =>
          s.id === selectedSub.id ? { ...s, lastChargedAt: new Date().toISOString(), txHash: res.userOpHash } : s
        );
        saveSubscriptions(updated);
        setLastTxHash(res.userOpHash);
        refetch();
        setStatus('success');
      } else if (modalMode === 'cancel' && selectedSub) {
        await revokeSessionKey(pin);
        const updated = subscriptions.filter((s) => s.id !== selectedSub.id);
        saveSubscriptions(updated);
        setStatus('idle');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || 'Subscription transaction failed.');
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
      className="p-5 sm:p-8 md:p-10 w-full max-w-5xl mx-auto flex flex-col gap-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-xl bg-[#141418] inline-flex items-center justify-center hover:bg-white/[0.06] transition-colors text-[#8e8e98] hover:text-white border border-white/[0.08] shrink-0"
            title="Back"
          >
            <IconArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Recurring Pull Payments
            </h1>
            <p className="text-[#8e8e98] text-sm mt-1">
              Set up automated USDG billing rules on Arbitrum Sepolia. Capped per billing cycle so merchants can never overcharge.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-[#8e8e98] bg-[#141418] border border-white/[0.08] px-3.5 py-2 rounded-xl self-start sm:self-auto">
          Available: <strong className="text-white">{usdgBalance} USDG</strong>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-[#8e8e98] hover:text-white">✕</button>
        </div>
      )}

      {status === 'success' && lastTxHash && (
        <div className="p-5 rounded-2xl bg-[#141418] border border-white/[0.12] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ff4500]/15 border border-[#ff4500]/30 flex items-center justify-center text-[#ff4500] shrink-0">
              <IconCheck size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Subscription Settled on Arbitrum Sepolia</div>
              <a
                href={`https://sepolia.arbiscan.io/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#ff4500] hover:underline inline-flex items-center gap-1 mt-0.5 break-all"
              >
                <span>{lastTxHash}</span>
                <IconArrowUpRight size={12} />
              </a>
            </div>
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="text-xs text-[#8e8e98] hover:text-white font-medium self-end sm:self-center"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left: Create Subscription Form (6 Cols) */}
        <div className="lg:col-span-6 bg-[#141418] rounded-2xl p-6 border border-white/[0.08] space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">New Recurring Allowance</h2>
            <p className="text-xs text-[#8e8e98] mt-1">
              Choose a preset service or enter any Arbitrum Sepolia address.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_MERCHANTS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setLabelInput(preset.label);
                  setMerchantAddress(preset.address);
                  setAmountInput(preset.amount);
                  setFrequency(preset.days);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  labelInput === preset.label
                    ? 'bg-[#ff4500]/15 border-[#ff4500]/50 text-white'
                    : 'bg-[#09090b] border-white/[0.08] text-[#8e8e98] hover:text-white'
                }`}
              >
                {preset.label} (${preset.amount})
              </button>
            ))}
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[#8e8e98] font-medium">Subscription Name</label>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                className="w-full h-11 bg-[#09090b] border border-white/[0.08] rounded-xl px-3.5 text-white outline-none focus:border-[#ff4500]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#8e8e98] font-medium">Merchant / Payee Address</label>
              <input
                type="text"
                value={merchantAddress}
                onChange={(e) => setMerchantAddress(e.target.value)}
                className="w-full h-11 bg-[#09090b] border border-white/[0.08] rounded-xl px-3.5 text-white font-mono outline-none focus:border-[#ff4500]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[#8e8e98] font-medium">Amount (USDG)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full h-11 bg-[#09090b] border border-white/[0.08] rounded-xl px-3.5 text-white font-mono text-sm outline-none focus:border-[#ff4500]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#8e8e98] font-medium">Billing Cycle</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="w-full h-11 bg-[#09090b] border border-white/[0.08] rounded-xl px-3 text-white outline-none focus:border-[#ff4500] font-mono"
                >
                  <option value={7}>Every 7 Days</option>
                  <option value={30}>Every 30 Days</option>
                  <option value={365}>Every 365 Days</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setModalMode('create');
              setIsModalOpen(true);
            }}
            disabled={status === 'authorizing'}
            className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.99] transition-all rounded-xl flex items-center justify-center gap-2 font-semibold text-sm text-white disabled:opacity-50"
          >
            <IconAutoRenew size={16} />
            <span>Authorize Recurring Pull Payment</span>
          </button>
        </div>

        {/* Right: Active Subscriptions List (6 Cols) */}
        <div className="lg:col-span-6 bg-[#141418] rounded-2xl p-6 border border-white/[0.08] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Active Subscriptions</h2>
              <p className="text-xs text-[#8e8e98] mt-1">
                Test an immediate cycle pull or cancel any recurring rule.
              </p>
            </div>
            <span className="text-xs font-mono text-[#c4c4cc] bg-[#09090b] border border-white/[0.08] px-2.5 py-1 rounded-lg">
              {subscriptions.length} active
            </span>
          </div>

          {subscriptions.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#09090b] border border-white/[0.06] text-center space-y-2">
              <div className="text-sm font-medium text-white">No recurring payments configured yet</div>
              <p className="text-xs text-[#8e8e98]">
                Authorize a recurring rule on the left to test on-chain pull payments.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl bg-[#09090b] border border-white/[0.07] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white">{sub.label}</div>
                      <div className="text-xs font-mono text-[#8e8e98] mt-0.5">
                        Payee: {sub.merchant.slice(0, 8)}...{sub.merchant.slice(-6)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-white">${sub.amount} USDG</div>
                      <div className="text-[11px] text-[#8e8e98]">Every {sub.frequencyDays} days</div>
                    </div>
                  </div>

                  {sub.txHash && (
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${sub.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-[#ff4500] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Tx: {sub.txHash.slice(0, 14)}...{sub.txHash.slice(-8)}</span>
                      <IconArrowUpRight size={11} />
                    </a>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSub(sub);
                        setModalMode('charge');
                        setIsModalOpen(true);
                      }}
                      className="flex-1 h-9 rounded-lg bg-[#ff4500] hover:bg-[#e03d00] text-white text-xs font-semibold transition-colors"
                    >
                      Execute Pull (${sub.amount} USDG)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSub(sub);
                        setModalMode('cancel');
                        setIsModalOpen(true);
                      }}
                      className="h-9 px-3.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-[#c4c4cc] hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText={
          modalMode === 'create'
            ? `Authorize ${labelInput}`
            : modalMode === 'charge'
            ? `Execute Pull Payment: ${selectedSub?.label}`
            : `Cancel Subscription: ${selectedSub?.label}`
        }
        amountText={
          modalMode === 'create'
            ? `${amountInput} USDG / ${frequency} Days`
            : modalMode === 'charge'
            ? `${selectedSub?.amount} USDG on Arbitrum Sepolia`
            : 'Revoke recurring pull permission'
        }
        onSign={handleModalSign}
      />
    </motion.div>
  );
}
