'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';
import { SignModal } from '@/components/SignModal';
import { IconSwapVert, IconCheck, IconShield, IconFingerprint, IconArrowUpRight } from '@/components/Icons';

const TOKENS = [
  { symbol: 'USDG', name: 'Global Dollar (Treasury)', decimals: 6, priceUsd: 1.0, isNative: true },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, priceUsd: 1.0, isNative: false },
  { symbol: 'ETH', name: 'Ether', decimals: 18, priceUsd: 2500.0, isNative: false },
  { symbol: 'ARB', name: 'Arbitrum', decimals: 18, priceUsd: 0.85, isNative: false },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, priceUsd: 1.0, isNative: false },
  { symbol: 'DEGEN', name: 'Degen Base', decimals: 18, priceUsd: 0.01, isNative: false },
  { symbol: 'UNI', name: 'Uniswap', decimals: 18, priceUsd: 7.5, isNative: false },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, priceUsd: 65000.0, isNative: false },
];

const CHAINS = [
  { name: 'Arbitrum Sepolia', id: 421614 },
  { name: 'Base', id: 8453 },
  { name: 'Optimism', id: 10 },
  { name: 'Polygon', id: 137 },
  { name: 'Ethereum', id: 1 },
];

type AcrossFee = { relayFeeTotal: string; estimatedFillTimeSec: number } | null;

