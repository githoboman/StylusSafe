import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function DCAScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [freqIndex, setFreqIndex] = useState(1); // Weekly by default

  const handleCreate = async () => {
    setIsSubmitting(true);
    // Simulate smart contract setup_subscription UserOp
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    Alert.alert('DCA Strategy Created', 'Your recurring swap has been scheduled on-chain.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
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
          Automatically swap assets on a recurring basis, powered entirely on-chain by Stylus intents.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Pay With</Text>
            <View style={styles.chip}><Text style={styles.chipText}>USDC</Text></View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.currency}>$</Text>
            <TextInput style={styles.input} placeholder="100.00" keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} />
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
