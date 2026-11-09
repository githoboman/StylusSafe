import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform, Linking, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useInvisibleWallet } from '@/hooks/useInvisibleWallet';
import { USDG_ADDRESS } from '@/hooks/useBalances';

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const ZERO = '0x0000000000000000000000000000000000000000';

type Tx = {
  id: string;
  type: 'Receive' | 'Send' | 'Mint';
  desc: string;
  block: bigint;
  status: 'Confirmed';
  amount: string;
  positive: boolean;
  hash: string;
};


const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

const TYPE_COLORS: Record<string, string> = {
  Receive: Colors.primary,
  Mint: Colors.tertiary,
  Send: Colors.accentAzure,
};

const STATUS_COLORS: Record<string, string> = {
  Confirmed: Colors.primary,
};

const short = (a?: string) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '');

export default function ActivityScreen() {
  const { address } = useInvisibleWallet();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setTxs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = createPublicClient({ transport: http(RPC_URL) });
      const latest = await client.getBlockNumber();
      const fromBlock = latest > 200_000n ? latest - 200_000n : 0n;
      const me = address as `0x${string}`;

      const [incoming, outgoing] = await Promise.all([
        client.getLogs({ address: USDG_ADDRESS, event: transferEvent, args: { to: me }, fromBlock, toBlock: latest }),
        client.getLogs({ address: USDG_ADDRESS, event: transferEvent, args: { from: me }, fromBlock, toBlock: latest }),
      ]);

      const list: Tx[] = [];
      for (const log of incoming) {
        const isMint = log.args.from?.toLowerCase() === ZERO;
        list.push({
          id: `in-${log.transactionHash}-${log.logIndex}`,
          type: isMint ? 'Mint' : 'Receive',
          desc: isMint ? 'Testnet USDG minted' : `From ${short(log.args.from)}`,
          block: log.blockNumber ?? 0n,
          status: 'Confirmed',
          amount: `+${Number(formatUnits(log.args.value ?? 0n, 6)).toFixed(2)} USDG`,
          positive: true,
          hash: log.transactionHash ?? '',
        });
      }
      for (const log of outgoing) {
        list.push({
          id: `out-${log.transactionHash}-${log.logIndex}`,
          type: 'Send',
          desc: `To ${short(log.args.to)}`,
          block: log.blockNumber ?? 0n,
          status: 'Confirmed',
          amount: `-${Number(formatUnits(log.args.value ?? 0n, 6)).toFixed(2)} USDG`,
          positive: false,
          hash: log.transactionHash ?? '',
        });
      }
      list.sort((a, b) => (a.block < b.block ? 1 : a.block > b.block ? -1 : 0));
      setTxs(list);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load on-chain activity');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const received = txs.filter((t) => t.positive).length;
    const sent = txs.length - received;
    return [
      { label: 'Total', value: String(txs.length) },
      { label: 'Received', value: String(received) },
      { label: 'Sent', value: String(sent) },
    ];
  }, [txs]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Activity</Text>
          <TouchableOpacity style={styles.filterButton} onPress={load} activeOpacity={0.7}>
            {loading ? <ActivityIndicator size="small" color={Colors.textMuted} /> : <Text style={styles.filterText}>Refresh</Text>}
          </TouchableOpacity>
        </View>
        <Text style={styles.pageSubtitle}>Live USDG transfers for your wallet on Arbitrum Sepolia.</Text>

        {/* Stats Row (derived from the real transfers below) */}
        <View style={styles.statsUnifiedCard}>
          {stats.map((stat, idx) => (
            <View key={stat.label} style={{ flexDirection: 'row', flex: 1 }}>
              <View style={styles.statColumn}>
                <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              {idx < 2 && <View style={styles.statDivider} />}
            </View>
          ))}
        </View>

        {/* Transaction feed */}
        <Text style={styles.sectionLabel}>Recent Transactions</Text>

        {!address && <Text style={styles.pageSubtitle}>Create or unlock your wallet to see activity.</Text>}
        {error && <Text style={[styles.pageSubtitle, { color: Colors.error }]}>{error}</Text>}
        {address && !loading && !error && txs.length === 0 && (
          <Text style={styles.pageSubtitle}>No transfers yet. Mint some USDG or make a swap and it will show up here.</Text>
        )}

        {txs.map((tx) => (
          <TouchableOpacity
            key={tx.id}
            style={styles.txCard}
            activeOpacity={0.7}
            onPress={() => tx.hash && Linking.openURL(`https://sepolia.arbiscan.io/tx/${tx.hash}`)}
          >
            <View style={[styles.txIconBox, { backgroundColor: (TYPE_COLORS[tx.type] || Colors.textMuted) + '18' }]}>
              <Ionicons
                name={tx.type === 'Send' ? 'arrow-up' : 'arrow-down'}
                size={20}
                color={TYPE_COLORS[tx.type] || Colors.textPrimary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.txType}>{tx.type}</Text>
              <Text style={styles.txDesc}>{tx.desc}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txAmount, tx.positive && { color: Colors.primary }]}>{tx.amount}</Text>
              <View style={styles.txTimestamp}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[tx.status] || Colors.textMuted }]} />
                <Text style={styles.txTime}>Block {tx.block.toString()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.endCaption}>
          <Text style={styles.endCaptionText}>All transactions are settled on Arbitrum Sepolia</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.backgroundInk },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 32, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: Colors.textMuted, marginTop: -4 },
  filterButton: { paddingHorizontal: Spacing.md, paddingVertical: 6, backgroundColor: Colors.surfaceContainer, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  filterText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  statsUnifiedCard: { backgroundColor: Colors.surfaceZinc, borderRadius: Radius.xl, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center' },
  statColumn: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.border },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  txCard: { backgroundColor: Colors.surfaceZinc, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  txIconBox: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txType: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  txDesc: { fontSize: 12, color: Colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  txTimestamp: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 99 },
  txTime: { fontSize: 11, color: Colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  endCaption: { alignItems: 'center', paddingVertical: Spacing.sm },
  endCaptionText: { fontSize: 11, color: Colors.textMuted + '80', fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
});
