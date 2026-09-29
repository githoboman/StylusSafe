import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/constants/theme';

const SUPPORTED_TOKENS = [
  { symbol: 'ETH', name: 'Ether', color: Colors.primary },
  { symbol: 'USDC', name: 'USD Coin', color: Colors.secondary },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', color: '#F7931A' },
  { symbol: 'ARB', name: 'Arbitrum', color: '#12AAFF' },
];

const SUPPORTED_CHAINS = [
  { name: 'Arbitrum One', id: 42161, color: Colors.accentAzure },
  { name: 'Optimism', id: 10, color: '#FF0420' },
  { name: 'Base', id: 8453, color: '#0052FF' },
  { name: 'Polygon', id: 137, color: '#8247E5' },
];

export default function TransferScreen() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[1]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTransfer = async () => {
    if (!amount || !recipient) return;
    setIsSubmitting(true);
    try {
      // Calls to useInvisibleWallet executeCrossChainSwap would go here.
      await new Promise(r => setTimeout(r, 1500)); // Simulate pending
      setAmount('');
      setRecipient('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>New Transfer</Text>
        <Text style={styles.pageSubtitle}>Bridge and swap assets cross-chain. Gas is sponsored.</Text>

        {/* Token selector */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Asset</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
            <View style={styles.tokenRow}>
              {SUPPORTED_TOKENS.map((token) => (
                <TouchableOpacity
                  key={token.symbol}
                  style={[styles.tokenChip, selectedToken.symbol === token.symbol && styles.tokenChipActive]}
                  onPress={() => setSelectedToken(token)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.tokenDot, { backgroundColor: token.color }]} />
                  <Text style={[styles.tokenChipText, selectedToken.symbol === token.symbol && { color: Colors.textPrimary, fontWeight: '600' }]}>
                    {token.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Amount input */}
          <View style={[styles.inputRow, { marginTop: Spacing.md }]}>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted + '60'}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <Text style={styles.amountUnit}>{selectedToken.symbol}</Text>
          </View>
        </View>

        {/* Recipient */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Destination Address</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.amountInput, { fontSize: 14 }]}
              placeholder="0x... or ENS name"
              placeholderTextColor={Colors.textMuted + '60'}
              autoCapitalize="none"
              autoCorrect={false}
              value={recipient}
              onChangeText={setRecipient}
            />
            <TouchableOpacity hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}>
              <Text style={{ color: Colors.accentAzure, fontSize: 13, fontWeight: '600' }}>Paste</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chain selector */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Target Chain</Text>
          <View style={styles.chainGrid}>
            {SUPPORTED_CHAINS.map((chain) => (
              <TouchableOpacity
                key={chain.id}
                style={[styles.chainChip, selectedChain.id === chain.id && { borderColor: chain.color, backgroundColor: chain.color + '15' }]}
                onPress={() => setSelectedChain(chain)}
                activeOpacity={0.75}
              >
                <View style={[styles.chainDot, { backgroundColor: chain.color }]} />
                <Text style={[styles.chainText, selectedChain.id === chain.id && { color: chain.color, fontWeight: '600' }]}>
                  {chain.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Transaction Summary</Text>
          <View style={{ gap: Spacing.md, marginTop: Spacing.xs }}>
            {[
              { label: 'Network Fee', value: 'Sponsored', valueColor: Colors.primary },
              { label: 'Bridge Protocol', value: 'Across Protocol' },
              { label: 'Est. Time', value: '~45 seconds' },
            ].map(row => (
              <View key={row.label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{row.label}</Text>
                <Text style={[styles.summaryValue, row.valueColor ? { color: row.valueColor } : {}]}>{row.value}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.summaryRow, { paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm }]}>
            <Text style={styles.summaryLabel}>Total Deducted</Text>
            <Text style={[styles.summaryValue, { fontWeight: '600', color: Colors.textPrimary, fontSize: 14 }]}>{amount || '0.00'} {selectedToken.symbol}</Text>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, (!amount || !recipient) && { opacity: 0.4 }]}
          onPress={handleTransfer}
          disabled={!amount || !recipient || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitButtonText}>Review Transfer</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.backgroundInk },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  pageTitle: { fontSize: 32, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: Colors.textMuted },
  card: { backgroundColor: Colors.surfaceZinc, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  fieldLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  tokenRow: { flexDirection: 'row', gap: Spacing.sm },
  tokenChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer, borderWidth: 1, borderColor: Colors.border },
  tokenChipActive: { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '12' },
  tokenDot: { width: 8, height: 8, borderRadius: 2 },
  tokenChipText: { fontSize: 13, color: Colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainer, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  amountInput: { flex: 1, minWidth: 0, height: 56, fontSize: 28, fontWeight: '600', color: Colors.textPrimary },
  amountUnit: { fontSize: 16, color: Colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  chainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chainChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer, borderWidth: 1, borderColor: Colors.border },
  chainDot: { width: 8, height: 8, borderRadius: 99 },
  chainText: { fontSize: 12, color: Colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  summaryCard: { backgroundColor: Colors.surfaceZinc, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  summaryTitle: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', marginBottom: Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: Colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', flexShrink: 1, paddingRight: 8 },
  summaryValue: { fontSize: 12, color: Colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', flexShrink: 1, textAlign: 'right' },
  submitButton: { backgroundColor: Colors.accentAzure, borderRadius: Radius.sm, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
