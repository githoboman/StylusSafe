import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useInvisibleWallet } from '@/hooks/useInvisibleWallet';

const PAYEE_PRESETS = [
  { label: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
  { label: 'Weekly Savings Vault', address: '0xFE5759aA7C45421b773E937B7B4aea2E21adD3Fc' },
];

export default function DCAScreen() {
  const router = useRouter();
  const { address, setupDCA } = useInvisibleWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [freqIndex, setFreqIndex] = useState(1); // Weekly by default
  const [amountStr, setAmountStr] = useState('100.00');
  const [payeeAddress, setPayeeAddress] = useState('');

  const handleCreate = async () => {
    const trimmedPayee = payeeAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmedPayee)) {
      Alert.alert('Valid Payee Required', 'Enter a valid 0x address for the authorized payee or auto-swap router.');
      return;
    }
    if (address && trimmedPayee.toLowerCase() === address.toLowerCase()) {
      Alert.alert('Invalid Payee', 'Payee cannot be your own wallet address.');
      return;
    }
    setIsSubmitting(true);
    try {
      const freqDays = freqIndex === 0 ? 1 : freqIndex === 1 ? 7 : 30;
      const parsedNum = parseFloat(amountStr);
      if (!parsedNum || parsedNum <= 0) {
        Alert.alert('Invalid Amount', 'Enter a USDG amount greater than zero.');
        setIsSubmitting(false);
        return;
      }
      const parsedAmount = BigInt(Math.floor(parsedNum * 1_000_000));

      const success = await setupDCA(trimmedPayee as `0x${string}`, parsedAmount, freqDays, '0000');
      if (success) {
        Alert.alert('DCA Strategy Created', `Recurring authorization of $${amountStr} USDG every ${freqDays} days for ${trimmedPayee.slice(0, 6)}...${trimmedPayee.slice(-4)} saved on-chain.`, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        throw new Error('On-chain subscription registration failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit DCA subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DCA Schedule</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageSubtitle}>
          Automatically swap assets on a recurring basis, powered entirely on-chain by StylusSafe subscription intents.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Pay With</Text>
            <View style={styles.chip}><Text style={styles.chipText}>USDG</Text></View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.currency}>$</Text>
            <TextInput 
              style={styles.input} 
              value={amountStr} 
              onChangeText={setAmountStr}
              keyboardType="decimal-pad" 
              placeholderTextColor={Colors.textMuted} 
            />
          </View>
        </View>

        <View style={styles.arrowContainer}>
          <Ionicons name="arrow-down" size={20} color={Colors.textMuted} />
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Receive</Text>
            <View style={[styles.chip, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '50' }]}>
              <Text style={[styles.chipText, { color: Colors.primary }]}>ETH</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Authorized Payee / Router Address</Text>
        <View style={styles.card}>
          <TextInput
            style={[styles.input, { fontSize: 13 }]}
            value={payeeAddress}
            onChangeText={setPayeeAddress}
            placeholder="0x... (merchant or DEX router)"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={[styles.row, { marginTop: Spacing.sm }]}>
            {PAYEE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.address}
                style={[styles.freqBtn, payeeAddress.toLowerCase() === preset.address.toLowerCase() && styles.freqBtnActive]}
                onPress={() => setPayeeAddress(preset.address)}
              >
                <Text style={[styles.freqText, { fontSize: 12 }, payeeAddress.toLowerCase() === preset.address.toLowerCase() && { color: Colors.primary }]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Frequency</Text>
        <View style={styles.row}>
          {['Daily', 'Weekly', 'Monthly'].map((freq, i) => (
            <TouchableOpacity key={freq} style={[styles.freqBtn, i === freqIndex && styles.freqBtnActive]} onPress={() => setFreqIndex(i)}>
              <Text style={[styles.freqText, i === freqIndex && { color: Colors.primary }]}>{freq}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isSubmitting && { opacity: 0.5 }]} 
          disabled={isSubmitting}
          onPress={handleCreate}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Create DCA Strategy</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.backgroundInk },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  pageSubtitle: { fontSize: 14, color: Colors.textMuted, lineHeight: 20, marginBottom: Spacing.md },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.surfaceZinc, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  label: { fontSize: 14, color: Colors.textMuted },
  chip: { backgroundColor: Colors.surfaceContainer, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, padding: Spacing.sm, backgroundColor: Colors.surfaceContainer, borderRadius: Radius.sm },
  currency: { fontSize: 24, color: Colors.textMuted, marginRight: 4 },
  input: { flex: 1, fontSize: 24, fontWeight: '600', color: Colors.textPrimary },
  arrowContainer: { alignItems: 'center', paddingVertical: 4 },
  sectionTitle: { fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.sm },
  freqBtn: { flex: 1, backgroundColor: Colors.surfaceZinc, borderWidth: 1, borderColor: Colors.border, paddingVertical: 12, alignItems: 'center', borderRadius: Radius.sm },
  freqBtnActive: { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '10' },
  freqText: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  saveButton: { backgroundColor: Colors.accentAzure, borderRadius: Radius.sm, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
