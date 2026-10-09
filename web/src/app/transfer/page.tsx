'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';
import { SignModal } from '@/components/SignModal';

const TOKENS = [
  { symbol: 'ETH', name: 'Ether', decimals: 18, color: '#0284c7' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, color: '#2775CA' },
  { symbol: 'ARB', name: 'Arbitrum', decimals: 18, color: '#28A0F0' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, color: '#26A17B' },
  { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, color: '#F4B731' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, color: '#F7931A' },
  { symbol: 'UNI', name: 'Uniswap', decimals: 18, color: '#FF007A' },
  { symbol: 'LINK', name: 'Chainlink', decimals: 18, color: '#2A5ADA' },
];

const CHAINS = [
  { name: 'Arbitrum Sepolia', id: 421614, color: '#12AAFF' },
  { name: 'Base', id: 8453, color: '#0052FF' },
  { name: 'Optimism', id: 10, color: '#FF0420' },
  { name: 'Polygon', id: 137, color: '#8247E5' },
  { name: 'Ethereum', id: 1, color: '#627EEA' },
  { name: 'Custom', id: -1, color: '#6b7280' },
];

type AcrossFee = { relayFeeTotal: string; estimatedFillTimeSec: number } | null;

export default function TransferPage() {
  const { address, executeCrossChainSwap, isPending } = useInvisibleWallet();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedToken, setSelectedToken] = useState(TOKENS[1]); // Default source USDC
  const [selectedDestToken, setSelectedDestToken] = useState(TOKENS[0]); // Default dest ETH
  const [customSourceToken, setCustomSourceToken] = useState('');
  const [customDestToken, setCustomDestToken] = useState('');
  const [selectedSourceChain, setSelectedSourceChain] = useState(CHAINS[0]);
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]); // Default dest chain same as source
  const [customChainId, setCustomChainId] = useState('');

  const { ethBalance, usdcBalance } = useBalances(address, selectedSourceChain.id);

  const getBalanceForToken = () => {
    return selectedToken.symbol === 'USDC' ? usdcBalance : ethBalance;
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
      const chainId = selectedChain.id === -1 ? parseInt(customChainId || '0') : selectedChain.id;
      if (!chainId) return;
      const fromToken = customSourceToken || selectedToken.symbol;
      const toToken = customDestToken || selectedDestToken.symbol;
      const url = `https://li.quest/v1/quote?fromChain=${selectedSourceChain.id}&toChain=${chainId}&fromToken=${fromToken}&toToken=${toToken}&fromAmount=${amountRaw.toString()}&fromAddress=${address || '0x0000000000000000000000000000000000000000'}`;
      const resp = await fetch(url);
      if (!resp.ok) { setAcrossFee(null); return; }
      const data = await resp.json();
      setAcrossFee({
        relayFeeTotal: data.estimate?.feeCosts?.[0]?.amount ?? '0',
        estimatedFillTimeSec: data.estimate?.executionDuration ?? 45,
      });
    } catch {
      setAcrossFee(null);
    } finally {
      setFeeLoading(false);
    }
  }, [amount, selectedToken, selectedDestToken, customSourceToken, customDestToken, selectedSourceChain, selectedChain, customChainId, address]);

  useEffect(() => {
    const timer = setTimeout(fetchLifiQuote, 600);
    return () => clearTimeout(timer);
  }, [fetchLifiQuote]);

  const relayFeeDisplay = () => {
    if (!acrossFee) return '—';
    const fee = BigInt(acrossFee.relayFeeTotal);
    const displayFee = Number(fee) / 10 ** selectedToken.decimals;
    return `${displayFee.toFixed(6)} ${selectedToken.symbol}`;
  };

  const outputAmountDisplay = () => {
    const parsed = parseFloat(amount);
    if (!parsed || !acrossFee) return `${amount || '0.00'} ${selectedToken.symbol}`;
    const fee = Number(BigInt(acrossFee.relayFeeTotal)) / 10 ** selectedToken.decimals;
    return `${Math.max(0, parsed - fee).toFixed(6)} ${selectedToken.symbol}`;
  };

  const handleTransfer = async (pin: string) => {
    try {
      const amountRaw = BigInt(Math.floor(parseFloat(amount) * 10 ** selectedToken.decimals));
      const chainId = selectedChain.id === -1 ? parseInt(customChainId || '0') : selectedChain.id;
      const fromToken = customSourceToken || selectedToken.symbol;
      const toToken = customDestToken || selectedDestToken.symbol;
      const result = await executeCrossChainSwap(
        selectedSourceChain.id,
        chainId,
        fromToken,
        toToken,
        amountRaw,
        recipient as `0x${string}`,
        pin
      );
      if (result) {
        setTxHash(result.userOpHash);
        setStatus('success');
        setAmount('');
        setRecipient('');
      } else {
        setStatus('error');
        setErrorMsg('Transaction failed — check console for details.');
      }
    } catch (e: any) {
      console.error('Transfer execution failed:', e);
      setStatus('error');
      setErrorMsg(e?.message ?? 'Unknown error');
    } finally {
      setIsModalOpen(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="p-4 md:p-10 w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 border-b border-border-whisper pb-6">
          <Link href="/" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-3xl md:text-5xl font-semibold text-text-primary tracking-tight">Cross-Chain Swap</h1>
        </div>
        <div className="flex flex-col items-center gap-6 py-12 animate-in zoom-in duration-500 delay-100">
          <div className="w-20 h-20 rounded-full bg-surface-container border border-border-whisper flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px] text-accent-orange">check_circle</span>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-2">Transfer Submitted</h2>
            <p className="text-text-muted text-sm max-w-sm mx-auto">Your UserOperation was accepted by the bundler. Across Protocol will fill this order on {selectedChain.name} in approximately {acrossFee?.estimatedFillTimeSec ?? 45} seconds.</p>
          </div>
          {txHash && (
            <div className="bg-surface-zinc border border-border-whisper rounded-[4px] px-5 py-3 flex items-center gap-3">
              <span className="font-mono text-xs text-text-muted">UserOp Hash:</span>
              <span className="font-mono text-xs text-accent-orange truncate max-w-[200px]">{txHash.slice(0, 20)}…</span>
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <button onClick={() => setStatus('idle')} className="h-10 px-6 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-[4px] text-sm font-medium transition-all" type="button">New Transfer</button>
            <Link href="/activity" className="h-10 px-6 bg-surface-container hover:bg-surface-container-high text-text-primary rounded-[4px] text-sm font-medium transition-all border border-border-whisper flex items-center">View Activity</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 md:p-10 w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-400">

        <div className="flex items-center gap-4 border-b border-border-whisper pb-6">
          <Link href="/" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold text-text-primary tracking-tight mb-1">Swap & Bridge</h1>
            <p className="text-text-muted text-sm">Swap and bridge assets across chains. Gas is sponsored via ZeroDev Paymaster.</p>
          </div>
        </div>

        {status === 'error' && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-[4px] p-4">
            <span className="material-symbols-outlined text-red-400 text-[20px]">error</span>
            <span className="text-sm text-red-400">{errorMsg}</span>
            <button onClick={() => setStatus('idle')} className="ml-auto text-text-muted hover:text-text-primary" type="button"><span className="material-symbols-outlined text-[18px]">close</span></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Form */}
          <div className="bg-surface-zinc rounded-[24px] p-6 border border-border-whisper flex flex-col gap-5">

            {/* Source Chain */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Source Network</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CHAINS.map(c => (
                  <button
                    key={'src-' + c.id}
                    onClick={() => setSelectedSourceChain(c)}
                    className={`flex items-center gap-2 px-3 h-10 rounded-[4px] border text-sm transition-all ${selectedSourceChain.id === c.id ? 'text-text-primary' : 'border-border-whisper bg-surface-container text-text-muted hover:text-text-primary'}`}
                    style={selectedSourceChain.id === c.id ? { borderColor: c.color + '80', backgroundColor: c.color + '18', color: c.color } : {}}
                    type="button"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-xs font-mono truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Source Asset */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Source Asset</label>
              <div className="flex flex-wrap gap-2">
                {TOKENS.map(t => (
                  <button
                    key={t.symbol}
                    onClick={() => setSelectedToken(t)}
                    className={`flex items-center gap-2 px-4 h-11 rounded-[4px] border text-sm font-medium transition-all ${selectedToken.symbol === t.symbol ? 'border-accent-orange/50 bg-accent-orange/10 text-accent-orange' : 'border-border-whisper bg-surface-container text-text-muted hover:text-text-primary'}`}
                    type="button"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.symbol}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-4 mt-2 focus-within:border-accent-orange transition-colors">
                  <span className="material-symbols-outlined text-text-muted mr-3 text-[18px]">token</span>
                  <input
                    className="flex-1 bg-transparent h-12 text-sm text-text-primary font-mono outline-none placeholder:text-text-muted/50"
                    placeholder="Or paste 0x token address"
                    type="text"
                    value={customSourceToken}
                    onChange={(e) => setCustomSourceToken(e.target.value)}
                  />
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Amount</label>
                {address && (
                  <button
                    onClick={() => setAmount(getBalanceForToken())}
                    className="font-mono text-[10px] text-accent-orange uppercase tracking-wider bg-accent-orange/10 px-2 py-0.5 rounded-[4px]"
                    type="button"
                  >
                    Max: {getBalanceForToken()}
                  </button>
                )}
              </div>
              <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-4 focus-within:border-accent-orange transition-colors">
                <input
                  className="flex-1 bg-transparent h-16 text-3xl text-text-primary font-semibold outline-none placeholder:text-text-muted/30"
                  placeholder="0.00"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="text-xl font-mono text-text-muted">{selectedToken.symbol}</span>
              </div>
            </div>

            {/* Recipient */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Destination Address</label>
              <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-4 focus-within:border-accent-orange transition-colors">
                <span className="material-symbols-outlined text-text-muted mr-3 text-[18px]">wallet</span>
                <input
                  className="flex-1 bg-transparent h-14 text-sm text-text-primary font-mono outline-none placeholder:text-text-muted/50"
                  placeholder="0x... or ENS name"
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
                <button
                  className="text-accent-orange text-xs font-medium uppercase tracking-wider"
                  type="button"
                  onClick={async () => {
                    try { setRecipient(await navigator.clipboard.readText()); } catch {}
                  }}
                >
                  Paste
                </button>
              </div>
            </div>

            {/* Target Chain */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Destination Network</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CHAINS.map(c => (
                  <button
                    key={'dest-' + c.id}
                    onClick={() => setSelectedChain(c)}
                    className={`flex items-center gap-2 px-3 h-10 rounded-[4px] border text-sm transition-all ${selectedChain.id === c.id ? 'text-text-primary' : 'border-border-whisper bg-surface-container text-text-muted hover:text-text-primary'}`}
                    style={selectedChain.id === c.id ? { borderColor: c.color + '80', backgroundColor: c.color + '18', color: c.color } : {}}
                    type="button"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-xs font-mono truncate">{c.name}</span>
                  </button>
                ))}
              </div>
              {selectedChain.id === -1 && (
                <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-4 mt-2 focus-within:border-accent-orange transition-colors">
                  <span className="material-symbols-outlined text-text-muted mr-3 text-[18px]">account_tree</span>
                  <input
                    className="flex-1 bg-transparent h-12 text-sm text-text-primary font-mono outline-none placeholder:text-text-muted/50"
                    placeholder="Enter Custom Chain ID"
                    type="number"
                    value={customChainId}
                    onChange={(e) => setCustomChainId(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Destination Asset */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Destination Asset</label>
              <div className="flex flex-wrap gap-2">
                {TOKENS.map(t => (
                  <button
                    key={'dest-' + t.symbol}
                    onClick={() => setSelectedDestToken(t)}
                    className={`flex items-center gap-2 px-4 h-11 rounded-[4px] border text-sm font-medium transition-all ${selectedDestToken.symbol === t.symbol ? 'border-accent-orange/50 bg-accent-orange/10 text-accent-orange' : 'border-border-whisper bg-surface-container text-text-muted hover:text-text-primary'}`}
                    type="button"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.symbol}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-4 mt-2 focus-within:border-accent-orange transition-colors">
                  <span className="material-symbols-outlined text-text-muted mr-3 text-[18px]">token</span>
                  <input
                    className="flex-1 bg-transparent h-12 text-sm text-text-primary font-mono outline-none placeholder:text-text-muted/50"
                    placeholder="Or paste 0x token address"
                    type="text"
                    value={customDestToken}
                    onChange={(e) => setCustomDestToken(e.target.value)}
                  />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface-zinc rounded-[24px] p-6 border border-border-whisper flex flex-col gap-4">
              <h2 className="text-sm text-text-muted uppercase tracking-widest font-medium">Transaction Summary</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-muted">Network Fee</span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-accent-orange">bolt</span>
                    <span className="font-mono text-xs text-accent-orange font-medium">Sponsored</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-muted">Relay Fee (Across)</span>
                  <div className="flex items-center gap-1.5">
                    {feeLoading && <span className="w-3 h-3 border border-accent-orange border-t-transparent rounded-full animate-spin" />}
                    <span className="font-mono text-xs text-text-primary">{relayFeeDisplay()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-muted">Routing Protocol</span>
                  <span className="font-mono text-xs text-text-primary">Li.Fi / DEX Aggregator</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-muted">Est. Fill Time</span>
                  <span className="font-mono text-xs text-text-primary">
                    ~{acrossFee ? `${acrossFee.estimatedFillTimeSec}s` : '45s'}
                  </span>
                </div>
                <div className="pt-3 mt-1 border-t border-border-whisper flex items-center justify-between">
                  <span className="font-mono text-xs text-text-muted">You Receive</span>
                  <span className="font-mono text-sm text-text-primary font-semibold">{outputAmountDisplay()}</span>
                </div>
              </div>
            </div>

            {!address && (
              <div className="flex items-center gap-2 text-yellow-400 text-xs font-mono bg-yellow-400/10 rounded-[4px] px-4 py-3 border border-yellow-400/20">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                No wallet connected. Create a wallet first.
              </div>
            )}

            <button
              className="w-full h-14 bg-accent-orange hover:bg-accent-orange/90 active:translate-y-[1px] disabled:opacity-40 text-white rounded-[4px] font-semibold text-base transition-all flex items-center justify-center gap-2"
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={!amount || !recipient || isPending || !address}
            >
              {isPending ? (
                <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  Review Transfer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <SignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText="Confirm Transfer"
        amountText={`${amount || '0.00'} ${selectedToken.symbol} → ${selectedChain.name}`}
        onSign={handleTransfer}
      />
    </>
  );
}
