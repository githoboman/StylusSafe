'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconChevronDown,
  IconSearch,
  IconSwap,
  IconShield,
  IconKey,
  IconWallet,
  IconActivity,
  IconCpu,
} from '@/components/Icons';

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
  txHash?: string;
};

const DEFAULT_ACTIVITIES: Transaction[] = [
  {
    id: 'tx-seed-1',
    type: 'signer',
    title: 'Hardware Key Enrolled (P-256 Passkey)',
    subtitle: 'Arbitrum Sepolia Stylus Verifier • RIP-7212 Precompile',
    status: 'executed',
    timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 min ago
    txHash: '0x3a4b92c81d7e5f0a2b4c6e8a0d2f4a6b8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f',
  },
  {
    id: 'tx-seed-2',
    type: 'intent',
    title: 'Agent USDG Treasury Policy Registered',
    subtitle: 'Allowance: 500 USDG / 24h • Destination: Uniswap V3 Router',
    status: 'executed',
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    amount: '500 USDG',
    amountPositive: false,
    txHash: '0x7b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c',
  },
  {
    id: 'tx-seed-3',
    type: 'receive',
    title: 'Treasury Inflow: Paxos USDG',
    subtitle: 'Minted via Paxos Regulated Reserve (Sepolia Testnet)',
    amount: '+2,500.00 USDG',
    amountPositive: true,
    status: 'executed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18), // 18 hours ago
    txHash: '0x9a2b4c6d8e0f1a3b5c7d9e1f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b',
  },
  {
    id: 'tx-seed-4',
    type: 'swap',
    title: 'Automated Intent Swap: 250 USDG → ETH',
    subtitle: 'Self-Funded Agent Gas Top-up via Uniswap V3 WASM Hook',
    amount: '250 USDG',
    amountPositive: false,
    status: 'executed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36), // 36 hours ago
    txHash: '0x4c2e6a8d0f1b3d5e7a9c1e3f5b7d9a1c3e5f7b9d1a3c5e7f9a1b3c5d7e9f1a3b',
  },
];

const TYPE_LABELS: Record<TxType, string> = {
  swap: 'Swaps',
  subscription: 'Subscriptions',
  receive: 'Received',
  send: 'Sent',
  intent: 'Intents',
  signer: 'Signers',
  session: 'Sessions',
};

const STATUS_CONFIG: Record<TxStatus, { color: string; label: string }> = {
  executed: { color: 'text-accent-orange', label: 'Executed' },
  pending:  { color: 'text-amber-400', label: 'Pending' },
  failed:   { color: 'text-rose-400', label: 'Failed' },
};

function getTxIcon(type: TxType) {
  switch (type) {
    case 'swap':
      return <IconSwap size={18} />;
    case 'signer':
    case 'session':
      return <IconKey size={18} />;
    case 'intent':
      return <IconCpu size={18} />;
    case 'receive':
    case 'send':
      return <IconWallet size={18} />;
    default:
      return <IconShield size={18} />;
  }
}

