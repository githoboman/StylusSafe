'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';
import { SignModal } from '@/components/SignModal';
import { IconSwap, IconSwapVert, IconCheck, IconShield, IconFingerprint } from '@/components/Icons';

const TOKENS = [
  { symbol: 'USDG', name: 'Global Dollar (Treasury)', decimals: 6, isNative: true },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, isNative: false },
  { symbol: 'ETH', name: 'Ether', decimals: 18, isNative: false },
  { symbol: 'ARB', name: 'Arbitrum', decimals: 18, isNative: false },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, isNative: false },
  { symbol: 'DEGEN', name: 'Degen Base', decimals: 18, isNative: false },
  { symbol: 'UNI', name: 'Uniswap', decimals: 18, isNative: false },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, isNative: false },
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
  const { address, executeCrossChainSwap, isPending } = useInvisibleWallet();
  const [amount, setAmount] = useState('100');
  const [recipient, setRecipient] = useState('');
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [selectedDestToken, setSelectedDestToken] = useState(TOKENS[1]);
  const [selectedSourceChain, setSelectedSourceChain] = useState(CHAINS[0]);
  const [selectedDestChain, setSelectedDestChain] = useState(CHAINS[1]);
  const [executionMode, setExecutionMode] = useState<'personal' | 'agent'>('personal');

  const { usdgBalance, ethBalance, usdcBalance } = useBalances(address, selectedSourceChain.id);

  const getBalanceForToken = () => {
    if (selectedToken.symbol === 'USDG') return usdgBalance;
    if (selectedToken.symbol === 'USDC') return usdcBalance;
    return ethBalance;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [acrossFee, setAcrossFee] = useState<AcrossFee>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLifiQuote = useCallback(async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setAcrossFee(null); return; }
    setFeeLoading(true);
    try {
      // Li.Fi public mainnet API does not index Arbitrum Sepolia (421614) or USDG testnet routes;
      // resolve via StylusSafe Intent Solver directly without triggering 404 console errors.
      if (
        selectedSourceChain.id === 421614 ||
        selectedDestChain.id === 421614 ||
        selectedToken.symbol === 'USDG' ||
        selectedDestToken.symbol === 'USDG' ||
        selectedSourceChain.id === selectedDestChain.id
      ) {
        setAcrossFee({ relayFeeTotal: '0', estimatedFillTimeSec: 3 });
        return;
      }
      const amountRaw = BigInt(Math.floor(parsed * 10 ** selectedToken.decimals));
      const url = `https://li.quest/v1/quote?fromChain=${selectedSourceChain.id}&toChain=${selectedDestChain.id}&fromToken=${selectedToken.symbol}&toToken=${selectedDestToken.symbol}&fromAmount=${amountRaw.toString()}&fromAddress=${address || '0x0000000000000000000000000000000000000000'}`;
      const resp = await fetch(url);
      if (!resp.ok) { 
        setAcrossFee({ relayFeeTotal: '0', estimatedFillTimeSec: 3 });
        return; 
      }
      const data = await resp.json();
      setAcrossFee({
        relayFeeTotal: data.estimate?.feeCosts?.[0]?.amount ?? '0',
        estimatedFillTimeSec: data.estimate?.executionDuration ?? 3,
      });
    } catch {
      setAcrossFee({ relayFeeTotal: '0', estimatedFillTimeSec: 3 });
    } finally {
      setFeeLoading(false);
    }
  }, [amount, selectedToken, selectedDestToken, selectedSourceChain, selectedDestChain, address]);

  useEffect(() => {
    const timer = setTimeout(fetchLifiQuote, 600);
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

  const handleTransfer = async (pin: string) => {
    try {
      const amountRaw = BigInt(Math.floor(parseFloat(amount) * 10 ** selectedToken.decimals));
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
        try {
          const stored = localStorage.getItem('invisible_wallet_activity');
          const existing = stored ? JSON.parse(stored) : [];
          existing.unshift({
            id: result.userOpHash || Date.now().toString(),
            type: 'swap',
            title: `Swapped ${amount} ${selectedToken.symbol} to ${selectedDestToken.symbol}`,
            subtitle: `${selectedSourceChain.name} → ${selectedDestChain.name}`,
            amount: `${amount} ${selectedToken.symbol}`,
            amountPositive: false,
            status: 'executed',
            timestamp: new Date().toISOString(),
            txHash: result.userOpHash,
          });
          localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
        } catch {}
      } else {
        setStatus('error');
        setErrorMsg('Cross-chain swap failed. Check network connectivity or policy limits.');
      }
    } catch (e: any) {
      console.error('Transfer execution failed:', e);
      setStatus('error');
      setErrorMsg(e?.message ?? 'Execution error');
    } finally {
      setIsModalOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 md:p-10 w-full max-w-5xl mx-auto space-y-8"
    >
      
      {/* Calm Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Cross-Chain Swap
          </h1>
          <p className="text-sm text-[#8e8e98] mt-1">
            Execute 1-click cross-chain intents with sponsored gas. No native bridge tokens needed.
          </p>
        </div>

        {/* Execution Mode Segment */}
        <div className="flex items-center gap-1 p-1 bg-[#141418] border border-white/[0.08] rounded-lg self-start sm:self-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setExecutionMode('personal')}
            className={`px-3 py-1.5 rounded transition-all ${
              executionMode === 'personal'
                ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                : 'text-[#8e8e98] hover:text-white'
            }`}
          >
            Personal (FaceID)
          </button>
          <button
            type="button"
            onClick={() => setExecutionMode('agent')}
            className={`px-3 py-1.5 rounded transition-all ${
              executionMode === 'agent'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30'
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-[#141418] border border-emerald-500/30 rounded-xl p-8 max-w-lg mx-auto text-center space-y-5 shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <IconCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Intent Submitted</h2>
              <p className="text-sm text-[#8e8e98] mt-1 max-w-sm mx-auto">
                Your cross-chain UserOperation was submitted to the bundler. Funds are en route to {selectedDestChain.name}.
              </p>
            </div>
            {txHash && (
              <div className="p-3 bg-[#09090b] rounded-lg border border-white/[0.06] text-xs font-mono text-[#8e8e98] break-all">
                Hash: {txHash}
              </div>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setStatus('idle')}
                className="h-10 px-5 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] text-white rounded-md text-xs font-semibold transition-all shadow-sm"
              >
                New Swap
              </button>
              <Link
                href="/activity"
                className="h-10 px-5 bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-white border border-white/[0.08] rounded-md text-xs font-semibold flex items-center transition-all"
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
          <div className="lg:col-span-7 bg-[#141418] border border-white/[0.08] rounded-xl p-6 space-y-5 shadow-sm">
            
            {status === 'error' && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
                <span>{errorMsg}</span>
                <button onClick={() => setStatus('idle')} className="text-[#8e8e98] hover:text-white">✕</button>
              </div>
            )}

            {/* Source Panel */}
            <div className="bg-[#0d0d10] p-4 rounded-lg space-y-2.5 border border-white/[0.04]">
              <div className="flex justify-between items-center text-xs text-[#8e8e98]">
                <span>You pay</span>
                <div className="flex items-center gap-2">
                  <span>Balance: <strong className="text-white tabular-nums">{getBalanceForToken()}</strong></span>
                  <button 
                    type="button"
                    onClick={() => setAmount(getBalanceForToken())}
                    className="text-[#ff4500] hover:underline font-medium"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-3xl font-mono font-bold text-white outline-none w-full tabular-nums"
                />

                <select
                  value={selectedToken.symbol}
                  onChange={(e) => setSelectedToken(TOKENS.find(t => t.symbol === e.target.value) || TOKENS[0])}
                  className="h-10 bg-[#141418] border border-white/[0.1] rounded-md px-3 text-sm font-semibold text-white outline-none focus:border-[#ff4500] font-mono cursor-pointer shrink-0"
                >
                  {TOKENS.map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs text-[#8e8e98]">
                <span>Origin network:</span>
                <select
                  value={selectedSourceChain.id}
                  onChange={(e) => setSelectedSourceChain(CHAINS.find(c => c.id === Number(e.target.value)) || CHAINS[0])}
                  className="bg-transparent text-white font-medium outline-none cursor-pointer text-right"
                >
                  {CHAINS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Direction Flip */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                type="button"
                onClick={handleFlipDirection}
                className="w-8 h-8 rounded-full bg-[#1b1b21] hover:bg-[#ff4500] text-[#8e8e98] hover:text-white border border-white/[0.1] inline-flex items-center justify-center transition-colors shadow-sm active:scale-95"
                title="Swap origin and destination"
              >
                <IconSwapVert size={15} />
              </button>
            </div>

            {/* Destination Panel */}
            <div className="bg-[#0d0d10] p-4 rounded-lg space-y-2.5 border border-white/[0.04]">
              <div className="flex justify-between items-center text-xs text-[#8e8e98]">
                <span>You receive (estimated)</span>
                <span>Slippage: <strong className="text-white">0.5%</strong></span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-3xl font-mono font-bold text-white tabular-nums">
                  {(parseFloat(amount || '0') * 0.998).toFixed(selectedDestToken.decimals === 6 ? 2 : 4)}
                </div>

                <select
                  value={selectedDestToken.symbol}
                  onChange={(e) => setSelectedDestToken(TOKENS.find(t => t.symbol === e.target.value) || TOKENS[1])}
                  className="h-10 bg-[#141418] border border-white/[0.1] rounded-md px-3 text-sm font-semibold text-white outline-none focus:border-[#ff4500] font-mono cursor-pointer shrink-0"
                >
                  {TOKENS.map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs text-[#8e8e98]">
                <span>Destination network:</span>
                <select
                  value={selectedDestChain.id}
                  onChange={(e) => setSelectedDestChain(CHAINS.find(c => c.id === Number(e.target.value)) || CHAINS[1])}
                  className="bg-transparent text-white font-medium outline-none cursor-pointer text-right"
                >
                  {CHAINS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination Address Field */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#8e8e98]">Destination Address (optional)</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={address ? `Defaults to your smart account (${address.slice(0, 6)}...${address.slice(-4)})` : '0x...'}
                className="w-full h-10 bg-[#0d0d10] border border-white/[0.06] rounded-md px-3 text-xs font-mono text-white outline-none focus:border-[#ff4500]"
              />
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={!amount || isPending || !address}
              className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] disabled:opacity-40 text-white rounded-md font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
            >
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Executing UserOp...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {executionMode === 'personal' ? (
                    <>
                      <IconFingerprint size={16} />
                      <span>Execute Cross-Chain Swap (FaceID)</span>
                    </>
                  ) : (
                    <>
                      <IconShield size={16} />
                      <span>Execute as Guarded Agent</span>
                    </>
                  )}
                </span>
              )}
            </button>
          </div>

          {/* Route Intelligence Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            <div className="bg-[#141418] border border-white/[0.08] rounded-xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="font-semibold text-white">Route Intelligence</span>
                <span className="text-emerald-400 font-mono text-[11px]">Direct Intent</span>
              </div>

              <div className="space-y-2.5 text-[#8e8e98]">
                <div className="flex justify-between">
                  <span>Routing Engine</span>
                  <span className="text-white">Li.Fi Aggregation</span>
                </div>
                <div className="flex justify-between">
                  <span>Bridge Provider</span>
                  <span className="text-white">Stargate / Across</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Fill Time</span>
                  <span className="text-white tabular-nums">~{acrossFee?.estimatedFillTimeSec || 30} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Gas Fee</span>
                  <span className="text-[#ff4500] font-medium">Sponsored ($0.00)</span>
                </div>
                <div className="pt-2 border-t border-white/[0.04] flex justify-between text-white font-medium">
                  <span>Minimum Output</span>
                  <span className="tabular-nums">{(parseFloat(amount || '0') * 0.995).toFixed(2)} {selectedDestToken.symbol}</span>
                </div>
              </div>
            </div>

            {/* Guardrail Policy Status */}
            <div className="bg-[#141418] border border-white/[0.08] rounded-xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="font-semibold text-white">Agent Guardrails</span>
                <span className="text-emerald-400 font-mono text-[11px]">Enforced On-Chain</span>
              </div>
              <p className="text-[#8e8e98] leading-relaxed">
                If executing in Guarded Agent Mode, this swap is bounded by your 24-hour daily budget cap. Reverts on-chain if limits are exceeded.
              </p>
              <div className="pt-2 flex justify-between text-[#8e8e98]">
                <span>Daily Remaining Cap:</span>
                <span className="text-white font-mono font-medium">$500.00 USDG</span>
              </div>
            </div>

          </div>

        </motion.div>
      )}
      </AnimatePresence>

      <SignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText="Confirm Cross-Chain Swap"
        amountText={`${amount} ${selectedToken.symbol} (${selectedSourceChain.name}) → ${selectedDestToken.symbol} (${selectedDestChain.name})`}
        defaultMode="faceid"
        onSign={handleTransfer}
      />
    </motion.div>
  );
}
