import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useInvisibleWallet } from '@/hooks/useInvisibleWallet';
import { FALLBACK_TOKEN_USD_PRICES, fetchLifiQuote, fetchLiveTokenPrices, type LifiQuote } from '@/lib/lifi';

const SUPPORTED_TOKENS = [
  { symbol: 'USDG', address: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36', decimals: 6, name: 'USDG Treasury (6 Decimals)', color: '#ff4500' },
  { symbol: 'USDC', address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', decimals: 6, name: 'USD Coin', color: Colors.secondary },
  { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', decimals: 18, name: 'Ether', color: Colors.primary },
  { symbol: 'WBTC', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 8, name: 'Wrapped Bitcoin', color: '#F7931A' },
];

const SUPPORTED_CHAINS = [
  { name: 'Arbitrum Sepolia', id: 421614, color: Colors.accentAzure },
  { name: 'Optimism', id: 10, color: '#FF0420' },
  { name: 'Base', id: 8453, color: '#0052FF' },
  { name: 'Polygon', id: 137, color: '#8247E5' },
];

export default function TransferScreen() {
  const [amount, setAmount] = useState('50');
  const [recipient, setRecipient] = useState('');
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [selectedDestToken, setSelectedDestToken] = useState(SUPPORTED_TOKENS[1]);
  const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[1]);
  const [customToToken, setCustomToToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const { address, executeCrossChainSwap } = useInvisibleWallet();

  const [livePrices, setLivePrices] = useState<Record<string, number>>(FALLBACK_TOKEN_USD_PRICES);
  const [quote, setQuote] = useState<LifiQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchLiveTokenPrices(controller.signal).then(({ prices }) => {
      if (!controller.signal.aborted) setLivePrices(prices);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setQuote(null);
      return;
    }
    const destSym = (customToToken.trim().toUpperCase() || selectedDestToken.symbol);
    const destTok = SUPPORTED_TOKENS.find((t) => t.symbol === destSym) ?? selectedDestToken;
    const controller = new AbortController();
    setQuoteLoading(true);
    const timer = setTimeout(async () => {
      const q = await fetchLifiQuote({
        fromChainId: 421614,
        toChainId: selectedChain.id,
        fromSymbol: selectedToken.symbol,
        toSymbol: destSym,
        fromDecimals: selectedToken.decimals,
        toDecimals: destTok.decimals,
        amount: parsed,
        fromAddress: address,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setQuote(q);
        setQuoteLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [amount, selectedToken, selectedDestToken, selectedChain, customToToken, address]);

  const computeEstimatedOutput = () => {
    const parsed = parseFloat(amount || '0');
    if (!parsed || parsed <= 0) return '0.00';
    if (quote) return quote.toAmount.toFixed(quote.toAmount < 1 ? 5 : 2);
    const destSym = (customToToken.trim().toUpperCase() || selectedDestToken.symbol);
    const inUsd = parsed * (livePrices[selectedToken.symbol] ?? 1);
    const outPrice = livePrices[destSym] ?? 1;
    const out = inUsd / outPrice;
    return out.toFixed(out < 1 ? 5 : 2);
  };

  const handleTransfer = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    setIsSubmitting(true);
    setLastTxHash(null);
    try {
      const targetRecipient = (recipient.trim() || address || '0xFE5759aA7C45421b773E937B7B4aea2E21adD3Fc') as `0x${string}`;
      const amountRaw = BigInt(Math.floor(parsed * 10 ** selectedToken.decimals));
      const toToken = customToToken || selectedDestToken.address;
      const res = await executeCrossChainSwap(
        selectedChain.id,
        selectedToken.symbol,
        toToken,
        amountRaw,
        targetRecipient,
      );
      if (res?.userOpHash) {
        setLastTxHash(res.userOpHash);
      }
      setAmount('');
      setRecipient('');
      setCustomToToken('');
    } catch (e) {
      console.error(e);
      alert('Swap failed: ' + String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Cross-Chain Swap</Text>
        <Text style={styles.pageSubtitle}>Bridge and swap assets with sponsored gas on Arbitrum Sepolia.</Text>

        {lastTxHash && (
          <View style={styles.successBanner}>
            <Text style={styles.successTitle}>Swap Executed On-Chain</Text>
            <Text style={styles.successHash} numberOfLines={1}>{lastTxHash}</Text>
          </View>
        )}

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

          <Text style={[styles.fieldLabel, { marginTop: Spacing.xs }]}>Receive Token</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tokenRow}>
              {SUPPORTED_TOKENS.map((token) => (
                <TouchableOpacity
                  key={`dest-${token.symbol}`}
                  style={[styles.tokenChip, selectedDestToken.symbol === token.symbol && !customToToken && styles.tokenChipActive]}
                  onPress={() => { setSelectedDestToken(token); setCustomToToken(''); }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.tokenDot, { backgroundColor: token.color }]} />
                  <Text style={[styles.tokenChipText, selectedDestToken.symbol === token.symbol && !customToToken && { color: Colors.textPrimary, fontWeight: '600' }]}>
                    {token.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.inputRow, { marginTop: Spacing.xs }]}>
            <TextInput
              style={[styles.amountInput, { fontSize: 14 }]}
              placeholder="Or custom destination token symbol / 0x address"
              placeholderTextColor={Colors.textMuted + '60'}
              value={customToToken}
              onChangeText={setCustomToToken}
            />
          </View>

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

        {/* Recipient (optional) */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Recipient Address (Optional)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.amountInput, { fontSize: 14 }]}
              placeholder={address ? `Defaults to your wallet (${address.slice(0, 6)}...${address.slice(-4)})` : '0x...'}
              placeholderTextColor={Colors.textMuted + '60'}
              autoCapitalize="none"
              autoCorrect={false}
              value={recipient}
              onChangeText={setRecipient}
            />
          </View>
        </View>

        {/* Chain selector */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Target Chain</Text>
          <View style={styles.chainGrid}>
            {SUPPORTED_CHAINS.map((chain) => (
              <TouchableOpacity
                key={chain.id}
                style={[styles.chainChip, selectedChain.id === chain.id && { borderColor: '#ff4500', backgroundColor: 'rgba(255,69,0,0.12)' }]}
                onPress={() => setSelectedChain(chain)}
                activeOpacity={0.75}
              >
                <View style={[styles.chainDot, { backgroundColor: chain.color }]} />
                <Text style={[styles.chainText, selectedChain.id === chain.id && { color: '#ffffff', fontWeight: '600' }]}>
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
              { label: 'Estimated Output', value: `${computeEstimatedOutput()} ${customToToken.trim().toUpperCase() || selectedDestToken.symbol}`, valueColor: '#ffffff' },
              { label: 'Route', value: quoteLoading ? 'Fetching live quote...' : quote ? `Li.Fi (${quote.tool})` : 'Price estimate (no Li.Fi route)' },
              { label: 'Network Fees', value: quote ? `$${quote.feeUsd.toFixed(2)} fees + $${quote.gasUsd.toFixed(2)} gas` : 'Unavailable' },
              { label: 'Your Gas', value: 'Sponsored ($0.00)', valueColor: '#ffffff' },
              { label: 'Est. Time', value: quote ? `~${Math.max(quote.durationSec, 1)}s` : 'Unavailable' },
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
          style={[styles.submitButton, (!amount || parseFloat(amount) <= 0) && { opacity: 0.4 }]}
          onPress={handleTransfer}
          disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitButtonText}>Execute Swap ({amount || '0'} {selectedToken.symbol})</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.backgroundInk },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  pageTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: Colors.textMuted },
  successBanner: { backgroundColor: '#141418', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,69,0,0.4)', gap: 4 },
  successTitle: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  successHash: { fontSize: 11, color: '#ff4500', fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  card: { backgroundColor: Colors.surfaceZinc, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  fieldLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  tokenRow: { flexDirection: 'row', gap: Spacing.sm },
  tokenChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer, borderWidth: 1, borderColor: Colors.border },
  tokenChipActive: { borderColor: '#ff4500', backgroundColor: 'rgba(255,69,0,0.12)' },
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
  submitButton: { backgroundColor: '#ff4500', borderRadius: Radius.md, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
