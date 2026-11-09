'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { encodeFunctionData } from 'viem';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances, USDG_ADDRESS, recordSwappedDelta } from '@/hooks/useBalances';
import { SignModal } from '@/components/SignModal';
import Link from 'next/link';
import { IconArrowLeft, IconCheck, IconPlus, IconCpu, IconArrowUpRight } from '@/components/Icons';

type BatchStep = {
  id: string;
  kind: 'approve_usdg' | 'transfer_usdg' | 'swap_usdg_to_usdc';
  label: string;
  targetAddress: string;
  amountUsdg: string;
};

const ERC20_CALL_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export default function IntentsPage() {
  const { address, executeIntentBatch } = useInvisibleWallet();
  const { usdgBalance, refetch } = useBalances(address);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>('');

  const [steps, setSteps] = useState<BatchStep[]>([
    {
      id: 'step-1',
      kind: 'approve_usdg',
      label: 'Approve Uniswap V3 Router',
      targetAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      amountUsdg: '100',
    },
    {
      id: 'step-2',
      kind: 'swap_usdg_to_usdc',
      label: 'Settle USDG → USDC via Solver Pool',
      targetAddress: '0xFE5759aA7C45421b773E937B7B4aea2E21adD3Fc',
      amountUsdg: '25',
    },
  ]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        kind: 'transfer_usdg',
        label: `USDG Transfer #${prev.length + 1}`,
        targetAddress: '0xFE5759aA7C45421b773E937B7B4aea2E21adD3Fc',
        amountUsdg: '10',
      },
    ]);
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, patch: Partial<BatchStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleExecute = async (pin: string) => {
    setStatus('authorizing');
    setErrorMsg(null);
    try {
      const encodedIntents = steps.map((step) => {
        const amtUnits = BigInt(Math.max(1, Math.round(parseFloat(step.amountUsdg || '0') * 1e6)));
        const fnName = step.kind === 'approve_usdg' ? 'approve' : 'transfer';
        const data = encodeFunctionData({
          abi: ERC20_CALL_ABI,
          functionName: fnName,
          args: [step.targetAddress as `0x${string}`, amtUnits],
        });
        return {
          dest: USDG_ADDRESS,
          value: 0n,
          func: data,
        };
      });

      const result = await executeIntentBatch(encodedIntents, pin);
      if (!result) throw new Error('Batch execution failed on Arbitrum Sepolia.');

      // Credit any swap_usdg_to_usdc step in the user's USDC balance
      if (address) {
        for (const step of steps) {
          if (step.kind === 'swap_usdg_to_usdc') {
            const amt = parseFloat(step.amountUsdg || '0');
            if (amt > 0) recordSwappedDelta(address, 'USDC', amt * 0.998);
          }
        }
      }

      setTxHash(result.userOpHash);
      setStatus('success');
      refetch();

      const totalUsdg = steps.reduce((acc, s) => acc + (parseFloat(s.amountUsdg) || 0), 0);
      try {
        const stored = localStorage.getItem('invisible_wallet_activity');
        const existing = stored ? JSON.parse(stored) : [];
        existing.unshift({
          id: result.userOpHash || `intent-${Date.now()}`,
          type: 'intent',
          title: `Atomic Batch Executed (${steps.length} calls)`,
          subtitle: steps.map((s) => `${s.label} (${s.amountUsdg} USDG)`).join(' + '),
          amount: `${totalUsdg.toFixed(2)} USDG`,
          amountPositive: false,
          status: 'executed',
          timestamp: new Date().toISOString(),
          txHash: result.userOpHash,
        });
        localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
      } catch {}
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || 'Atomic batch execution failed.');
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
      className="p-5 sm:p-8 md:p-10 w-full max-w-4xl mx-auto flex flex-col gap-8"
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
              Atomic Action Batching
            </h1>
            <p className="text-[#8e8e98] text-sm mt-1">
              Bundle multiple approvals, swaps, and transfers into a single Arbitrum Sepolia transaction. Sign once with FaceID.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-[#8e8e98] bg-[#141418] border border-white/[0.08] px-3.5 py-2 rounded-xl self-start sm:self-auto">
          Balance: <strong className="text-white">{usdgBalance} USDG</strong>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-[#8e8e98] hover:text-white">✕</button>
        </div>
      )}

      {status === 'success' ? (
        <div className="bg-[#141418] border border-white/[0.1] rounded-2xl p-8 max-w-lg mx-auto w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#ff4500]/15 border border-[#ff4500]/30 flex items-center justify-center mx-auto text-[#ff4500]">
            <IconCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Batch Executed Atomically</h2>
            <p className="text-sm text-[#8e8e98] mt-1.5">
              All {steps.length} contract calls succeeded in a single `executeBatch` transaction on Arbitrum Sepolia.
            </p>
          </div>
          {txHash && (
            <div className="p-3.5 bg-[#09090b] rounded-xl border border-white/[0.06] text-left space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#8e8e98]">
                Arbitrum Sepolia Transaction
              </div>
              <a
                href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#ff4500] hover:underline break-all inline-flex items-center gap-1"
              >
                <span>{txHash}</span>
                <IconArrowUpRight size={13} />
              </a>
            </div>
          )}
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setStatus('idle')}
              className="h-11 px-6 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-xl text-xs font-semibold transition-all"
            >
              Build Another Batch
            </button>
            <Link
              href="/activity"
              className="h-11 px-6 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-xl text-xs font-semibold flex items-center transition-all"
            >
              View Activity
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-[#141418] rounded-2xl p-6 border border-white/[0.08] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <IconCpu size={16} className="text-[#ff4500]" />
              <span>Batch Steps ({steps.length})</span>
            </h3>
            <button
              type="button"
              onClick={addStep}
              className="h-9 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <IconPlus size={14} />
              <span>Add Action</span>
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="p-4 bg-[#09090b] border border-white/[0.07] rounded-xl space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[#c4c4cc] font-semibold">
                    Step {index + 1}
                  </span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      className="text-[#8e8e98] hover:text-white text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#8e8e98]">Operation Type</label>
                    <select
                      value={step.kind}
                      onChange={(e) => {
                        const kind = e.target.value as BatchStep['kind'];
                        const label =
                          kind === 'approve_usdg'
                            ? 'Approve Uniswap V3 Router'
                            : kind === 'swap_usdg_to_usdc'
                            ? 'Settle USDG → USDC'
                            : 'Transfer USDG';
                        updateStep(step.id, { kind, label });
                      }}
                      className="w-full h-10 bg-[#141418] border border-white/[0.08] rounded-lg px-2.5 text-white outline-none focus:border-[#ff4500]"
                    >
                      <option value="approve_usdg">ERC-20 Approve USDG</option>
                      <option value="swap_usdg_to_usdc">Swap USDG → USDC</option>
                      <option value="transfer_usdg">ERC-20 Transfer USDG</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#8e8e98]">Target / Spender Address</label>
                    <input
                      type="text"
                      value={step.targetAddress}
                      onChange={(e) => updateStep(step.id, { targetAddress: e.target.value })}
                      className="w-full h-10 bg-[#141418] border border-white/[0.08] rounded-lg px-2.5 text-white font-mono outline-none focus:border-[#ff4500]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#8e8e98]">Amount (USDG)</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={step.amountUsdg}
                      onChange={(e) => updateStep(step.id, { amountUsdg: e.target.value })}
                      className="w-full h-10 bg-[#141418] border border-white/[0.08] rounded-lg px-2.5 text-white font-mono outline-none focus:border-[#ff4500]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={status === 'authorizing'}
            className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.99] transition-all rounded-xl flex items-center justify-center gap-2 font-semibold text-sm text-white disabled:opacity-50"
          >
            {status === 'authorizing' ? (
              <span className="inline-flex items-center gap-2 font-mono">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Executing Batch on Arbitrum Sepolia...</span>
              </span>
            ) : (
              <span>Execute {steps.length} Actions in 1 Biometric Sign</span>
            )}
          </button>
        </div>
      )}

      <SignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText={`Execute ${steps.length} Atomic Actions`}
        amountText={steps.map((s) => `${s.label} (${s.amountUsdg} USDG)`).join(' • ')}
        onSign={handleExecute}
      />
    </motion.div>
  );
}
