import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function SessionKeysScreen() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerate = async () => {
    setIsSubmitting(true);
    // Simulate smart contract UserOp submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    Alert.alert('Session Key Generated', 'Your ephemeral key has been authorized for 8 hours.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Keys</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.title}>Enable Session Key</Text>
              <Text style={styles.subtitle}>Allows 1-click transactions for a limited time without requiring hardware or biometric signatures.</Text>
            </View>
            <Switch value={isEnabled} onValueChange={setIsEnabled} trackColor={{ true: Colors.primary }} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>8 Hours</Text>
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.label}>Max Spending Limit</Text>
            <Text style={styles.value}>1.5 ETH</Text>
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.label}>Target Contract</Text>
            <Text style={styles.value}>Across Bridge</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, (!isEnabled || isSubmitting) && { opacity: 0.5 }]} 
          disabled={!isEnabled || isSubmitting}
          onPress={handleGenerate}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Generate Key</Text>
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
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.surfaceZinc, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  borderTop: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.md, paddingTop: Spacing.md },
  title: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  sectionTitle: { fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.sm },
  label: { fontSize: 14, color: Colors.textMuted },
  value: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  saveButton: { backgroundColor: Colors.accentAzure, borderRadius: Radius.sm, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