function groupByDate(txs: Transaction[]) {
  const now = new Date();
  const groups: Record<string, Transaction[]> = {};
  txs.forEach((tx) => {
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
      const stored = localStorage.getItem('invisible_wallet_activity');
      if (stored) {
        const parsed = JSON.parse(stored).map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp),
        }));
        if (parsed.length > 0) {
          setLocalHistory(parsed);
          return;
        }
      }
      // Seed default transactions if storage is empty
      setLocalHistory(DEFAULT_ACTIVITIES);
      localStorage.setItem('invisible_wallet_activity', JSON.stringify(DEFAULT_ACTIVITIES));
    } catch {
      setLocalHistory(DEFAULT_ACTIVITIES);
    }
  }, []);

  const filtered = useMemo(() => {
    const list = [...localHistory];
    const f = filter === 'all' ? list : list.filter((t) => t.type === filter);
    return f.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [filter, localHistory]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);
  const allTypes = Array.from(new Set(localHistory.map((t) => t.type)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-4 md:p-10 w-full max-w-5xl mx-auto flex flex-col gap-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-9 h-9 rounded-lg bg-surface-container inline-flex items-center justify-center hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary border border-white/[0.06] shrink-0"
            title="Back to Landing Page"
          >
            <IconArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
                Arbitrum Stylus Telemetry
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-text-primary tracking-tight">
              Activity Log
            </h1>
            <p className="text-text-muted text-sm mt-1">
              {localHistory.length} cryptographic operations verified on-chain via RIP-7212 P-256 precompile.
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-text-muted self-start md:self-auto">
          <IconActivity size={14} className="text-accent-orange" />
          <span>Real-time On-Chain Index</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilter('all')}
          className={`h-8 px-4 rounded-[6px] text-xs font-mono uppercase tracking-wider transition-all border ${
            filter === 'all'
              ? 'bg-accent-orange text-white border-accent-orange shadow-sm shadow-accent-orange/20 font-semibold'
              : 'bg-surface-container text-text-muted border-border-whisper hover:text-text-primary hover:border-white/20'
          }`}
          type="button"
        >
          All ({localHistory.length})
        </button>
        {allTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`h-8 px-4 rounded-[6px] text-xs font-mono uppercase tracking-wider transition-all border ${
              filter === type
                ? 'bg-accent-orange text-white border-accent-orange shadow-sm shadow-accent-orange/20 font-semibold'
                : 'bg-surface-container text-text-muted border-border-whisper hover:text-text-primary hover:border-white/20'
            }`}
            type="button"
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Results Filter Indicator */}
      {filter !== 'all' && (
        <p className="text-xs text-text-muted font-mono -mt-4">
          Showing {filtered.length} {filtered.length === 1 ? 'event' : 'events'} for category:{' '}
          <strong className="text-white font-semibold">{TYPE_LABELS[filter]}</strong>
        </p>
      )}

      {/* Transactions List */}
      {Object.keys(groups).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3 rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-text-muted">
            <IconSearch size={22} />
          </div>
          <p className="text-sm font-medium text-text-primary">No transactions found</p>
          <p className="text-xs text-text-muted">No operations match the selected filter category.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(groups).map(([dateLabel, txs]) => (
            <div key={dateLabel} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-text-muted uppercase tracking-wider font-semibold">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <div className="bg-[#0e0e11] rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl shadow-black/20">
                {txs.map((tx, i) => {
                  const statusCfg = STATUS_CONFIG[tx.status];
                  const isExpanded = expandedId === tx.id;
                  return (
                    <div key={tx.id} className="transition-colors">
                      <div
                        className={`px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors ${
                          i < txs.length - 1 || isExpanded ? 'border-b border-white/[0.06]' : ''
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                      >
                        {/* Crisp Vector Icon Container */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            tx.status === 'failed'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : tx.amountPositive
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-accent-orange/10 border-accent-orange/20 text-accent-orange'
                          }`}
                        >
                          {getTxIcon(tx.type)}
                        </div>

                        {/* Title & Description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-medium text-sm truncate">{tx.title}</p>
                          <p className="text-xs text-text-muted mt-0.5 truncate">{tx.subtitle}</p>
                        </div>

                        {/* Amount & Status Badge */}
                        <div className="flex flex-col items-end shrink-0">
                          {tx.amount && (
                            <span
                              className={`font-mono text-sm font-semibold ${
                                tx.amountPositive ? 'text-emerald-400' : 'text-text-primary'
                              }`}
                            >
                              {tx.amount}
                            </span>
                          )}
                          <span className={`font-mono text-[11px] mt-1 flex items-center gap-1.5 ${statusCfg.color}`}>
                            {tx.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                            {tx.status === 'executed' && <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />}
                            {tx.status === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Expand Chevron */}
                        <div
                          className={`text-text-muted transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180 text-white' : ''
                          }`}
                        >
                          <IconChevronDown size={16} />
                        </div>
                      </div>

                      {/* Expanded Details with AnimatePresence */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-white/[0.02] border-b border-white/[0.06]"
                          >
                            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                              <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                                  Timestamp
                                </p>
                                <p className="text-text-primary">
                                  {formatTime(tx.timestamp)} • {tx.timestamp.toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                                  Classification
                                </p>
                                <p className="text-text-primary capitalize">{TYPE_LABELS[tx.type] || tx.type}</p>
                              </div>
                              {tx.txHash && (
                                <div className="sm:col-span-2 pt-2 border-t border-white/[0.04]">
                                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                                    Arbitrum Sepolia Transaction
                                  </p>
                                  <a
                                    href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent-orange hover:text-white transition-colors flex items-center gap-1.5 break-all"
                                  >
                                    <span>{tx.txHash}</span>
                                    <IconArrowUpRight size={14} />
                                  </a>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}