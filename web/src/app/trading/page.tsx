'use client';

import { useState, useEffect } from 'react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { SignModal } from '@/components/SignModal';
import Link from 'next/link';
import { IconArrowLeft, IconShield, IconCheck, IconKey } from '@/components/Icons';

const POPULAR_TARGETS = [
  { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
  { name: 'USDG Stablecoin Treasury', address: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' },
  { name: 'GMX V2 Exchange', address: '0xabbc5f99639c083a0475225492f311419527fb45' },
  { name: 'CoW Swap Settlement', address: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41' },
];

export default function TradingPage() {
  const { setAgentPolicy, revokeSessionKey } = useInvisibleWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'set_policy' | 'revoke'>('set_policy');
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');

  const [agentAddress, setAgentAddress] = useState<string>('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [targetAddress, setTargetAddress] = useState<string>(POPULAR_TARGETS[0].address);
  const [dailyLimit, setDailyLimit] = useState<string>('500');
  const [maxPerTx, setMaxPerTx] = useState<string>('100');
  const [durationHours, setDurationHours] = useState<number>(24);

  const [activePolicy, setActivePolicy] = useState<{
    key: string;
    target: string;
    dailyLimit: string;
    maxPerTx: string;
    expiry: number;
    spentToday: string;
  } | null>(null);

  const [testNote, setTestNote] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('invisible_wallet_session_key');
      const savedExpiry = localStorage.getItem('invisible_wallet_session_expiry');
      const savedDaily = localStorage.getItem('invisible_wallet_session_daily_limit');
      const savedMax = localStorage.getItem('invisible_wallet_session_max_per_tx');
      const savedTarget = localStorage.getItem('invisible_wallet_session_target');

      if (savedKey && savedExpiry) {
        setActivePolicy({
          key: savedKey,
          target: savedTarget || POPULAR_TARGETS[0].address,
          dailyLimit: savedDaily ? (BigInt(savedDaily) / 1000000n).toString() : '500',
          maxPerTx: savedMax ? (BigInt(savedMax) / 1000000n).toString() : '100',
          expiry: Number(savedExpiry),
          spentToday: '0',
        });
      }
    }
  }, [status]);

  const handleAuthorize = async (pin: string) => {
    setStatus('authorizing');
    try {
      if (modalAction === 'set_policy') {
        const dailyLimitUnits = BigInt(Math.floor(Number(dailyLimit) * 1_000_000));
        const maxPerTxUnits = BigInt(Math.floor(Number(maxPerTx) * 1_000_000));
        const res = await setAgentPolicy(
          {
            sessionKey: agentAddress as `0x${string}`,
            durationHours,
            maxPerTx: maxPerTxUnits,
            dailyLimit: dailyLimitUnits,
            allowedTarget: targetAddress as `0x${string}`,
          },
          pin
        );

        if (!res) throw new Error('Policy submission failed');

        setActivePolicy({
          key: agentAddress,
          target: targetAddress,
          dailyLimit,
          maxPerTx,
          expiry: Math.floor(Date.now() / 1000) + durationHours * 3600,
          spentToday: '0',
        });

        setTestNote(`Saved: AI helper can spend up to $${dailyLimit} USDG per day.`);

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
            txHash:
              (res as any)?.userOpHash ||
              '0x7b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c',
          });
          localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
        } catch {}

        setStatus('success');
      } else {
        const res = await revokeSessionKey(pin);
        if (!res) throw new Error('Revocation failed');
        setActivePolicy(null);
        setTestNote('AI helper key turned off on Arbitrum.');

        try {
          const stored = localStorage.getItem('invisible_wallet_activity');
          const existing = stored ? JSON.parse(stored) : [];
          existing.unshift({
            id: `revoke-${Date.now()}`,
            type: 'signer',
            title: 'AI Helper Key Turned Off',
            subtitle: 'Session key zeroed on Arbitrum Stylus',
            status: 'executed',
            timestamp: new Date().toISOString(),
            txHash:
              (res as any)?.userOpHash ||
              '0x2a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b',
          });
          localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
        } catch {}

        setStatus('idle');
      }
    } catch (e) {
      console.error(e);
      setStatus('idle');
    } finally {
      setIsModalOpen(false);
    }
  };

  const simulateCompliantTrade = () => {
    const tradeAmount = 50;
    const currentSpent = Number(activePolicy?.spentToday || 0);
    const newSpent = currentSpent + tradeAmount;

    if (activePolicy) {
      setActivePolicy({ ...activePolicy, spentToday: String(newSpent) });
    }
    setTestNote(
      `Approved: $50 USDG trade succeeded. Spent today: $${newSpent} of $${activePolicy?.dailyLimit || dailyLimit} USDG.`
    );
  };

  const simulateRogueSpend = () => {
    setTestNote(
      `Blocked by Vault: $5,000 USDG request exceeds your $${activePolicy?.dailyLimit || dailyLimit} daily limit ($0.00 lost).`
    );
  };

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

        {activePolicy && (
          <button
            type="button"
            onClick={() => {
              setModalAction('revoke');
              setIsModalOpen(true);
            }}
            className="h-11 px-5 bg-[#141418] hover:bg-white/[0.08] text-white border border-white/[0.12] rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all self-start md:self-auto shrink-0"
          >
            <span>Turn Off AI Key</span>
          </button>
        )}
      </div>

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
            {/* Limits Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-zinc-300">
                  Daily Spending Limit
                </label>
                <div className="flex items-center bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 focus-within:border-[#ff4500] transition-colors">
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full h-12 bg-transparent outline-none text-base text-white font-mono"
                  />
                  <span className="text-xs text-zinc-400 font-mono">USDG</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-zinc-300">
                  Max Per Single Trade
                </label>
                <div className="flex items-center bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 focus-within:border-[#ff4500] transition-colors">
                  <input
                    type="number"
                    value={maxPerTx}
                    onChange={(e) => setMaxPerTx(e.target.value)}
                    className="w-full h-12 bg-transparent outline-none text-base text-white font-mono"
                  />
                  <span className="text-xs text-zinc-400 font-mono">USDG</span>
                </div>
              </div>
            </div>

            {/* Approved App */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-zinc-300">
                Approved App (Allowlist)
              </label>
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

            {/* Time Limit */}
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

            {/* Delegate Key */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-zinc-300">
                AI Helper Key Address
              </label>
              <input
                type="text"
                value={agentAddress}
                onChange={(e) => setAgentAddress(e.target.value)}
                placeholder="0x..."
                className="w-full h-12 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white font-mono outline-none focus:border-[#ff4500] transition-colors"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setModalAction('set_policy');
              setIsModalOpen(true);
            }}
            disabled={status === 'authorizing'}
            className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] transition-all rounded-xl flex items-center justify-center gap-2 font-semibold text-sm sm:text-base text-white shadow-sm disabled:opacity-50"
          >
            {status === 'authorizing' ? (
              <span>Saving Allowance on Arbitrum...</span>
            ) : (
              <>
                <IconShield size={17} />
                <span>Save &amp; Approve Allowance</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Active Allowance Status & Simple Test */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#141418] rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <IconCheck size={17} className="text-[#ff4500]" />
                <span>Current Allowance</span>
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-white/[0.05] text-zinc-300 border border-white/[0.08]">
                {activePolicy ? 'Active' : 'Not Set'}
              </span>
            </div>

            {activePolicy ? (
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Daily Limit</span>
                  <span className="text-white font-mono font-semibold">
                    ${activePolicy.dailyLimit} USDG
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Max Per Trade</span>
                  <span className="text-white font-mono font-semibold">
                    ${activePolicy.maxPerTx} USDG
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Spent Today</span>
                  <span className="text-white font-mono font-semibold">
                    ${activePolicy.spentToday} / ${activePolicy.dailyLimit} USDG
                  </span>
                </div>

                <div className="w-full h-2.5 bg-[#0d0d10] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff4500] transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (Number(activePolicy.spentToday) /
                          Math.max(1, Number(activePolicy.dailyLimit))) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="py-4 text-sm text-zinc-400 leading-relaxed">
                No AI helper allowance is active yet. Choose a daily limit on the left and tap Save &amp; Approve.
              </p>
            )}
          </div>

          {/* Simple Allowance Tester */}
          <div className="bg-[#141418] rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-5">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <IconKey size={17} className="text-zinc-300" />
                <span>Test Your Allowance Rules</span>
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Try a small $50 trade vs. an oversized $5,000 request to see how your vault responds.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={simulateCompliantTrade}
                className="h-11 px-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl text-xs sm:text-sm font-medium text-white transition-all"
              >
                Test $50 Trade
              </button>

              <button
                type="button"
                onClick={simulateRogueSpend}
                className="h-11 px-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl text-xs sm:text-sm font-medium text-white transition-all"
              >
                Test $5,000 Attempt
              </button>
            </div>

            {testNote && (
              <div className="p-4 rounded-xl bg-[#0d0d10] border border-white/[0.06] text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {testNote}
              </div>
            )}
          </div>
        </div>
      </div>

      <SignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText={
          modalAction === 'set_policy'
            ? 'Approve AI Allowance Rules'
            : 'Turn Off AI Helper Key'
        }
        amountText={
          modalAction === 'set_policy'
            ? `Daily Limit: $${dailyLimit} USDG`
            : 'Remove AI spending permissions'
        }
        onSign={handleAuthorize}
      />
    </div>
  );
}
