'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { USDG_ADDRESS } from '@/hooks/useBalances';
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

const SEED_IDS = new Set(['tx-seed-1', 'tx-seed-2', 'tx-seed-3', 'tx-seed-4']);

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
  executed: { color: 'text-[#ff4500]', label: 'Confirmed' },
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
    const key = diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  return groups;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ActivityPage() {
  const { address } = useInvisibleWallet();
  const [filter, setFilter] = useState<TxType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<Transaction[]>([]);
  const [onChainHistory, setOnChainHistory] = useState<Transaction[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);

  const loadLocalActivity = useCallback(() => {
    try {
      const stored = localStorage.getItem('invisible_wallet_activity');
      if (stored) {
        const parsed = JSON.parse(stored)
          .filter((tx: any) => tx && !SEED_IDS.has(tx.id))
          .map((tx: any) => ({
            ...tx,
            timestamp: new Date(tx.timestamp),
          }));
        setLocalHistory(parsed);
        localStorage.setItem('invisible_wallet_activity', JSON.stringify(parsed));
      } else {
        setLocalHistory([]);
      }
    } catch {
      setLocalHistory([]);
    }
  }, []);

  const fetchOnChainEvents = useCallback(async () => {
    if (!address || typeof window === 'undefined') return;
    setLoadingChain(true);
    try {
      const client = createPublicClient({
        transport: http(`${window.location.origin}/api/rpc`),
      });
      const latestBlock = await client.getBlockNumber();
      const fromBlock = latestBlock > 200_000n ? latestBlock - 200_000n : 0n;
      const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

      const [incomingLogs, outgoingLogs] = await Promise.all([
        client
          .getLogs({
            address: USDG_ADDRESS,
            event: transferEvent,
            args: { to: address as `0x${string}` },
            fromBlock,
            toBlock: latestBlock,
          })
          .catch(() => []),
        client
          .getLogs({
            address: USDG_ADDRESS,
            event: transferEvent,
            args: { from: address as `0x${string}` },
            fromBlock,
            toBlock: latestBlock,
          })
          .catch(() => []),
      ]);

      const chainTxs: Transaction[] = [];

      for (const log of incomingLogs) {
        const amt = Number(formatUnits(log.args.value || 0n, 6)).toFixed(2);
        const isMint = log.args.from === '0x0000000000000000000000000000000000000000';
        chainTxs.push({
          id: `chain-in-${log.transactionHash}-${log.logIndex}`,
          type: 'receive',
          title: isMint ? 'Testnet USDG Minted On-Chain' : 'Received USDG On-Chain',
          subtitle: isMint
            ? `Arbitrum Sepolia USDG Contract (${USDG_ADDRESS.slice(0, 6)}...${USDG_ADDRESS.slice(-4)})`
            : `From ${log.args.from?.slice(0, 6)}...${log.args.from?.slice(-4)} • Block #${log.blockNumber}`,
          amount: `+${amt} USDG`,
          amountPositive: true,
          status: 'executed',
          timestamp: new Date(),
          txHash: log.transactionHash,
        });
      }

      for (const log of outgoingLogs) {
        const amt = Number(formatUnits(log.args.value || 0n, 6)).toFixed(2);
        chainTxs.push({
          id: `chain-out-${log.transactionHash}-${log.logIndex}`,
          type: 'send',
          title: `Transferred ${amt} USDG On-Chain`,
          subtitle: `To ${log.args.to?.slice(0, 6)}...${log.args.to?.slice(-4)} • Block #${log.blockNumber}`,
          amount: `-${amt} USDG`,
          amountPositive: false,
          status: 'executed',
          timestamp: new Date(),
          txHash: log.transactionHash,
        });
      }

      setOnChainHistory(chainTxs.reverse());
    } catch {
      // ignore RPC log errors
    } finally {
      setLoadingChain(false);
    }
  }, [address]);

  useEffect(() => {
    loadLocalActivity();
    void fetchOnChainEvents();
  }, [loadLocalActivity, fetchOnChainEvents]);

  const combinedHistory = useMemo(() => {
    const seenHashes = new Set<string>();
    const merged: Transaction[] = [];

    for (const tx of localHistory) {
      if (tx.txHash) seenHashes.add(tx.txHash.toLowerCase());
      merged.push(tx);
    }
    for (const tx of onChainHistory) {
      if (tx.txHash && seenHashes.has(tx.txHash.toLowerCase())) continue;
      merged.push(tx);
    }
    return merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [localHistory, onChainHistory]);

  const filtered = useMemo(() => {
    return filter === 'all' ? combinedHistory : combinedHistory.filter((t) => t.type === filter);
  }, [filter, combinedHistory]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);
  const allTypes = Array.from(new Set(combinedHistory.map((t) => t.type)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-xl bg-[#141418] inline-flex items-center justify-center hover:bg-white/[0.06] transition-colors text-[#8e8e98] hover:text-white border border-white/[0.08] shrink-0"
            title="Back"
          >
            <IconArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Activity Log
            </h1>
            <p className="text-[#8e8e98] text-sm mt-1">
              Live Arbitrum Sepolia transactions and smart account operations for your wallet.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            loadLocalActivity();
            void fetchOnChainEvents();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141418] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-mono text-[#c4c4cc] self-start md:self-auto transition-colors"
        >
          <IconActivity size={14} className="text-[#ff4500]" />
          <span>{loadingChain ? 'Syncing Arbitrum Sepolia...' : 'Refresh On-Chain Index'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilter('all')}
          className={`h-9 px-4 rounded-xl text-xs font-mono uppercase tracking-wider transition-all border ${
            filter === 'all'
              ? 'bg-[#ff4500] text-white border-[#ff4500] font-semibold'
              : 'bg-[#141418] text-[#8e8e98] border-white/[0.08] hover:text-white'
          }`}
          type="button"
        >
          All ({combinedHistory.length})
        </button>
        {allTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`h-9 px-4 rounded-xl text-xs font-mono uppercase tracking-wider transition-all border ${
              filter === type
                ? 'bg-[#ff4500] text-white border-[#ff4500] font-semibold'
                : 'bg-[#141418] text-[#8e8e98] border-white/[0.08] hover:text-white'
            }`}
            type="button"
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {Object.keys(groups).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#8e8e98] gap-3 rounded-2xl border border-white/[0.08] bg-[#141418]">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#8e8e98]">
            <IconSearch size={22} />
          </div>
          <p className="text-sm font-medium text-white">No transactions recorded yet</p>
          <p className="text-xs text-[#8e8e98]">Mint USDG, execute a swap, or save an AI rule to see live on-chain activity.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(groups).map(([dateLabel, txs]) => (
            <div key={dateLabel} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#8e8e98] uppercase tracking-wider font-semibold">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <div className="bg-[#141418] rounded-2xl border border-white/[0.08] overflow-hidden">
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
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-[#09090b] border-white/[0.08] text-[#ff4500]">
                          {getTxIcon(tx.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{tx.title}</p>
                          <p className="text-xs text-[#8e8e98] mt-0.5 truncate">{tx.subtitle}</p>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          {tx.amount && (
                            <span className="font-mono text-sm font-semibold text-white">
                              {tx.amount}
                            </span>
                          )}
                          <span className={`font-mono text-[11px] mt-1 flex items-center gap-1.5 ${statusCfg.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {statusCfg.label}
                          </span>
                        </div>

                        <div
                          className={`text-[#8e8e98] transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180 text-white' : ''
                          }`}
                        >
                          <IconChevronDown size={16} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-[#09090b] border-b border-white/[0.06]"
                          >
                            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                              <div>
                                <p className="text-[10px] text-[#8e8e98] uppercase tracking-wider mb-1">
                                  Timestamp
                                </p>
                                <p className="text-white">
                                  {formatTime(tx.timestamp)} • {tx.timestamp.toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#8e8e98] uppercase tracking-wider mb-1">
                                  Category
                                </p>
                                <p className="text-white capitalize">{TYPE_LABELS[tx.type] || tx.type}</p>
                              </div>
                              {tx.txHash && (
                                <div className="sm:col-span-2 pt-2 border-t border-white/[0.06]">
                                  <p className="text-[10px] text-[#8e8e98] uppercase tracking-wider mb-1">
                                    Arbitrum Sepolia Transaction
                                  </p>
                                  <a
                                    href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#ff4500] hover:underline transition-colors flex items-center gap-1.5 break-all"
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