export default function TransferPage() {
  const { address, login, executeCrossChainSwap, executeAgentSwap, isPending } = useInvisibleWallet();
  const [amount, setAmount] = useState('50');
  const [recipient, setRecipient] = useState('');
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [selectedDestToken, setSelectedDestToken] = useState(TOKENS[1]);
  const [selectedSourceChain, setSelectedSourceChain] = useState(CHAINS[0]);
  const [selectedDestChain, setSelectedDestChain] = useState(CHAINS[1]);
  const [executionMode, setExecutionMode] = useState<'personal' | 'agent'>('personal');
  const [modalPurpose, setModalPurpose] = useState<'swap' | 'login'>('swap');

  const { usdgBalance, ethBalance, usdcBalance, tokenBalances, refetch } = useBalances(address, 421614);

  const [agentMaxPerTx, setAgentMaxPerTx] = useState<number>(100);
  const [agentDailyLimit, setAgentDailyLimit] = useState<number>(500);
  const [agentSpentToday, setAgentSpentToday] = useState<number>(0);

  const syncAgentLimits = useCallback(() => {
    if (typeof window === 'undefined') return;
    const maxStr = localStorage.getItem('invisible_wallet_session_max_per_tx');
    const dailyStr = localStorage.getItem('invisible_wallet_session_daily_limit');
    const spentStr = localStorage.getItem('invisible_wallet_session_spent_today');
    if (maxStr) setAgentMaxPerTx(Number(maxStr) / 1e6);
    if (dailyStr) setAgentDailyLimit(Number(dailyStr) / 1e6);
    if (spentStr) setAgentSpentToday(Number(spentStr) / 1e6);
  }, []);

  useEffect(() => {
    syncAgentLimits();
  }, [syncAgentLimits]);

  const getBalanceForToken = (symbol = selectedToken.symbol) => {
    if (tokenBalances[symbol] !== undefined) return tokenBalances[symbol];
    if (symbol === 'USDG') return usdgBalance;
    if (symbol === 'USDC') return usdcBalance;
    if (symbol === 'ETH') return ethBalance;
    return '0.00';
  };

  const computeEstimatedOutput = () => {
    const parsed = parseFloat(amount || '0');
    if (!parsed || parsed <= 0) return '0.00';
    const usdIn = parsed * selectedToken.priceUsd;
    const outTokens = (usdIn / selectedDestToken.priceUsd) * 0.998;
    const decimalsToShow = selectedDestToken.priceUsd >= 1000 ? 5 : selectedDestToken.priceUsd < 0.1 ? 0 : 2;
    return outTokens.toFixed(decimalsToShow);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [acrossFee, setAcrossFee] = useState<AcrossFee>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLifiQuote = useCallback(async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setAcrossFee(null);
      return;
    }
    setAcrossFee({ relayFeeTotal: '0', estimatedFillTimeSec: 3 });
  }, [amount]);

  useEffect(() => {
    const timer = setTimeout(fetchLifiQuote, 300);
    return () => clearTimeout(timer);
  }, [fetchLifiQuote]);

  const handleFlipDirection = () => {
    const prevSrcChain = selectedSourceChain;
    const prevDestChain = selectedDestChain;
    const prevSrcToken = selectedToken;
    const prevDestToken = selectedDestToken;

    setSelectedSourceChain(prevDestChain);
    setSelectedDestChain(prevSrcChain);
    setSelectedToken(prevDestToken);
    setSelectedDestToken(prevSrcToken);
  };

  const recordSwapActivity = (hash: string, outFormatted: string, viaAgent: boolean) => {
    try {
      const stored = localStorage.getItem('invisible_wallet_activity');
      const existing = stored ? JSON.parse(stored) : [];
      existing.unshift({
        id: hash || Date.now().toString(),
        type: 'swap',
        title: `${viaAgent ? 'AI Agent Swap' : 'Swapped'}: ${amount} ${selectedToken.symbol} → ${outFormatted} ${selectedDestToken.symbol}`,
        subtitle: `${selectedSourceChain.name} → ${selectedDestChain.name} • ${viaAgent ? 'Session Key (0x01)' : 'RIP-7212 Passkey'}`,
        amount: `-${amount} ${selectedToken.symbol}`,
        amountPositive: false,
        status: 'executed',
        timestamp: new Date().toISOString(),
        txHash: hash,
      });
      localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
    } catch {
      // ignore storage errors
    }
  };

  const handlePersonalTransfer = async (pin: string) => {
    setErrorMsg('');
    try {
      if (modalPurpose === 'login') {
        await login();
        setIsModalOpen(false);
        return;
      }

      const parsed = parseFloat(amount);
      if (!parsed || parsed <= 0) throw new Error('Enter a valid swap amount greater than 0.');
      const currentBal = parseFloat(getBalanceForToken(selectedToken.symbol));
      if (parsed > currentBal) {
        throw new Error(`Insufficient ${selectedToken.symbol} balance (${currentBal} available).`);
      }

      const outFormatted = computeEstimatedOutput();
      const amountRaw = BigInt(Math.round(parsed * 10 ** selectedToken.decimals));
      const result = await executeCrossChainSwap(
        selectedSourceChain.id,
        selectedDestChain.id,
        selectedToken.symbol,
        selectedDestToken.symbol,
        amountRaw,
        (recipient || address) as `0x${string}`,
        pin || undefined
      );
      if (result) {
        setTxHash(result.userOpHash);
        setStatus('success');
        recordSwapActivity(result.userOpHash, outFormatted, false);
        refetch();
      } else {
        setStatus('error');
        setErrorMsg('Cross-chain swap failed. Check network connectivity.');
      }
    } catch (e: any) {
      console.error('Transfer execution failed:', e);
      setStatus('error');
      setErrorMsg(e?.message ?? 'Execution error');
    } finally {
      setIsModalOpen(false);
    }
  };

  const handleAgentExecution = async () => {
    setErrorMsg('');
    setStatus('idle');
    try {
      const parsed = parseFloat(amount);
      if (!parsed || parsed <= 0) throw new Error('Enter a valid swap amount greater than 0.');
      const currentBal = parseFloat(getBalanceForToken(selectedToken.symbol));
      if (parsed > currentBal) {
        throw new Error(`Insufficient ${selectedToken.symbol} balance (${currentBal} available).`);
      }

      const outFormatted = computeEstimatedOutput();
      const amountRaw = BigInt(Math.round(parsed * 10 ** selectedToken.decimals));
      const result = await executeAgentSwap({
        sourceChainId: selectedSourceChain.id,
        destChainId: selectedDestChain.id,
        fromToken: selectedToken.symbol,
        toToken: selectedDestToken.symbol,
        amount: amountRaw,
        fromDecimals: selectedToken.decimals,
        recipient: (recipient || address) as `0x${string}`,
      });

      if (result) {
        setTxHash(result.userOpHash);
        setStatus('success');
        recordSwapActivity(result.userOpHash, outFormatted, true);
        syncAgentLimits();
        refetch();
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message ?? 'Agent swap blocked by spending firewall.');
    }
  };

  const handlePrimaryAction = () => {
    if (!address) {
      setModalPurpose('login');
      setIsModalOpen(true);
      return;
    }
    if (executionMode === 'agent') {
      void handleAgentExecution();
    } else {
      setModalPurpose('swap');
      setIsModalOpen(true);
    }
  };

  const remainingDailyCap = Math.max(0, agentDailyLimit - agentSpentToday);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 sm:p-8 md:p-10 w-full max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Cross-Chain Swap
          </h1>
          <p className="text-sm text-[#8e8e98] mt-1">
            Swap tokens across networks with sponsored gas. Switch between FaceID signing or passwordless AI Agent execution.
          </p>
        </div>

        {/* Execution Mode Segment */}
        <div className="flex items-center gap-1 p-1 bg-[#141418] border border-white/[0.08] rounded-xl self-start sm:self-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setExecutionMode('personal');
              setStatus('idle');
            }}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              executionMode === 'personal'
                ? 'bg-[#ff4500] text-white font-semibold shadow-sm'
                : 'text-[#8e8e98] hover:text-white'
            }`}
          >
            Personal (FaceID)
          </button>
          <button
            type="button"
            onClick={() => {
              setExecutionMode('agent');
              setStatus('idle');
            }}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              executionMode === 'agent'
                ? 'bg-[#ff4500] text-white font-semibold shadow-sm'
                : 'text-[#8e8e98] hover:text-white'
            }`}
          >
            Guarded Agent Mode
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="bg-[#141418] border border-white/[0.1] rounded-2xl p-8 max-w-lg mx-auto text-center space-y-5 shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#ff4500]/15 border border-[#ff4500]/30 flex items-center justify-center mx-auto text-[#ff4500]">
              <IconCheck size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Swap Settled On-Chain</h2>
              <p className="text-sm text-[#8e8e98] mt-1.5 max-w-sm mx-auto leading-relaxed">
                Swapped <strong className="text-white">{amount} {selectedToken.symbol}</strong> for{' '}
                <strong className="text-white">{computeEstimatedOutput()} {selectedDestToken.symbol}</strong> on {selectedDestChain.name}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left p-3.5 bg-[#09090b] rounded-xl border border-white/[0.06] text-xs">
              <div>
                <span className="text-[#8e8e98] block">Updated {selectedToken.symbol} Balance</span>
                <span className="text-white font-mono font-semibold text-sm">{getBalanceForToken(selectedToken.symbol)} {selectedToken.symbol}</span>
              </div>
              <div>
                <span className="text-[#8e8e98] block">Updated {selectedDestToken.symbol} Balance</span>
                <span className="text-white font-mono font-semibold text-sm">{getBalanceForToken(selectedDestToken.symbol)} {selectedDestToken.symbol}</span>
              </div>
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
                className="h-11 px-6 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] text-white rounded-xl text-xs font-semibold transition-all"
              >
                New Swap
              </button>
              <Link
                href="/activity"
                className="h-11 px-6 bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-white border border-white/[0.08] rounded-xl text-xs font-semibold flex items-center transition-all"
              >
                View Activity
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid lg:grid-cols-12 gap-8 items-start"
          >
            {/* Main Swap Card (7 Cols) */}
            <div className="lg:col-span-7 bg-[#141418] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-sm">
              {status === 'error' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start justify-between gap-3 leading-relaxed">
                  <span>{errorMsg}</span>
                  <button onClick={() => setStatus('idle')} className="text-[#8e8e98] hover:text-white shrink-0">✕</button>
                </div>
              )}

              {/* Source Panel */}
              <div className="bg-[#09090b] p-4 sm:p-5 rounded-xl space-y-3 border border-white/[0.06]">
                <div className="flex justify-between items-center text-xs text-[#8e8e98]">
                  <span>You pay</span>
                  <div className="flex items-center gap-2">
                    <span>
                      Balance: <strong className="text-white font-mono">{getBalanceForToken(selectedToken.symbol)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmount(getBalanceForToken(selectedToken.symbol))}
                      className="text-[#ff4500] hover:underline font-semibold"
                    >
                      Max
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="bg-transparent text-2xl sm:text-3xl font-mono font-bold text-white outline-none w-full tabular-nums"
                  />

                  <select
                    value={selectedToken.symbol}
                    onChange={(e) => setSelectedToken(TOKENS.find((t) => t.symbol === e.target.value) || TOKENS[0])}
                    className="h-11 bg-[#141418] border border-white/[0.1] rounded-xl px-3 text-sm font-semibold text-white outline-none focus:border-[#ff4500] font-mono cursor-pointer shrink-0"
                  >
                    {TOKENS.map((t) => (
                      <option key={t.symbol} value={t.symbol}>
                        {t.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-xs text-[#8e8e98]">
                  <span>Origin network</span>
                  <select
                    value={selectedSourceChain.id}
                    onChange={(e) => setSelectedSourceChain(CHAINS.find((c) => c.id === Number(e.target.value)) || CHAINS[0])}
                    className="bg-[#141418] border border-white/[0.08] rounded-lg px-2.5 py-1 text-white font-medium outline-none cursor-pointer"
                  >
                    {CHAINS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Direction Flip */}
              <div className="flex justify-center -my-2 relative z-10">
                <button
                  type="button"
                  onClick={handleFlipDirection}
                  className="w-9 h-9 rounded-full bg-[#1b1b21] hover:bg-[#ff4500] text-[#8e8e98] hover:text-white border border-white/[0.1] inline-flex items-center justify-center transition-colors shadow-sm active:scale-95"
                  title="Swap origin and destination"
                >
                  <IconSwapVert size={16} />
                </button>
              </div>

              {/* Destination Panel */}
              <div className="bg-[#09090b] p-4 sm:p-5 rounded-xl space-y-3 border border-white/[0.06]">
                <div className="flex justify-between items-center text-xs text-[#8e8e98]">
                  <span>You receive (estimated)</span>
                  <span>
                    Balance: <strong className="text-white font-mono">{getBalanceForToken(selectedDestToken.symbol)}</strong>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums truncate">
                    {computeEstimatedOutput()}
                  </div>

                  <select
                    value={selectedDestToken.symbol}
                    onChange={(e) => setSelectedDestToken(TOKENS.find((t) => t.symbol === e.target.value) || TOKENS[1])}
                    className="h-11 bg-[#141418] border border-white/[0.1] rounded-xl px-3 text-sm font-semibold text-white outline-none focus:border-[#ff4500] font-mono cursor-pointer shrink-0"
                  >
                    {TOKENS.map((t) => (
                      <option key={t.symbol} value={t.symbol}>
                        {t.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-xs text-[#8e8e98]">
                  <span>Destination network</span>
                  <select
                    value={selectedDestChain.id}
                    onChange={(e) => setSelectedDestChain(CHAINS.find((c) => c.id === Number(e.target.value)) || CHAINS[1])}
                    className="bg-[#141418] border border-white/[0.08] rounded-lg px-2.5 py-1 text-white font-medium outline-none cursor-pointer"
                  >
                    {CHAINS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destination Address Field */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#8e8e98]">Recipient Address (optional)</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={
                    address
                      ? `Defaults to your wallet (${address.slice(0, 6)}...${address.slice(-4)})`
                      : '0x...'
                  }
                  className="w-full h-11 bg-[#09090b] border border-white/[0.08] rounded-xl px-3.5 text-xs font-mono text-white outline-none focus:border-[#ff4500]"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isPending || (Boolean(address) && (!amount || parseFloat(amount) <= 0))}
                className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] disabled:opacity-40 text-white rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
              >
                {isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Settling on Arbitrum Sepolia...</span>
                  </span>
                ) : !address ? (
                  <span className="inline-flex items-center gap-2">
                    <IconFingerprint size={16} />
                    <span>Unlock Wallet with Biometrics to Swap</span>
                  </span>
                ) : executionMode === 'personal' ? (
                  <span className="inline-flex items-center gap-2">
                    <IconFingerprint size={16} />
                    <span>Swap {amount || '0'} {selectedToken.symbol} with FaceID / Passkey</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <IconShield size={16} />
                    <span>Execute Instant Swap as Guarded AI Agent</span>
                  </span>
                )}
              </button>
            </div>

            {/* Route & Guardrail Info (5 Cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-[#141418] border border-white/[0.08] rounded-2xl p-6 space-y-4 text-sm">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <span className="font-semibold text-white">Swap Details</span>
                  <span className="text-[#c4c4cc] font-mono text-xs">Arbitrum Sepolia Solver</span>
                </div>

                <div className="space-y-3 text-xs text-[#8e8e98]">
                  <div className="flex justify-between">
                    <span>Exchange Rate</span>
                    <span className="text-white font-mono">
                      1 {selectedToken.symbol} ≈ {(selectedToken.priceUsd / selectedDestToken.priceUsd).toFixed(selectedDestToken.priceUsd > 100 ? 4 : 2)} {selectedDestToken.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Settlement Time</span>
                    <span className="text-white tabular-nums">~{acrossFee?.estimatedFillTimeSec || 3} seconds</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gas Fee</span>
                    <span className="text-white font-medium">Sponsored ($0.00)</span>
                  </div>
                  <div className="pt-2.5 border-t border-white/[0.06] flex justify-between text-white font-medium">
                    <span>Estimated Output</span>
                    <span className="font-mono">
                      {computeEstimatedOutput()} {selectedDestToken.symbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guardrail Policy Status */}
              <div className="bg-[#141418] border border-white/[0.08] rounded-2xl p-6 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                  <span className="font-semibold text-white text-sm">AI Spending Rules</span>
                  <Link href="/trading" className="text-[#ff4500] hover:underline font-medium">
                    Edit Rules
                  </Link>
                </div>
                <p className="text-[#8e8e98] leading-relaxed">
                  In <strong className="text-white">Guarded Agent Mode</strong>, swaps run immediately without a FaceID prompt as long as they stay under your per-trade and 24-hour limits.
                </p>
                <div className="pt-2 space-y-2 text-[#8e8e98]">
                  <div className="flex justify-between">
                    <span>Max Per Trade</span>
                    <span className="text-white font-mono font-semibold">${agentMaxPerTx.toFixed(2)} USDG</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining 24h Allowance</span>
                    <span className="text-white font-mono font-semibold">${remainingDailyCap.toFixed(2)} / ${agentDailyLimit.toFixed(2)} USDG</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText={modalPurpose === 'login' ? 'Unlock Biometric Wallet' : 'Confirm Cross-Chain Swap'}
        amountText={
          modalPurpose === 'login'
            ? 'Verify FaceID / Passkey / PIN'
            : `${amount} ${selectedToken.symbol} → ${computeEstimatedOutput()} ${selectedDestToken.symbol}`
        }
        defaultMode="faceid"
        onSign={handlePersonalTransfer}
      />
    </motion.div>
  );
}
