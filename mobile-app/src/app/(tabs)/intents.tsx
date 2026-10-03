import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function IntentsScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignBatch = async () => {
    setIsSubmitting(true);
    // Simulate smart contract execute_batch UserOp
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    Alert.alert('Batch Executed', 'All actions successfully submitted atomically to Stylus.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageSubtitle}>
          Compose multiple actions across contracts and chains into a single atomic transaction.
        </Text>

        <Text style={styles.sectionTitle}>Draft Intent</Text>
        
        {/* Step 1 */}
        <View style={styles.stepCard}>
          <View style={styles.stepBadge}><Text style={styles.stepNum}>1</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Bridge Assets</Text>
            <Text style={styles.stepDesc}>Arbitrum Sepolia → Optimism</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
        </View>

        <View style={styles.line} />

        {/* Step 2 */}
        <View style={styles.stepCard}>
          <View style={styles.stepBadge}><Text style={styles.stepNum}>2</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Swap Asset</Text>
            <Text style={styles.stepDesc}>ETH → USDC on Uniswap V3</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
        </View>

        <View style={styles.line} />

        {/* Step 3 */}
        <View style={styles.stepCard}>
          <View style={styles.stepBadge}><Text style={styles.stepNum}>3</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Deposit to Protocol</Text>
            <Text style={styles.stepDesc}>Supply USDC to Aave V3</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => {}}>
          <Ionicons name="add" size={18} color={Colors.textPrimary} />
          <Text style={styles.addText}>Add Action</Text>
        </TouchableOpacity>

        <View style={styles.summaryBox}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.secondary} />
          <Text style={styles.summaryText}>
            If any step fails, the entire transaction reverts and no assets are moved.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isSubmitting && { opacity: 0.5 }]} 
          disabled={isSubmitting}
          onPress={handleSignBatch}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Sign Batch</Text>
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
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
