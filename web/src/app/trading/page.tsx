'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { isAddress, type Address } from 'viem';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { SignModal } from '@/components/SignModal';
import { IconArrowLeft, IconShield, IconCheck, IconKey } from '@/components/Icons';
import {
  simulateAgentSpend,
  unitsToUsdg,
  usdgToUnits,
  useOnChainAgentPolicy,
  type OnChainPolicy,
  type SimulationKind,
  type SimulationResult,
} from '@/lib/agentPolicy';

const POPULAR_TARGETS = [
  { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
  { name: 'USDG Stablecoin Treasury', address: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' },
  { name: 'GMX V2 Exchange', address: '0xabbc5f99639c083a0475225492f311419527fb45' },
  { name: 'CoW Swap Settlement', address: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41' },
];

function describeExpiry(expiry: number): string {
  const secs = expiry - Math.floor(Date.now() / 1000);
  if (secs <= 0) return 'Expired';
  const hours = Math.floor(secs / 3600);
  if (hours >= 48) return `${Math.floor(hours / 24)} days left`;
  if (hours >= 1) return `${hours}h ${Math.floor((secs % 3600) / 60)}m left`;
  return `${Math.max(1, Math.floor(secs / 60))} min left`;
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export default function TradingPage() {
  const { setAgentPolicy, revokeSessionKey, address } = useInvisibleWallet();
  const { policy, loading, error: readError, checkedAt, refresh } = useOnChainAgentPolicy(address);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'set_policy' | 'revoke'>('set_policy');
  const [status, setStatus] = useState<'idle' | 'authorizing'>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  const [agentAddress, setAgentAddress] = useState<string>('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [targetAddress, setTargetAddress] = useState<string>(POPULAR_TARGETS[0].address);
  const [dailyLimit, setDailyLimit] = useState<string>('500');
  const [maxPerTx, setMaxPerTx] = useState<string>('100');
  const [durationHours, setDurationHours] = useState<number>(24);

  const [simRunning, setSimRunning] = useState<SimulationKind | null>(null);
  const [sim, setSim] = useState<{ kind: SimulationKind; amount: number; result: SimulationResult } | null>(null);
  const [previewSpentUnits, setPreviewSpentUnits] = useState<bigint>(0n);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedPk = localStorage.getItem('stylussafe_agent_helper_pk');
    if (savedPk) {
      try {
        setAgentAddress(privateKeyToAccount(savedPk as `0x${string}`).address);
      } catch {
        // ignore malformed value
      }
    }
  }, []);

  const handleGenerateHelperKey = () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    localStorage.setItem('stylussafe_agent_helper_pk', pk);
    localStorage.setItem('invisible_wallet_session_pk', pk);
    setAgentAddress(account.address);
    setFormError(null);
  };

  const handleAuthorize = async (pin: string) => {
    setFormError(null);
    setStatus('authorizing');
    try {
      if (modalAction === 'set_policy') {
        const dailyUnits = BigInt(Math.floor(Number(dailyLimit) * 1_000_000));
        const perTxUnits = BigInt(Math.floor(Number(maxPerTx) * 1_000_000));
        const res = await setAgentPolicy(
          {
            sessionKey: agentAddress as `0x${string}`,
            durationHours,
            maxPerTx: perTxUnits,
            dailyLimit: dailyUnits,
            allowedTarget: targetAddress as `0x${string}`,
          },
          pin
        );
        if (!res) throw new Error('The allowance could not be submitted.');

        if (typeof window !== 'undefined') {
          localStorage.setItem('invisible_wallet_session_spent_today', '0');
          localStorage.setItem(
            'invisible_wallet_session_last_reset',
            Math.floor(Date.now() / 1000).toString()
          );
        }

        try {
          const stored = localStorage.getItem('invisible_wallet_activity');
          const existing = stored ? JSON.parse(stored) : [];
          existing.unshift({
            id: `policy-${Date.now()}`,
            type: 'session',
            title: `AI Allowance Set: $${dailyLimit} USDG Daily Cap`,
            subtitle: `Approved App: ${
              POPULAR_TARGETS.find((t) => t.address.toLowerCase() === targetAddress.toLowerCase())?.name ||
              targetAddress.slice(0, 10)
            }`,
            amount: `${dailyLimit} USDG`,
            amountPositive: false,
            status: 'executed',
            timestamp: new Date().toISOString(),
            txHash: (res as any)?.userOpHash || '',
          });
          localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
        } catch {}

        setPreviewSpentUnits(0n);
        setSim(null);
        await refresh();
      } else {
        const res = await revokeSessionKey(pin);
        if (!res) throw new Error('The AI helper key could not be turned off.');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('invisible_wallet_session_spent_today');
          localStorage.removeItem('invisible_wallet_session_last_reset');
        }
        setPreviewSpentUnits(0n);
        setSim(null);
        await refresh();
      }
    } catch (e: any) {
      console.error(e);
      setFormError(String(e?.message || 'Something went wrong. Please try again.').slice(0, 200));
    } finally {
      if (mounted.current) setStatus('idle');
      setIsModalOpen(false);
    }
  };

  const canSave =
    !!address &&
    isAddress(agentAddress) &&
    Number(dailyLimit) > 0 &&
    Number(maxPerTx) > 0 &&
    Number(maxPerTx) <= Number(dailyLimit);

  // Build effective policy for real Arbitrum Sepolia eth_call simulation (uses saved policy if present, else form rules)
  const effectivePolicy: OnChainPolicy = policy ?? {
    sessionKey: (isAddress(agentAddress)
      ? agentAddress
      : '0x70997970C51812dc3A010C7d01b50e0d17dc79C8') as Address,
    expiry: Math.floor(Date.now() / 1000) + durationHours * 3600,
    maxPerTx: usdgToUnits(maxPerTx || '100'),
    dailyLimit: usdgToUnits(dailyLimit || '500'),
    spentToday: previewSpentUnits,
    lastReset: Math.floor(Date.now() / 1000) - 60,
    windowSeconds: 86400,
    allowedTarget: targetAddress as Address,
    isActive: true,
    effectiveSpentToday: previewSpentUnits,
  };

  const maxPerTxUsdg = Number(unitsToUsdg(effectivePolicy.maxPerTx));
  const withinAmount = Math.max(1, Math.min(50, maxPerTxUsdg || 50));
  const overAmount = Math.max(5000, maxPerTxUsdg * 2);

  const runSim = async (kind: SimulationKind) => {
    const amount = kind === 'over_limit' ? overAmount : kind === 'within_limit' ? withinAmount : 10;
    setSimRunning(kind);
    const currentPolicy = (await refresh()) ?? effectivePolicy;
    const result = await simulateAgentSpend(
      address ? (address as Address) : null,
      currentPolicy,
      kind,
      amount
    );
    if (mounted.current) {
      if (result.newSpentToday !== undefined) {
        setPreviewSpentUnits(result.newSpentToday);
        await refresh();
      }
      setSim({ kind, amount, result });
      setSimRunning(null);
    }
  };

  const displayedSpent = policy ? policy.effectiveSpentToday : previewSpentUnits;
  const displayedDaily = policy ? policy.dailyLimit : effectivePolicy.dailyLimit;
  const spentPct = Math.min(
    100,
    Number((displayedSpent * 10000n) / (displayedDaily || 1n)) / 100
  );

  const busy = status !== 'idle';

  return (
    <div className="p-5 sm:p-8 md:p-12 w-full max-w-5xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-xl bg-[#141418] inline-flex items-center justify-center hover:bg-white/[0.08] transition-colors text-zinc-400 hover:text-white border border-white/[0.08] shrink-0 mt-0.5"
            title="Back to Dashboard"
          >
            <IconArrowLeft size={17} />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              AI Helper Allowance Rules
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base max-w-xl leading-relaxed">
              Set a safe daily budget and choose which apps your AI helper is allowed to use.
            </p>
          </div>
        </div>

        {policy && (
          <button
            type="button"
            onClick={() => {
              setModalAction('revoke');
              setIsModalOpen(true);
            }}
            disabled={busy}
            className="h-11 px-5 bg-[#141418] hover:bg-white/[0.08] disabled:opacity-50 text-white border border-white/[0.12] rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all self-start md:self-auto shrink-0"
          >
            <span>Turn Off AI Key</span>
          </button>
        )}
      </div>

      {formError && (
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.12] text-sm text-zinc-200">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Allowance Settings Form */}
        <div className="lg:col-span-7 bg-[#141418] rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <IconShield size={19} className="text-[#ff4500]" />
              <span>Set Spending Limits</span>
            </h2>
            <span className="text-xs font-mono text-zinc-400">Arbitrum Stylus</span>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-zinc-300">Daily Spending Limit</label>
                <div className="flex items-center bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 focus-within:border-[#ff4500] transition-colors">
                  <input
                    type="number"
                    min="0"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full h-12 bg-transparent outline-none text-base text-white font-mono"
                  />
                  <span className="text-xs text-zinc-400 font-mono">USDG</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-zinc-300">Max Per Single Trade</label>
                <div className="flex items-center bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 focus-within:border-[#ff4500] transition-colors">
                  <input
                    type="number"
                    min="0"
                    value={maxPerTx}
                    onChange={(e) => setMaxPerTx(e.target.value)}
                    className="w-full h-12 bg-transparent outline-none text-base text-white font-mono"
                  />
                  <span className="text-xs text-zinc-400 font-mono">USDG</span>
                </div>
              </div>
            </div>
            {Number(maxPerTx) > Number(dailyLimit) && (
              <p className="text-xs sm:text-sm text-zinc-400">
                A single trade limit higher than the daily limit has no effect. Lower it to continue.
              </p>
            )}

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-zinc-300">Approved App (Allowlist)</label>
              <select
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                className="w-full h-12 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-[#ff4500] transition-colors font-mono"
              >
                {POPULAR_TARGETS.map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.name} ({t.address.slice(0, 6)}...{t.address.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-zinc-300">
                How Long Should This Allowance Last?
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full h-12 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-[#ff4500] transition-colors font-mono"
              >
                <option value={4}>4 Hours</option>
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={168}>7 Days</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs sm:text-sm font-medium text-zinc-300">AI Helper Key Address</label>
                <button
                  type="button"
                  onClick={handleGenerateHelperKey}
                  className="text-xs sm:text-sm text-white underline underline-offset-4 hover:text-[#ff4500] transition-colors"
                >
                  Generate a new helper key
                </button>
              </div>
              <input
                type="text"
                value={agentAddress}
                onChange={(e) => setAgentAddress(e.target.value.trim())}
                placeholder="0x... or tap Generate"
                className="w-full h-12 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white font-mono outline-none focus:border-[#ff4500] transition-colors"
              />
              {agentAddress && !isAddress(agentAddress) && (
                <p className="text-xs sm:text-sm text-zinc-400">That is not a valid wallet address.</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setModalAction('set_policy');
              setIsModalOpen(true);
            }}
            disabled={busy || !canSave}
            className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] transition-all rounded-xl flex items-center justify-center gap-2 font-semibold text-sm sm:text-base text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'authorizing' ? (
              <span>Saving Allowance...</span>
            ) : !address ? (
              <span>Unlock Wallet on Dashboard to Save</span>
            ) : (
              <>
                <IconShield size={17} />
                <span>Save &amp; Approve Allowance</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Live allowance + real checks */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#141418] rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 gap-3">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <IconCheck size={17} className="text-[#ff4500]" />
                <span>Current Allowance</span>
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-white/[0.05] text-zinc-300 border border-white/[0.08] shrink-0">
                {policy ? (policy.isActive ? 'Active' : 'Expired') : 'Previewing Form Rules'}
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between gap-3 py-2 border-b border-white/[0.06]">
                <span className="text-zinc-400">Helper Key</span>
                <span className="text-white font-mono">{shortAddr(effectivePolicy.sessionKey)}</span>
              </div>
              <div className="flex justify-between gap-3 py-2 border-b border-white/[0.06]">
                <span className="text-zinc-400">Approved App</span>
                <span className="text-white font-mono">{shortAddr(effectivePolicy.allowedTarget)}</span>
              </div>
              <div className="flex justify-between gap-3 py-2 border-b border-white/[0.06]">
                <span className="text-zinc-400">Daily Limit</span>
                <span className="text-white font-mono font-semibold">
                  ${unitsToUsdg(effectivePolicy.dailyLimit)} USDG
                </span>
              </div>
              <div className="flex justify-between gap-3 py-2 border-b border-white/[0.06]">
                <span className="text-zinc-400">Max Per Trade</span>
                <span className="text-white font-mono font-semibold">
                  ${unitsToUsdg(effectivePolicy.maxPerTx)} USDG
                </span>
              </div>
              {policy && (
                <div className="flex justify-between gap-3 py-2 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Time Left</span>
                  <span className="text-white font-mono">{describeExpiry(policy.expiry)}</span>
                </div>
              )}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-400">Spent Today</span>
                  <span className="text-white font-mono font-semibold">
                    ${unitsToUsdg(displayedSpent)} / ${unitsToUsdg(displayedDaily)} USDG
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#0d0d10] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff4500] transition-all duration-300"
                    style={{ width: `${spentPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.06] text-xs text-zinc-400">
              <span>
                {readError
                  ? `RPC status: ${readError}`
                  : checkedAt
                    ? `Synced with Arbitrum Sepolia at ${new Date(checkedAt).toLocaleTimeString()}`
                    : 'Arbitrum Sepolia Live'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPreviewSpentUnits(0n);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('invisible_wallet_session_spent_today', '0');
                  }
                  refresh();
                }}
                disabled={loading}
                className="text-white underline underline-offset-4 disabled:opacity-40 shrink-0"
              >
                {loading ? 'Checking...' : 'Reset / Refresh'}
              </button>
            </div>
          </div>

          {/* Real checks against the deployed Arbitrum Sepolia contract */}
          <div className="bg-[#141418] rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-5">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <IconKey size={17} className="text-zinc-300" />
                <span>Test Your Allowance Rules (Live On-Chain Check)</span>
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Each button sends a real <code className="text-zinc-200 font-mono">eth_call</code> to the deployed{' '}
                <code className="text-zinc-200 font-mono">StylusSafeAccount</code> contract on Arbitrum Sepolia (
                <code className="text-zinc-200 font-mono">0x0D66...32fA</code>).
              </p>
            </div>

            <div className="space-y-3">
              {(
                [
                  { kind: 'within_limit', label: `Try a $${withinAmount} trade`, hint: 'Inside your limits' },
                  { kind: 'over_limit', label: `Try a $${overAmount.toLocaleString()} trade`, hint: 'Above your limits' },
                  { kind: 'unapproved_app', label: 'Try an unapproved app', hint: 'Not on allowlist' },
                ] as { kind: SimulationKind; label: string; hint: string }[]
              ).map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => runSim(t.kind)}
                  disabled={simRunning !== null}
                  className="w-full h-14 px-4 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.08] rounded-xl text-left transition-all flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-sm font-medium text-white">
                    {simRunning === t.kind ? 'Calling Arbitrum Sepolia...' : t.label}
                  </span>
                  <span className="text-xs text-zinc-400 shrink-0">{t.hint}</span>
                </button>
              ))}
            </div>

            {sim && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0d0d10] border border-white/[0.1] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm sm:text-base font-semibold text-white">{sim.result.title}</span>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/[0.06] text-zinc-200 border border-white/[0.1] shrink-0">
                    {sim.result.verdict === 'approved'
                      ? 'Allowed'
                      : sim.result.verdict === 'blocked'
                        ? 'Blocked'
                        : 'Error'}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{sim.result.explanation}</p>
                <p className="text-xs font-mono text-zinc-500 pt-2 border-t border-white/[0.06]">
                  Verified via live Arbitrum Sepolia eth_call (0x0D66...32fA)
                  {sim.result.revertName ? ` · revert: ${sim.result.revertName}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <SignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText={modalAction === 'set_policy' ? 'Approve AI Allowance Rules' : 'Turn Off AI Helper Key'}
        amountText={
          modalAction === 'set_policy' ? `Daily Limit: $${dailyLimit} USDG` : 'Remove AI spending permissions'
        }
        onSign={handleAuthorize}
      />
    </div>
  );
}
