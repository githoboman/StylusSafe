'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, formatUnits, http, isAddress, zeroAddress, type Address } from 'viem';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { SWAP_POOL_ADDRESS, SEPOLIA_SWAP_TOKENS, useBalances } from '@/hooks/useBalances';
import { SignModal } from '@/components/SignModal';
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconCheck,
  IconKey,
  IconShield,
  IconSwapVert,
} from '@/components/Icons';
import {
  POLICY_KIND_LABELS,
  simulateAgentSpend,
  unitsToUsdg,
  usdgToUnits,
  useOnChainAgentPolicies,
  type OnChainPolicy,
  type PolicyKind,
  type SimulationKind,
  type SimulationResult,
} from '@/lib/agentPolicy';

const POPULAR_TARGETS = [
  { name: 'StylusSafe Swap Pool (421614)', address: SWAP_POOL_ADDRESS },
  { name: 'USDG Stablecoin Treasury', address: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' },
  { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
  { name: 'Any External App (Wildcard)', address: zeroAddress },
];

const TRADE_TOKENS = [
  { symbol: 'USDG', decimals: 6 },
  { symbol: 'USDC', decimals: 6 },
  { symbol: 'USDT', decimals: 6 },
  { symbol: 'ETH', decimals: 18 },
  { symbol: 'WBTC', decimals: 8 },
  { symbol: 'ARB', decimals: 18 },
  { symbol: 'UNI', decimals: 18 },
  { symbol: 'DEGEN', decimals: 18 },
] as const;

const SWAP_POOL_QUOTE_ABI = [
  {
    type: 'function',
    name: 'getAmountOut',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

function describeExpiry(expiry: number): string {
  const secs = expiry - Math.floor(Date.now() / 1000);
  if (secs <= 0) return 'Expired';
  const hours = Math.floor(secs / 3600);
  if (hours >= 48) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  if (hours >= 1) return `${hours}h ${Math.floor((secs % 3600) / 60)}m left`;
  return `${Math.max(1, Math.floor(secs / 60))}m left`;
}

function describeWindow(seconds: number): string {
  if (seconds >= 86400 && seconds % 86400 === 0) {
    const days = seconds / 86400;
    return days === 1 ? '24h' : `${days}d`;
  }
  return `${Math.max(1, Math.round(seconds / 3600))}h`;
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function targetLabel(addr: string) {
  if (!addr || addr.toLowerCase() === zeroAddress) return 'Any External App';
  return POPULAR_TARGETS.find((t) => t.address.toLowerCase() === addr.toLowerCase())?.name || shortAddr(addr);
}

function saveSessionPk(addr: string, pk: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('stylussafe_agent_helper_pk', pk);
  localStorage.setItem('invisible_wallet_session_pk', pk);
  try {
    const map = JSON.parse(localStorage.getItem('stylussafe_session_pks') || '{}') as Record<string, string>;
    map[addr.toLowerCase()] = pk;
    localStorage.setItem('stylussafe_session_pks', JSON.stringify(map));
  } catch {}
}

export default function TradingPage() {
  const { setAgentPolicy, revokeSessionKey, executeAgentSwap, address } = useInvisibleWallet();
  const {
    policies,
    agentPolicies,
    subscriptionPolicies,
    primaryPolicy,
    loading,
    error: readError,
    checkedAt,
    refresh,
  } = useOnChainAgentPolicies(address);
  const { tokenBalances, refetch: refetchBalances } = useBalances(address, 421614);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'set_policy' | 'revoke'>('set_policy');
  const [revokeTargetKey, setRevokeTargetKey] = useState<Address | null>(null);
  const [status, setStatus] = useState<'idle' | 'authorizing'>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  // Rule studio form state
  const [ruleKind, setRuleKind] = useState<0 | 1>(0);
  const [ruleLabel, setRuleLabel] = useState<string>('SwapPool AI Trader');
  const [agentAddress, setAgentAddress] = useState<string>('');
  const [targetSelect, setTargetSelect] = useState<string>(SWAP_POOL_ADDRESS);
  const [customTarget, setCustomTarget] = useState<string>('');
  const [dailyLimit, setDailyLimit] = useState<string>('500');
  const [maxPerTx, setMaxPerTx] = useState<string>('100');
  const [durationHours, setDurationHours] = useState<number>(24);
  const [windowSeconds, setWindowSeconds] = useState<number>(86400);

  // Selected policy for inspector & live trading terminal
  const [selectedKey, setSelectedKey] = useState<Address | null>(null);

  // Right panel: Trade vs Simulate tab
  const [rightTab, setRightTab] = useState<'trade' | 'simulate'>('trade');
  const [tradeFrom, setTradeFrom] = useState<string>('USDG');
  const [tradeTo, setTradeTo] = useState<string>('USDC');
  const [tradeAmount, setTradeAmount] = useState<string>('25');
  const [quotedOut, setQuotedOut] = useState<string | null>(null);
  const [quotingOut, setQuotingOut] = useState(false);
  const [tradeBusy, setTradeBusy] = useState(false);
  const [tradeResult, setTradeResult] = useState<{ ok: boolean; msg: string; hash?: string } | null>(null);

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
        const acct = privateKeyToAccount(savedPk as `0x${string}`);
        saveSessionPk(acct.address, savedPk);
        setAgentAddress(acct.address);
        return;
      } catch {}
    }
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    saveSessionPk(acct.address, pk);
    setAgentAddress(acct.address);
  }, []);

  useEffect(() => {
    if (!selectedKey && agentPolicies.length > 0) {
      setSelectedKey(agentPolicies[0].sessionKey);
    } else if (selectedKey && policies.length > 0 && !policies.some((p) => p.sessionKey.toLowerCase() === selectedKey.toLowerCase())) {
      setSelectedKey(agentPolicies[0]?.sessionKey ?? policies[0]?.sessionKey ?? null);
    }
  }, [policies, agentPolicies, selectedKey]);

  const resolvedTargetAddress = targetSelect === 'custom' ? customTarget.trim() : targetSelect;

  const selectedPolicy: OnChainPolicy | null = useMemo(() => {
    if (selectedKey) {
      const match = policies.find((p) => p.sessionKey.toLowerCase() === selectedKey.toLowerCase());
      if (match) return match;
    }
    return primaryPolicy;
  }, [policies, selectedKey, primaryPolicy]);

  const activeTradingPolicy: OnChainPolicy | null = useMemo(() => {
    if (selectedPolicy && selectedPolicy.kind !== 2) return selectedPolicy;
    return agentPolicies[0] ?? null;
  }, [selectedPolicy, agentPolicies]);

  // Live SwapPool on-chain quote for the Agent Quick-Trade terminal
  useEffect(() => {
    const parsed = parseFloat(tradeAmount || '0');
    if (!parsed || parsed <= 0 || tradeFrom === tradeTo) {
      setQuotedOut(tradeFrom === tradeTo ? tradeAmount : null);
      return;
    }
    const fromMeta = (SEPOLIA_SWAP_TOKENS as Record<string, { address: `0x${string}`; decimals: number }>)[tradeFrom];
    const toMeta = (SEPOLIA_SWAP_TOKENS as Record<string, { address: `0x${string}`; decimals: number }>)[tradeTo];
    if (!fromMeta || !toMeta) {
      setQuotedOut(null);
      return;
    }

    let cancelled = false;
    setQuotingOut(true);
    const timer = setTimeout(async () => {
      try {
        const rpc = typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : 'https://sepolia-rollup.arbitrum.io/rpc';
        const client = createPublicClient({ chain: { id: 421614 } as any, transport: http(rpc) });
        const rawIn = BigInt(Math.round(parsed * 10 ** fromMeta.decimals));
        const out = (await client.readContract({
          address: SWAP_POOL_ADDRESS,
          abi: SWAP_POOL_QUOTE_ABI,
          functionName: 'getAmountOut',
          args: [fromMeta.address, toMeta.address, rawIn],
        })) as bigint;
        if (!cancelled) {
          const num = Number(formatUnits(out, toMeta.decimals));
          setQuotedOut(num.toFixed(num < 0.01 ? 6 : num < 1 ? 4 : 2));
        }
      } catch {
        if (!cancelled) setQuotedOut(null);
      } finally {
        if (!cancelled) setQuotingOut(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tradeAmount, tradeFrom, tradeTo]);

  const handleGenerateHelperKey = () => {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    saveSessionPk(acct.address, pk);
    setAgentAddress(acct.address);
    setFormError(null);
  };

  const applyPreset = (preset: 'trader' | 'dca' | 'micro') => {
    handleGenerateHelperKey();
    if (preset === 'trader') {
      setRuleKind(0);
      setRuleLabel('SwapPool AI Trader');
      setTargetSelect(SWAP_POOL_ADDRESS);
      setMaxPerTx('100');
      setDailyLimit('500');
      setDurationHours(24);
      setWindowSeconds(86400);
    } else if (preset === 'dca') {
      setRuleKind(1);
      setRuleLabel('Weekly ETH DCA Bot');
      setTargetSelect(SWAP_POOL_ADDRESS);
      setMaxPerTx('50');
      setDailyLimit('200');
      setDurationHours(720);
      setWindowSeconds(7 * 86400);
    } else {
      setRuleKind(0);
      setRuleLabel('Micro Arbitrage Key');
      setTargetSelect(zeroAddress);
      setMaxPerTx('25');
      setDailyLimit('150');
      setDurationHours(12);
      setWindowSeconds(86400);
    }
  };

  const handleAuthorize = async (pin: string) => {
    setFormError(null);
    setStatus('authorizing');
    try {
      if (modalAction === 'set_policy') {
        if (!isAddress(resolvedTargetAddress)) {
          throw new Error('Enter a valid approved contract address.');
        }
        const dailyUnits = BigInt(Math.floor(Number(dailyLimit) * 1_000_000));
        const perTxUnits = BigInt(Math.floor(Number(maxPerTx) * 1_000_000));
        const res = await setAgentPolicy(
          {
            sessionKey: agentAddress as `0x${string}`,
            durationHours,
            maxPerTx: perTxUnits,
            dailyLimit: dailyUnits,
            allowedTarget: resolvedTargetAddress as `0x${string}`,
            kind: ruleKind,
            windowSeconds,
            label: ruleLabel.trim() || POLICY_KIND_LABELS[ruleKind],
          },
          pin
        );
        if (!res) throw new Error('The concurrent rule could not be saved.');

        try {
          const stored = localStorage.getItem('invisible_wallet_activity');
          const existing = stored ? JSON.parse(stored) : [];
          existing.unshift({
            id: `policy-${Date.now()}`,
            type: 'session',
            title: `${POLICY_KIND_LABELS[ruleKind]} Added: ${ruleLabel || shortAddr(agentAddress)}`,
            subtitle: `${targetLabel(resolvedTargetAddress)} · $${dailyLimit} USDG / ${describeWindow(windowSeconds)}`,
            amount: `${dailyLimit} USDG`,
            amountPositive: false,
            status: 'executed',
            timestamp: new Date().toISOString(),
            txHash: res.userOpHash || '',
          });
          localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
        } catch {}

        setSelectedKey(agentAddress as Address);
        setPreviewSpentUnits(0n);
        setSim(null);
        await refresh();
      } else {
        const res = await revokeSessionKey(revokeTargetKey ?? undefined, pin);
        if (!res) throw new Error('Could not revoke the selected policy key.');
        setPreviewSpentUnits(0n);
        setSim(null);
        setRevokeTargetKey(null);
        await refresh();
      }
    } catch (e: any) {
      console.error(e);
      setFormError(String(e?.message || 'Something went wrong. Please try again.').slice(0, 220));
    } finally {
      if (mounted.current) setStatus('idle');
      setIsModalOpen(false);
    }
  };

  const handleAgentQuickTrade = async () => {
    setTradeResult(null);
    const parsed = parseFloat(tradeAmount || '0');
    if (!parsed || parsed <= 0) {
      setTradeResult({ ok: false, msg: 'Enter a valid swap amount greater than 0.' });
      return;
    }
    const tokenInfo = TRADE_TOKENS.find((t) => t.symbol === tradeFrom) || TRADE_TOKENS[0];
    const available = parseFloat(tokenBalances[tradeFrom] || '0');
    if (parsed > available) {
      setTradeResult({ ok: false, msg: `Insufficient ${tradeFrom} balance (${available} available).` });
      return;
    }
    setTradeBusy(true);
    try {
      const amountRaw = BigInt(Math.round(parsed * 10 ** tokenInfo.decimals));
      const res = await executeAgentSwap({
        sourceChainId: 421614,
        destChainId: 421614,
        fromToken: tradeFrom,
        toToken: tradeTo,
        amount: amountRaw,
        fromDecimals: tokenInfo.decimals,
        recipient: (address || undefined) as `0x${string}` | undefined,
        sessionKey: activeTradingPolicy?.sessionKey,
      });
      if (!res?.userOpHash) throw new Error('Swap did not return a transaction hash.');

      try {
        const stored = localStorage.getItem('invisible_wallet_activity');
        const existing = stored ? JSON.parse(stored) : [];
        existing.unshift({
          id: res.userOpHash,
          type: 'swap',
          title: `Agent Swap: ${tradeAmount} ${tradeFrom} -> ${quotedOut ?? '?'} ${tradeTo}`,
          subtitle: `Policy ${shortAddr(activeTradingPolicy?.sessionKey || '')} · Session Key (0x01)`,
          amount: `-${tradeAmount} ${tradeFrom}`,
          amountPositive: false,
          status: 'executed',
          timestamp: new Date().toISOString(),
          txHash: res.userOpHash,
        });
        localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
      } catch {}

      setTradeResult({
        ok: true,
        msg: `Swapped ${tradeAmount} ${tradeFrom} -> ${quotedOut ?? ''} ${tradeTo} passwordlessly.`,
        hash: res.userOpHash,
      });
      refetchBalances();
      await refresh();
    } catch (e: any) {
      setTradeResult({ ok: false, msg: String(e?.message || 'Agent trade blocked or failed.') });
    } finally {
      if (mounted.current) setTradeBusy(false);
    }
  };

  const canSave =
    !!address &&
    isAddress(agentAddress) &&
    isAddress(resolvedTargetAddress) &&
    Number(dailyLimit) > 0 &&
    Number(maxPerTx) > 0 &&
    Number(maxPerTx) <= Number(dailyLimit);

  const effectivePolicy: OnChainPolicy = selectedPolicy ?? {
    sessionKey: (isAddress(agentAddress) ? agentAddress : zeroAddress) as Address,
    kind: ruleKind,
    expiry: Math.floor(Date.now() / 1000) + durationHours * 3600,
    maxPerTx: usdgToUnits(maxPerTx || '0'),
    dailyLimit: usdgToUnits(dailyLimit || '0'),
    spentToday: previewSpentUnits,
    lastReset: Math.floor(Date.now() / 1000) - 60,
    windowSeconds,
    allowedTarget: (isAddress(resolvedTargetAddress) ? resolvedTargetAddress : SWAP_POOL_ADDRESS) as Address,
    isActive: true,
    effectiveSpentToday: previewSpentUnits,
    label: ruleLabel,
  };

  const maxPerTxUsdg = Number(unitsToUsdg(effectivePolicy.maxPerTx));
  const withinAmount = Math.max(1, Math.min(50, maxPerTxUsdg || 50));
  const overAmount = Math.max(5000, maxPerTxUsdg * 2);

  const runSim = async (kind: SimulationKind) => {
    const amount = kind === 'over_limit' ? overAmount : kind === 'within_limit' ? withinAmount : 10;
    setSimRunning(kind);
    const list = await refresh();
    const liveMatch =
      list.find((p) => p.sessionKey.toLowerCase() === effectivePolicy.sessionKey.toLowerCase()) ??
      effectivePolicy;
    const result = await simulateAgentSpend(
      address ? (address as Address) : null,
      liveMatch,
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

  const displayedSpent = selectedPolicy ? selectedPolicy.effectiveSpentToday : previewSpentUnits;
  const displayedDaily = selectedPolicy ? selectedPolicy.dailyLimit : effectivePolicy.dailyLimit;
  const spentPct = Math.min(100, Number((displayedSpent * 10000n) / (displayedDaily || 1n)) / 100);
  const busy = status !== 'idle';
  const dcaCount = policies.filter((p) => p.kind === 1).length;
  const agentOnlyCount = policies.filter((p) => p.kind === 0).length;

  return (
    <div className="p-5 sm:p-8 md:p-12 w-full max-w-6xl mx-auto space-y-8">
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
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                AI Trading &amp; Multi-Agent Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#ff4500]/15 text-[#ff4500] border border-[#ff4500]/30">
                ERC-7579 Multi-Policy v3
              </span>
            </div>
            <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
              Run concurrent AI trading keys, SwapPool DCA bots, and merchant subscriptions simultaneously without overwriting active allowances.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-[#141418] border border-white/[0.08] text-zinc-300">
            {agentOnlyCount} Agent{agentOnlyCount === 1 ? '' : 's'}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-[#141418] border border-white/[0.08] text-zinc-300">
            {dcaCount} DCA
          </span>
          <Link
            href="/subscription"
            className="px-3 py-1.5 rounded-xl bg-[#141418] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-300 transition-colors"
          >
            {subscriptionPolicies.length} Subscription{subscriptionPolicies.length === 1 ? '' : 's'}
          </Link>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200 flex items-center justify-between gap-3">
          <span>{formError}</span>
          <button type="button" onClick={() => setFormError(null)} className="text-xs text-zinc-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Multi-Policy Creator + Concurrent Policy Registry */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#141418] rounded-3xl p-6 sm:p-7 border border-white/[0.08] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                <IconShield size={19} className="text-[#ff4500]" />
                <span>Add Concurrent Agent / DCA Policy</span>
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'trader' as const, label: 'SwapPool Agent' },
                  { id: 'dca' as const, label: 'Weekly DCA' },
                  { id: 'micro' as const, label: 'Wildcard Micro' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#0d0d10] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] transition-colors"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Module Kind & Label */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-5 space-y-2">
                <label className="text-xs font-medium text-zinc-300">Module Kind</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-[#0d0d10] border border-white/[0.08] rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setRuleKind(0);
                      setWindowSeconds(86400);
                    }}
                    className={`py-2 rounded-lg transition-colors ${
                      ruleKind === 0 ? 'bg-[#ff4500] text-white font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    AI Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRuleKind(1);
                      setWindowSeconds(7 * 86400);
                    }}
                    className={`py-2 rounded-lg transition-colors ${
                      ruleKind === 1 ? 'bg-[#ff4500] text-white font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    DCA Bot
                  </button>
                </div>
              </div>
              <div className="sm:col-span-7 space-y-2">
                <label className="text-xs font-medium text-zinc-300">Strategy Label</label>
                <input
                  type="text"
                  value={ruleLabel}
                  onChange={(e) => setRuleLabel(e.target.value)}
                  placeholder="e.g. SwapPool Momentum Bot"
                  className="w-full h-11 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-[#ff4500]"
                />
              </div>
            </div>

            {/* Caps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">
                  {ruleKind === 1 ? 'DCA Window Budget' : 'Window Spending Limit'}
                </label>
                <div className="flex items-center bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 focus-within:border-[#ff4500]">
                  <input
                    type="number"
                    min="0"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full h-11 bg-transparent outline-none text-base text-white font-mono"
                  />
                  <span className="text-xs text-zinc-400 font-mono">USDG</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Max Per Single Trade</label>
                <div className="flex items-center bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 focus-within:border-[#ff4500]">
                  <input
                    type="number"
                    min="0"
                    value={maxPerTx}
                    onChange={(e) => setMaxPerTx(e.target.value)}
                    className="w-full h-11 bg-transparent outline-none text-base text-white font-mono"
                  />
                  <span className="text-xs text-zinc-400 font-mono">USDG</span>
                </div>
              </div>
            </div>

            {Number(maxPerTx) > Number(dailyLimit) && (
              <p className="text-xs text-amber-300">Max per single trade cannot exceed the window budget limit.</p>
            )}

            {/* Approved Target */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Approved Target Contract</label>
              <select
                value={targetSelect}
                onChange={(e) => setTargetSelect(e.target.value)}
                className="w-full h-11 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-[#ff4500] font-mono"
              >
                {POPULAR_TARGETS.map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.name} ({shortAddr(t.address)})
                  </option>
                ))}
                <option value="custom">Custom Contract Address...</option>
              </select>
              {targetSelect === 'custom' && (
                <input
                  type="text"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  placeholder="0x... contract address"
                  className="w-full h-11 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white font-mono outline-none focus:border-[#ff4500]"
                />
              )}
            </div>

            {/* Duration & Reset Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Key Expiration</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full h-11 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-[#ff4500] font-mono"
                >
                  <option value={4}>4 Hours</option>
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={168}>7 Days</option>
                  <option value={720}>30 Days</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Budget Reset Window</label>
                <select
                  value={windowSeconds}
                  onChange={(e) => setWindowSeconds(Number(e.target.value))}
                  className="w-full h-11 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-[#ff4500] font-mono"
                >
                  <option value={86400}>Every 24 Hours</option>
                  <option value={7 * 86400}>Every 7 Days (Weekly DCA)</option>
                  <option value={30 * 86400}>Every 30 Days (Monthly)</option>
                </select>
              </div>
            </div>

            {/* Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-zinc-300">Session Signer Key (secp256k1)</label>
                <button
                  type="button"
                  onClick={handleGenerateHelperKey}
                  className="text-xs text-[#ff4500] hover:underline font-medium"
                >
                  + Generate fresh keypair
                </button>
              </div>
              <input
                type="text"
                value={agentAddress}
                onChange={(e) => setAgentAddress(e.target.value.trim())}
                placeholder="0x... or tap Generate"
                className="w-full h-11 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-4 text-sm text-white font-mono outline-none focus:border-[#ff4500]"
              />
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
                <span>Saving Concurrent Policy...</span>
              ) : !address ? (
                <span>Unlock Wallet on Dashboard to Save</span>
              ) : (
                <>
                  <IconShield size={17} />
                  <span>Authorize Concurrent {POLICY_KIND_LABELS[ruleKind]}</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-zinc-500 text-center">
              Stored in <code className="text-zinc-300">mapping(address =&gt; Policy)</code> — preserves all existing AI keys, DCA strategies, and subscriptions.
            </p>
          </div>

          {/* Active Concurrent Policies List */}
          <div className="bg-[#141418] rounded-3xl p-6 sm:p-7 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Active Concurrent Policies</h3>
                <p className="text-xs text-zinc-400">Select a policy to trade with or inspect in the right panel, or revoke individually.</p>
              </div>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="text-xs font-mono text-zinc-300 hover:text-white underline underline-offset-4 disabled:opacity-40"
              >
                {loading ? 'Syncing...' : 'Refresh'}
              </button>
            </div>

            {policies.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#0d0d10] border border-white/[0.06] text-center space-y-2">
                <p className="text-sm text-zinc-300 font-medium">No on-chain policies active yet.</p>
                <p className="text-xs text-zinc-500">Authorize an AI Trading Agent or DCA Bot above to add your first rule.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {policies.map((p) => {
                  const isSelected = selectedPolicy?.sessionKey.toLowerCase() === p.sessionKey.toLowerCase();
                  const pct = Math.min(100, Number((p.effectiveSpentToday * 10000n) / (p.dailyLimit || 1n)) / 100);
                  return (
                    <div
                      key={p.sessionKey}
                      onClick={() => setSelectedKey(p.sessionKey)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? 'bg-[#0d0d10] border-[#ff4500]/60'
                          : 'bg-[#0d0d10] border-white/[0.06] hover:border-white/[0.16]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-[#ff4500]/15 text-[#ff4500] border border-[#ff4500]/30 shrink-0">
                            {POLICY_KIND_LABELS[p.kind]}
                          </span>
                          <span className="text-sm font-semibold text-white truncate">
                            {p.label || targetLabel(p.allowedTarget)}
                          </span>
                          <span className="text-xs font-mono text-zinc-500">{shortAddr(p.sessionKey)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${p.isActive ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-zinc-400 border-white/10'}`}>
                            {p.isActive ? describeExpiry(p.expiry) : 'Expired'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRevokeTargetKey(p.sessionKey);
                              setModalAction('revoke');
                              setIsModalOpen(true);
                            }}
                            disabled={busy}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white/[0.05] hover:bg-red-500/20 text-zinc-300 hover:text-red-200 border border-white/[0.08] transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs font-mono text-zinc-400">
                        <div>
                          <span className="block text-[10px] text-zinc-500">ALLOWED APP</span>
                          <span className="text-zinc-200 truncate block">{targetLabel(p.allowedTarget)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500">PER TX CAP</span>
                          <span className="text-white">${unitsToUsdg(p.maxPerTx)} USDG</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500">WINDOW ({describeWindow(p.windowSeconds)})</span>
                          <span className="text-white">
                            ${unitsToUsdg(p.effectiveSpentToday)} / ${unitsToUsdg(p.dailyLimit)}
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-[#ff4500] transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Passwordless Agent Swap Terminal & On-Chain Firewall Verifier */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#141418] rounded-3xl p-6 border border-white/[0.08] space-y-5">
            {/* Switch between Quick Trade and Firewall Verify */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#0d0d10] border border-white/[0.08] rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRightTab('trade')}
                className={`py-2.5 rounded-lg transition-colors ${
                  rightTab === 'trade' ? 'bg-[#ff4500] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Agent Trade Terminal
              </button>
              <button
                type="button"
                onClick={() => setRightTab('simulate')}
                className={`py-2.5 rounded-lg transition-colors ${
                  rightTab === 'simulate' ? 'bg-[#ff4500] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Firewall Eth-Call Test
              </button>
            </div>

            {rightTab === 'trade' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Executing Policy Key</span>
                    {activeTradingPolicy && (
                      <span className="font-mono text-[#ff4500]">
                        {POLICY_KIND_LABELS[activeTradingPolicy.kind]} · Left: $
                        {unitsToUsdg(
                          activeTradingPolicy.dailyLimit > activeTradingPolicy.effectiveSpentToday
                            ? activeTradingPolicy.dailyLimit - activeTradingPolicy.effectiveSpentToday
                            : 0n
                        )}
                      </span>
                    )}
                  </div>
                  {agentPolicies.length > 0 ? (
                    <select
                      value={activeTradingPolicy?.sessionKey || ''}
                      onChange={(e) => setSelectedKey(e.target.value as Address)}
                      className="w-full h-10 bg-[#0d0d10] border border-white/[0.08] rounded-xl px-3 text-xs font-mono text-white outline-none focus:border-[#ff4500]"
                    >
                      {agentPolicies.map((p) => (
                        <option key={p.sessionKey} value={p.sessionKey}>
                          {p.label || POLICY_KIND_LABELS[p.kind]} ({shortAddr(p.sessionKey)}) — max ${unitsToUsdg(p.maxPerTx)}/tx
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#0d0d10] border border-white/[0.06] text-xs text-zinc-400">
                      Authorize an AI Agent or DCA Bot on the left to trade passwordlessly.
                    </div>
                  )}
                </div>

                {/* Pay Input */}
                <div className="bg-[#0d0d10] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Agent Sells</span>
                    <span>
                      Bal: <strong className="text-white font-mono">{tokenBalances[tradeFrom] ?? '0.00'}</strong>{' '}
                      <button
                        type="button"
                        onClick={() => setTradeAmount(tokenBalances[tradeFrom] ?? '0')}
                        className="text-[#ff4500] hover:underline ml-1"
                      >
                        Max
                      </button>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      className="bg-transparent text-2xl font-mono font-bold text-white outline-none w-full"
                    />
                    <select
                      value={tradeFrom}
                      onChange={(e) => setTradeFrom(e.target.value)}
                      className="h-10 bg-[#141418] border border-white/[0.1] rounded-xl px-3 text-xs font-mono font-semibold text-white outline-none"
                    >
                      {TRADE_TOKENS.map((t) => (
                        <option key={t.symbol} value={t.symbol}>
                          {t.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {['10', '25', '50', '100'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTradeAmount(amt)}
                        className="px-2.5 py-1 rounded-lg bg-[#141418] hover:bg-white/[0.08] text-[11px] font-mono text-zinc-300 border border-white/[0.06]"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center -my-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = tradeFrom;
                      setTradeFrom(tradeTo);
                      setTradeTo(prev);
                    }}
                    className="w-8 h-8 rounded-full bg-[#1b1b21] hover:bg-[#ff4500] text-zinc-400 hover:text-white border border-white/[0.1] inline-flex items-center justify-center transition-colors"
                    title="Flip pair"
                  >
                    <IconSwapVert size={14} />
                  </button>
                </div>

                {/* Receive Preview */}
                <div className="bg-[#0d0d10] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Estimated SwapPool Output</span>
                    <span className="font-mono text-zinc-500">421614 On-Chain</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-2xl font-mono font-bold text-white truncate">
                      {quotingOut ? '...' : quotedOut ?? '—'}
                    </span>
                    <select
                      value={tradeTo}
                      onChange={(e) => setTradeTo(e.target.value)}
                      className="h-10 bg-[#141418] border border-white/[0.1] rounded-xl px-3 text-xs font-mono font-semibold text-white outline-none"
                    >
                      {TRADE_TOKENS.map((t) => (
                        <option key={t.symbol} value={t.symbol}>
                          {t.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleAgentQuickTrade()}
                  disabled={tradeBusy || !address || !activeTradingPolicy}
                  className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] disabled:opacity-45 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {tradeBusy ? 'Signing Session Key Batch (0x01)...' : 'Execute Passwordless Agent Swap'}
                </button>

                {tradeResult && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                      tradeResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <p className="font-medium leading-relaxed">{tradeResult.msg}</p>
                    {tradeResult.hash && (
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${tradeResult.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[#ff4500] hover:underline break-all"
                      >
                        <span>{shortAddr(tradeResult.hash)}</span>
                        <IconArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sends live read-only <code className="text-zinc-200 font-mono">eth_call</code> probes against deployed{' '}
                  <code className="text-zinc-200 font-mono">StylusSafeAccount v3</code> (<code className="font-mono">0x0242...5888</code>).
                </p>

                <div className="space-y-2.5">
                  {(
                    [
                      { kind: 'within_limit', label: `Try a $${withinAmount} trade`, hint: 'Inside policy caps' },
                      { kind: 'over_limit', label: `Try a $${overAmount.toLocaleString()} trade`, hint: 'Above per-tx cap' },
                      { kind: 'unapproved_app', label: 'Try an unapproved app', hint: 'Off allowlist' },
                    ] as { kind: SimulationKind; label: string; hint: string }[]
                  ).map((t) => (
                    <button
                      key={t.kind}
                      type="button"
                      onClick={() => void runSim(t.kind)}
                      disabled={simRunning !== null}
                      className="w-full h-12 px-4 bg-[#0d0d10] hover:bg-white/[0.06] disabled:opacity-40 border border-white/[0.08] rounded-xl text-left transition-all flex items-center justify-between gap-3"
                    >
                      <span className="text-sm font-medium text-white">
                        {simRunning === t.kind ? 'Calling Arbitrum Sepolia...' : t.label}
                      </span>
                      <span className="text-xs text-zinc-400 shrink-0">{t.hint}</span>
                    </button>
                  ))}
                </div>

                {sim && (
                  <div className="p-4 rounded-2xl bg-[#0d0d10] border border-white/[0.1] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{sim.result.title}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-200">
                        {sim.result.verdict === 'approved' ? 'Allowed' : sim.result.verdict === 'blocked' ? 'Blocked' : 'Error'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{sim.result.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Policy Telemetry Card */}
          <div className="bg-[#141418] rounded-3xl p-6 border border-white/[0.08] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <IconCheck size={16} className="text-[#ff4500]" />
                <span>{selectedPolicy ? 'Inspecting Selected Policy' : 'Form Rule Preview'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-mono bg-white/[0.05] text-zinc-300">
                {POLICY_KIND_LABELS[effectivePolicy.kind]}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-zinc-400">Session / Payee Key</span>
                <span className="text-white font-mono">{shortAddr(effectivePolicy.sessionKey)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Allowed Target</span>
                <span className="text-white font-mono">{targetLabel(effectivePolicy.allowedTarget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Single Trade Cap</span>
                <span className="text-white font-mono font-semibold">${unitsToUsdg(effectivePolicy.maxPerTx)} USDG</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Window ({describeWindow(effectivePolicy.windowSeconds)}) Spend</span>
                  <span className="text-white font-mono font-semibold">
                    ${unitsToUsdg(displayedSpent)} / ${unitsToUsdg(displayedDaily)} USDG
                  </span>
                </div>
                <div className="w-full h-2 bg-[#0d0d10] rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff4500] transition-all duration-300" style={{ width: `${spentPct}%` }} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-zinc-500">
              <span>
                {readError
                  ? `RPC: ${readError}`
                  : checkedAt
                    ? `Synced ${new Date(checkedAt).toLocaleTimeString()}`
                    : 'Arbitrum Sepolia Live'}
              </span>
              <span className="font-mono flex items-center gap-1">
                <IconKey size={12} /> 0x0242...5888
              </span>
            </div>
          </div>
        </div>
      </div>

      <SignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText={
          modalAction === 'set_policy'
            ? `Authorize ${POLICY_KIND_LABELS[ruleKind]}`
            : `Revoke Key ${revokeTargetKey ? shortAddr(revokeTargetKey) : ''}`
        }
        amountText={
          modalAction === 'set_policy'
            ? `${ruleLabel || POLICY_KIND_LABELS[ruleKind]} · $${dailyLimit} USDG`
            : 'Other concurrent agents and subscriptions stay active'
        }
        onSign={handleAuthorize}
      />
    </div>
  );
}
