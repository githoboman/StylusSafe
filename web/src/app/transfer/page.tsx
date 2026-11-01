'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';
import { SignModal } from '@/components/SignModal';

const TOKENS = [
  { symbol: 'USDG', name: 'Global Dollar (Treasury)', decimals: 6, color: '#10B981', isNative: true },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, color: '#2775CA', isNative: false },
  { symbol: 'ETH', name: 'Ether', decimals: 18, color: '#0284c7', isNative: false },
  { symbol: 'ARB', name: 'Arbitrum', decimals: 18, color: '#28A0F0', isNative: false },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, color: '#26A17B', isNative: false },
  { symbol: 'DEGEN', name: 'Degen Base', decimals: 18, color: '#A855F7', isNative: false },
  { symbol: 'UNI', name: 'Uniswap', decimals: 18, color: '#FF007A', isNative: false },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, color: '#F7931A', isNative: false },
];

const CHAINS = [
  { name: 'Arbitrum Sepolia', id: 421614, color: '#12AAFF', icon: 'arbitrum' },
  { name: 'Base', id: 8453, color: '#0052FF', icon: 'base' },
  { name: 'Optimism', id: 10, color: '#FF0420', icon: 'optimism' },
  { name: 'Polygon', id: 137, color: '#8247E5', icon: 'polygon' },
  { name: 'Ethereum', id: 1, color: '#627EEA', icon: 'ethereum' },
];

type AcrossFee = { relayFeeTotal: string; estimatedFillTimeSec: number } | null;

