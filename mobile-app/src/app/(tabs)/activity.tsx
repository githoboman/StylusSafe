import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';

const MOCK_TRANSACTIONS = [
  { id: '1', type: 'Bridge', desc: '0.5 ETH → Optimism', time: '2 min ago', status: 'Confirmed', amount: '0.5 ETH', positive: false },
  { id: '2', type: 'Receive', desc: 'From 0x1a2b...3c4d', time: '1h ago', status: 'Confirmed', amount: '+100 USDC', positive: true },
  { id: '3', type: 'Intent Batch', desc: '3 operations', time: '3h ago', status: 'Confirmed', amount: '—', positive: false },
  { id: '4', type: 'DCA', desc: 'Auto-swap ETH → USDC', time: '1d ago', status: 'Confirmed', amount: '0.1 ETH', positive: false },
  { id: '5', type: 'Session Key', desc: 'Created 8h session', time: '1d ago', status: 'Expired', amount: '—', positive: false },
  { id: '6', type: 'Receive', desc: 'From Faucet', time: '2d ago', status: 'Confirmed', amount: '+0.01 ETH', positive: true },
];

const TYPE_COLORS: Record<string, string> = {
  Bridge: Colors.accentAzure,
  Receive: Colors.primary,
  'Intent Batch': Colors.secondary,
  DCA: Colors.tertiary,
  'Session Key': Colors.textMuted,
};

const STATUS_COLORS: Record<string, string> = {
  Confirmed: Colors.primary,
  Pending: Colors.tertiary,
  Failed: Colors.error,
  Expired: Colors.textMuted,
};

export default function ActivityScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Activity</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => {}} activeOpacity={0.7}>
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.pageSubtitle}>All wallet transactions and events.</Text>

        {/* Stats Row */}
        <View style={styles.statsUnifiedCard}>
          {[
            { label: 'Total Txns', value: '24' },
            { label: 'Bridges', value: '6' },
            { label: 'Gas Saved', value: '$12.40' },
          ].map((stat, idx) => (
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
        {MOCK_TRANSACTIONS.map((tx) => (
          <TouchableOpacity key={tx.id} style={styles.txCard} activeOpacity={0.7} onPress={() => {}}>
            {/* Type indicator */}
            <View style={[styles.txIconBox, { backgroundColor: (TYPE_COLORS[tx.type] || Colors.textMuted) + '18' }]}>
              <Ionicons 
                name={tx.type === 'Bridge' ? 'arrow-up-right' : tx.type === 'Receive' ? 'arrow-down-left' : tx.type === 'DCA' ? 'repeat' : tx.type === 'Session Key' ? 'flash' : 'list'} 
                size={20} 
                color={TYPE_COLORS[tx.type] || Colors.textPrimary} 
              />
            </View>

            {/* Details */}
            <View style={{ flex: 1 }}>
              <Text style={styles.txType}>{tx.type}</Text>
              <Text style={styles.txDesc}>{tx.desc}</Text>
            </View>

            {/* Right column */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txAmount, tx.positive && { color: Colors.primary }]}>{tx.amount}</Text>
              <View style={styles.txTimestamp}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[tx.status] || Colors.textMuted }]} />
                <Text style={styles.txTime}>{tx.time}</Text>
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
