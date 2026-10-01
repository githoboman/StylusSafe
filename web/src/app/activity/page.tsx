'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type TxStatus = 'executed' | 'pending' | 'failed';
type TxType = 'swap' | 'subscription' | 'receive' | 'send' | 'intent' | 'signer' | 'session';

type Transaction = {
  id: string;
  type: TxType;
  title: string;
  subtitle: string;
  amount?: string;
  amountPositive?: boolean;
  status: TxStatus;
  timestamp: Date;
  icon: string;
  txHash?: string;
};

const TX_DATA: Transaction[] = [
  { id: '1', type: 'swap', title: 'Cross-Chain Swap', subtitle: 'Arbitrum One → Base', amount: '-1.50 ETH', amountPositive: false, status: 'executed', timestamp: new Date(Date.now() - 2 * 3600000), icon: 'swap_horiz', txHash: '0x3a9c...f12b' },
  { id: '2', type: 'subscription', title: 'Subscription Pull', subtitle: 'Netflix Web3 — Monthly', amount: '-15.00 USDC', amountPositive: false, status: 'executed', timestamp: new Date(Date.now() - 5 * 3600000), icon: 'autorenew', txHash: '0x7c2a...8d4f' },
  { id: '3', type: 'intent', title: 'Intent Batch', subtitle: '3 ops — Swap + Bridge + Stake', amount: '-500.00 USDC', amountPositive: false, status: 'executed', timestamp: new Date(Date.now() - 8 * 3600000), icon: 'stacks', txHash: '0x1f8e...32a1' },
  { id: '4', type: 'receive', title: 'Receive', subtitle: 'From 0x71C...9A23', amount: '+4,500.00 USDC', amountPositive: true, status: 'executed', timestamp: new Date(Date.now() - 2 * 86400000), icon: 'south_west' },
  { id: '5', type: 'signer', title: 'Signer Added', subtitle: 'My iPhone (Passkey)', status: 'executed', timestamp: new Date(Date.now() - 2 * 86400000 + 3600000), icon: 'shield_person' },
  { id: '6', type: 'swap', title: 'Cross-Chain Swap', subtitle: 'Base → Optimism', amount: '-0.25 ETH', amountPositive: false, status: 'failed', timestamp: new Date(Date.now() - 3 * 86400000), icon: 'swap_horiz', txHash: '0xb3c1...aa99' },
  { id: '7', type: 'session', title: 'Session Key Issued', subtitle: '1-click trading — 8h window', status: 'executed', timestamp: new Date(Date.now() - 4 * 86400000), icon: 'flash_on' },
  { id: '8', type: 'send', title: 'Send', subtitle: 'To 0xAbC...1234', amount: '-200.00 USDC', amountPositive: false, status: 'pending', timestamp: new Date(Date.now() - 30 * 60000), icon: 'north_east', txHash: '0x9d7f...c02b' },
];

const TYPE_LABELS: Record<TxType, string> = {
  swap: 'Swaps', subscription: 'Subscriptions', receive: 'Received', send: 'Sent',
  intent: 'Intents', signer: 'Signers', session: 'Sessions',
};

const STATUS_CONFIG: Record<TxStatus, { color: string; label: string }> = {
  executed: { color: 'text-accent-azure', label: 'Executed' },
  pending:  { color: 'text-yellow-400', label: 'Pending' },
  failed:   { color: 'text-red-400', label: 'Failed' },
};

