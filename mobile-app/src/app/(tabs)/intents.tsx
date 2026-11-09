import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { encodeFunctionData, isAddress, parseUnits } from 'viem';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useInvisibleWallet } from '@/hooks/useInvisibleWallet';

const USDG_ADDRESS = '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' as const;

type Step = { id: string; title: string; desc: string; dest: `0x${string}`; value: bigint; func: `0x${string}` };

export default function IntentsScreen() {
  const router = useRouter();
  const { executeIntentBatch } = useInvisibleWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [adding, setAdding] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleAddStep = () => {
    const amt = parseFloat(amount);
    if (!isAddress(recipient)) {
      Alert.alert('Check the address', 'Enter a valid wallet address (starts with 0x, 42 characters).');
      return;
    }
    if (!amt || amt <= 0) {
      Alert.alert('Check the amount', 'Enter an amount greater than zero.');
      return;
    }
    const data = encodeFunctionData({
      abi: [{ type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
      functionName: 'transfer',
      args: [recipient as `0x${string}`, parseUnits(amount, 6)],
    });
    setSteps((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        title: 'Send USDG',
        desc: `${amt} USDG to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
        dest: USDG_ADDRESS,
        value: 0n,
        func: data,
      },
    ]);
    setRecipient('');
    setAmount('');
    setAdding(false);
  };

  const handleSignBatch = async () => {
    if (steps.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await executeIntentBatch(
        steps.map((s) => ({ dest: s.dest, value: s.value, func: s.func })),
        '0000'
      );
      if (res?.userOpHash) {
        Alert.alert('Batch Executed', `All ${steps.length} actions were submitted together to Arbitrum Sepolia. Hash: ${res.userOpHash.slice(0, 10)}...`, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        throw new Error('Transaction submission failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit atomic batch');
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
        <Text style={styles.headerTitle}>Intent Batches</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageSubtitle}>
          Line up several actions and send them as one all-or-nothing transaction.
        </Text>

        <Text style={styles.sectionTitle}>Your Actions</Text>

        {steps.length === 0 && !adding && (
          <Text style={styles.pageSubtitle}>No actions yet. Tap Add Action to start your batch.</Text>
        )}

        {steps.map((step, i) => (
          <View key={step.id}>
            {i > 0 && <View style={styles.line} />}
            <View style={styles.stepCard}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSteps((prev) => prev.filter((s) => s.id !== step.id))}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle-outline" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {adding ? (
          <View style={[styles.stepCard, { flexDirection: 'column', alignItems: 'stretch', marginTop: Spacing.lg }]}>
            <Text style={styles.stepTitle}>Send USDG</Text>
            <TextInput
              style={styles.input}
              placeholder="Recipient address (0x...)"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              value={recipient}
              onChangeText={setRecipient}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount in USDG"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity style={[styles.addButton, { flex: 1, marginTop: 0 }]} onPress={() => setAdding(false)}>
                <Text style={styles.addText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addButton, { flex: 1, marginTop: 0, backgroundColor: Colors.accentAzure }]} onPress={handleAddStep}>
                <Text style={[styles.addText, { color: '#fff' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={() => setAdding(true)}>
            <Ionicons name="add" size={18} color={Colors.textPrimary} />
            <Text style={styles.addText}>Add Action</Text>
          </TouchableOpacity>
        )}

        <View style={styles.summaryBox}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.secondary} />
          <Text style={styles.summaryText}>
            If any step fails, the whole batch is cancelled and nothing is moved.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (isSubmitting || steps.length === 0) && { opacity: 0.5 }]}
          disabled={isSubmitting || steps.length === 0}
          onPress={handleSignBatch}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{steps.length ? `Sign ${steps.length} Action${steps.length > 1 ? 's' : ''}` : 'Sign Batch'}</Text>
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
  scroll: { padding: Spacing.lg, gap: 0 },
  sectionTitle: { fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceZinc, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  stepBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  stepTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  stepDesc: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  line: { width: 2, height: 24, backgroundColor: Colors.border, marginLeft: 27 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.md, marginTop: Spacing.lg, gap: 8 },
  addText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  summaryBox: { flexDirection: 'row', backgroundColor: Colors.secondary + '10', padding: Spacing.md, borderRadius: Radius.sm, marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.secondary + '40' },
  summaryText: { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  saveButton: { backgroundColor: Colors.accentAzure, borderRadius: Radius.sm, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  input: { backgroundColor: Colors.surfaceContainer, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, paddingHorizontal: Spacing.md, height: 46, marginVertical: Spacing.sm },
});