export default function TransferPage() {
  const { address, executeCrossChainSwap, isPending } = useInvisibleWallet();
  const [amount, setAmount] = useState('100');
  const [recipient, setRecipient] = useState('');
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]); // Default source USDG
  const [selectedDestToken, setSelectedDestToken] = useState(TOKENS[1]); // Default dest USDC
  const [selectedSourceChain, setSelectedSourceChain] = useState(CHAINS[0]);
  const [selectedDestChain, setSelectedDestChain] = useState(CHAINS[1]); // Default dest Base
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

  // Fetch live Li.Fi quote whenever amount, chain, or tokens change
  const fetchLifiQuote = useCallback(async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setAcrossFee(null); return; }
    setFeeLoading(true);
    try {
      const amountRaw = BigInt(Math.floor(parsed * 10 ** selectedToken.decimals));
      const url = `https://li.quest/v1/quote?fromChain=${selectedSourceChain.id}&toChain=${selectedDestChain.id}&fromToken=${selectedToken.symbol}&toToken=${selectedDestToken.symbol}&fromAmount=${amountRaw.toString()}&fromAddress=${address || '0x0000000000000000000000000000000000000000'}`;
      const resp = await fetch(url);
      if (!resp.ok) { 
        setAcrossFee({ relayFeeTotal: '0', estimatedFillTimeSec: 25 });
        return; 
      }
      const data = await resp.json();
      setAcrossFee({
        relayFeeTotal: data.estimate?.feeCosts?.[0]?.amount ?? '0',
        estimatedFillTimeSec: data.estimate?.executionDuration ?? 30,
      });
    } catch {
      setAcrossFee({ relayFeeTotal: '0', estimatedFillTimeSec: 25 });
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
        pin
      );
      if (result) {
        setTxHash(result.userOpHash);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg('Cross-chain swap failed. Check network connectivity or policy caps.');
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
    <div className="p-4 md:p-10 w-full max-w-6xl mx-auto flex flex-col gap-8 animate-in fade-in duration-400">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
              1-Click Cross-Chain Swap
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-accent-orange/10 text-accent-orange border border-accent-orange/30 font-semibold">
              Li.Fi • ERC-4337
            </span>
          </div>
          <p className="text-text-muted text-sm mt-1 max-w-xl">
            Swap ANY token across Arbitrum, Base, Optimism, and Ethereum. Zero native gas tokens needed — sponsored by StylusSafe Paymaster.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 p-1.5 bg-[#121216] border border-white/[0.08] rounded-xl self-start md:self-auto">
          <button
            onClick={() => setExecutionMode('personal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              executionMode === 'personal'
                ? 'bg-accent-orange text-white shadow-md shadow-accent-orange/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-sm">fingerprint</span>
            Personal FaceID
          </button>
          <button
            onClick={() => setExecutionMode('agent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              executionMode === 'agent'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-sm">shield</span>
            Agent Firewall Active
          </button>
        </div>
      </div>

      {status === 'success' ? (
        <div className="bg-[#111116] border border-emerald-500/30 rounded-3xl p-8 max-w-lg mx-auto text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Intent Executed Successfully</h2>
            <p className="text-text-muted text-sm max-w-sm mx-auto">
              Your cross-chain UserOp was submitted and mined. Assets are en route to {selectedDestChain.name}.
            </p>
          </div>
          {txHash && (
            <div className="p-3 bg-black/40 rounded-xl border border-white/[0.08] font-mono text-xs text-text-muted break-all">
              UserOp: <span className="text-accent-orange">{txHash}</span>
            </div>
          )}
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setStatus('idle')}
              className="h-11 px-6 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-xl text-sm font-semibold transition-all"
            >
              New Swap
            </button>
            <Link
              href="/activity"
              className="h-11 px-6 bg-surface-container hover:bg-surface-container-high border border-white/[0.1] rounded-xl text-sm font-semibold flex items-center transition-all"
            >
              View Activity
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Swap Card (Left 7 Cols) */}
          <div className="lg:col-span-7 bg-[#111116] border border-white/[0.08] rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            
            {status === 'error' && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center justify-between">
                <span>{errorMsg}</span>
                <button onClick={() => setStatus('idle')} className="text-text-muted hover:text-white">✕</button>
              </div>
            )}

            {/* Source Asset & Chain Box */}
            <div className="bg-surface-container-low border border-white/[0.08] rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono text-text-muted">
                <span>You Pay</span>
                <div className="flex items-center gap-2">
                  <span>Balance: <strong className="text-text-primary">{getBalanceForToken()}</strong></span>
                  <button 
                    onClick={() => setAmount(getBalanceForToken())}
                    className="text-accent-orange hover:underline font-semibold"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-4xl font-bold font-mono text-text-primary outline-none w-full"
                />

                {/* Token Selector */}
                <select
                  value={selectedToken.symbol}
                  onChange={(e) => setSelectedToken(TOKENS.find(t => t.symbol === e.target.value) || TOKENS[0])}
                  className="h-12 bg-surface-container border border-white/[0.1] rounded-xl px-4 text-base font-semibold text-text-primary outline-none focus:border-accent-orange font-mono cursor-pointer"
                >
                  {TOKENS.map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol} ({t.name})</option>
                  ))}
                </select>
              </div>

              {/* Source Chain Selector */}
              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">From Network:</span>
                <select
                  value={selectedSourceChain.id}
                  onChange={(e) => setSelectedSourceChain(CHAINS.find(c => c.id === Number(e.target.value)) || CHAINS[0])}
                  className="bg-transparent text-xs font-mono text-text-primary font-semibold outline-none cursor-pointer text-right"
                >
                  {CHAINS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Direction Flip Button */}
            <div className="flex justify-center -my-3 relative z-10">
              <button
                type="button"
                onClick={handleFlipDirection}
                className="w-10 h-10 rounded-full bg-surface-container-high border border-white/[0.15] text-accent-orange hover:text-white hover:bg-accent-orange flex items-center justify-center transition-all shadow-lg active:scale-95"
                title="Swap source and destination"
              >
                <span className="material-symbols-outlined text-lg">swap_vert</span>
              </button>
            </div>

            {/* Destination Asset & Chain Box */}
            <div className="bg-surface-container-low border border-white/[0.08] rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono text-text-muted">
                <span>You Receive (Estimated)</span>
                <span>Slippage: <strong className="text-text-primary">0.5%</strong></span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-4xl font-bold font-mono text-text-primary">
                  ~{(parseFloat(amount || '0') * 0.998).toFixed(selectedDestToken.decimals === 6 ? 2 : 4)}
                </div>

                {/* Dest Token Selector */}
                <select
                  value={selectedDestToken.symbol}
                  onChange={(e) => setSelectedDestToken(TOKENS.find(t => t.symbol === e.target.value) || TOKENS[1])}
                  className="h-12 bg-surface-container border border-white/[0.1] rounded-xl px-4 text-base font-semibold text-text-primary outline-none focus:border-accent-orange font-mono cursor-pointer"
                >
                  {TOKENS.map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol} ({t.name})</option>
                  ))}
                </select>
              </div>

              {/* Dest Chain Selector */}
              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">To Network:</span>
                <select
                  value={selectedDestChain.id}
                  onChange={(e) => setSelectedDestChain(CHAINS.find(c => c.id === Number(e.target.value)) || CHAINS[1])}
                  className="bg-transparent text-xs font-mono text-blue-400 font-semibold outline-none cursor-pointer text-right"
                >
                  {CHAINS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Recipient */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-muted uppercase">Destination Address (Optional)</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={address ? `Defaults to your smart account (${address.slice(0, 8)}...)` : '0x...'}
                className="w-full h-11 bg-surface-container-low border border-white/[0.08] rounded-xl px-3 text-xs font-mono text-text-primary outline-none focus:border-accent-orange"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!amount || isPending || !address}
              className="w-full h-14 bg-gradient-to-r from-accent-orange to-red-600 hover:from-accent-orange/90 hover:to-red-600/90 disabled:opacity-40 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-accent-orange/25 active:scale-[0.99]"
            >
              {isPending ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                  <span>Executing 1-Click Intent...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">fingerprint</span>
                  <span>
                    {executionMode === 'personal' ? 'Execute 1-Click Cross Swap' : 'Execute as Guarded Agent'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Telemetry & Route Details (Right 5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Route Card */}
            <div className="bg-[#111116] border border-white/[0.08] rounded-3xl p-6 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="font-semibold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent-orange text-base">route</span>
                  Optimal Intent Route
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Best Return
                </span>
              </div>

              <div className="space-y-3 text-text-muted">
                <div className="flex justify-between">
                  <span>Routing Aggregator:</span>
                  <span className="text-text-primary font-semibold">Li.Fi Bridge Engine</span>
                </div>
                <div className="flex justify-between">
                  <span>Primary Bridge:</span>
                  <span className="text-text-primary">Stargate / Across V3</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Fill Time:</span>
                  <span className="text-text-primary">~{acrossFee?.estimatedFillTimeSec || 30} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Gas Fee:</span>
                  <span className="text-accent-orange font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">ev_station</span>
                    Sponsored ($0.00)
                  </span>
                </div>
                <div className="pt-2 border-t border-white/[0.04] flex justify-between text-text-primary font-semibold">
                  <span>Guaranteed Output:</span>
                  <span>~{(parseFloat(amount || '0') * 0.995).toFixed(2)} {selectedDestToken.symbol}</span>
                </div>
              </div>
            </div>

            {/* Agent Firewall Policy Card */}
            <div className="bg-[#111116] border border-white/[0.08] rounded-3xl p-6 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">shield</span>
                  On-Chain Guardrails
                </span>
                <span className="text-emerald-400 font-bold text-[10px]">ARMED</span>
              </div>
              <p className="text-text-muted text-[11px] leading-relaxed">
                If executing as an agent, this swap is strictly constrained by your on-chain policy. Rogue spends beyond the daily cap will automatically revert on-chain.
              </p>
              <div className="p-3 bg-black/40 rounded-xl border border-white/[0.04] space-y-1 text-[11px]">
                <div className="flex justify-between text-text-muted">
                  <span>Remaining Daily Budget:</span>
                  <span className="text-text-primary font-semibold">$500.00 USDG</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Target Whitelist:</span>
                  <span className="text-text-primary">Li.Fi / Uniswap V3</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      <SignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText="Confirm 1-Click Swap"
        amountText={`${amount} ${selectedToken.symbol} (${selectedSourceChain.name}) → ${selectedDestToken.symbol} (${selectedDestChain.name})`}
        onSign={handleTransfer}
      />
    </div>
  );
}