function groupByDate(txs: Transaction[]) {
  const now = new Date();
  const groups: Record<string, Transaction[]> = {};
  txs.forEach(tx => {
    const d = tx.timestamp;
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    const key = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  return groups;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ActivityPage() {
  const [filter, setFilter] = useState<TxType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [localHistory, setLocalHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem('invisible_wallet_activity') || '[]');
      const parsed = existing.map((tx: any) => ({
        ...tx,
        timestamp: new Date(tx.timestamp)
      }));
      setLocalHistory(parsed);
    } catch(e) {}
  }, []);

  const filtered = useMemo(() => {
    const combined = [...localHistory, ...TX_DATA];
    const f = filter === 'all' ? combined : combined.filter(t => t.type === filter);
    return f.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [filter, localHistory]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const allTypes = Array.from(new Set([...localHistory, ...TX_DATA].map(t => t.type)));

  return (
    <div className="p-4 md:p-10 w-full max-w-5xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-400">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-whisper pb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold text-text-primary tracking-tight mb-1">Activity Log</h1>
            <p className="text-text-muted text-sm">{TX_DATA.length} operations recorded on Arbitrum Stylus.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`h-8 px-4 rounded-[4px] text-xs font-mono uppercase tracking-wider transition-colors border ${filter === 'all' ? 'bg-accent-azure text-white border-accent-azure' : 'bg-surface-container text-text-muted border-border-whisper hover:text-text-primary hover:border-text-muted/30'}`}
          type="button"
        >
          All
        </button>
        {allTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`h-8 px-4 rounded-[4px] text-xs font-mono uppercase tracking-wider transition-colors border ${filter === type ? 'bg-accent-azure text-white border-accent-azure' : 'bg-surface-container text-text-muted border-border-whisper hover:text-text-primary hover:border-text-muted/30'}`}
            type="button"
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Results count */}
      {filter !== 'all' && (
        <p className="text-sm text-text-muted -mt-4">
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'} for <strong className="text-text-primary">{TYPE_LABELS[filter]}</strong>
        </p>
      )}

      {/* Transaction Groups */}
      {Object.keys(groups).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-2">
          <span className="material-symbols-outlined text-[48px]">search_off</span>
          <p className="text-sm">No transactions matching this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(groups).map(([dateLabel, txs]) => (
            <div key={dateLabel} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-text-muted uppercase tracking-wider">{dateLabel}</span>
                <div className="flex-1 h-px bg-border-whisper" />
              </div>
              <div className="bg-surface-zinc rounded-[24px] border border-border-whisper overflow-hidden">
                {txs.map((tx, i) => {
                  const statusCfg = STATUS_CONFIG[tx.status];
                  const isExpanded = expandedId === tx.id;
                  return (
                    <div key={tx.id}>
                      <div
                        className={`px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-black/[0.02] transition-colors ${i < txs.length - 1 || isExpanded ? 'border-b border-border-whisper' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-accent-azure ${tx.status === 'failed' ? 'bg-red-400/10 text-red-400' : tx.amountPositive ? 'bg-green-500/10 text-green-500' : 'bg-accent-azure/10'}`}>
                          <span className="material-symbols-outlined text-[20px]">{tx.icon}</span>
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-medium text-sm truncate">{tx.title}</p>
                          <p className="text-xs text-text-muted mt-0.5 truncate">{tx.subtitle}</p>
                        </div>

                        {/* Amount + Status */}
                        <div className="flex flex-col items-end shrink-0">
                          {tx.amount && (
                            <span className={`font-mono text-sm font-medium ${tx.amountPositive ? 'text-green-500' : 'text-text-primary'}`}>
                              {tx.amount}
                            </span>
                          )}
                          <span className={`font-mono text-xs mt-1 flex items-center gap-1 ${statusCfg.color}`}>
                            {tx.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                            {tx.status === 'executed' && <span className="w-1.5 h-1.5 rounded-full bg-accent-azure" />}
                            {tx.status === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                            {statusCfg.label}
                          </span>
                        </div>

                        <span className={`material-symbols-outlined text-[16px] text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="px-5 py-4 bg-surface-container/40 flex flex-col gap-3 border-b border-border-whisper animate-in slide-in-from-top-1 duration-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">Time</p>
                              <p className="text-sm text-text-primary font-mono">{formatTime(tx.timestamp)}</p>
                            </div>
                            <div>
                              <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">Type</p>
                              <p className="text-sm text-text-primary capitalize font-mono">{TYPE_LABELS[tx.type]}</p>
                            </div>
                            {tx.txHash && (
                              <div className="col-span-2">
                                <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">Transaction Hash</p>
                                <a
                                  href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-accent-azure font-mono hover:underline flex items-center gap-1"
                                >
                                  {tx.txHash}
                                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
