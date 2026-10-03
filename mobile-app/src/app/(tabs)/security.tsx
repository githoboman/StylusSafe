import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';

const SIGNERS = [
  { name: 'My iPhone (Primary)', date: 'Added Oct 24, 2023', active: true },
  { name: 'Work MacBook', date: 'Added Oct 25, 2023', active: false },
  { name: 'Hardware Key (YubiKey)', date: 'Added Nov 1, 2023', active: false },
];

export default function SecurityScreen() {
  const handleRemoveSigner = (name: string) => {
    Alert.alert(
      'Remove Signer',
      `Are you sure you want to remove "${name}"? This requires approval from 3 signers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Security</Text>
            <Text style={styles.pageSubtitle}>Manage signers and multi-approval thresholds.</Text>
          </View>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={() => {}}>
            <Text style={styles.addButtonText}>Add Signer</Text>
          </TouchableOpacity>
        </View>

        {/* Approval Policy */}
        <View style={styles.card}>
          <View style={styles.policyRow}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <Text style={styles.cardTitle}>Approval Policy</Text>
              <Text style={styles.cardSubtitle}>Transactions require <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>3 of 5</Text> signers</Text>
            </View>
            <TouchableOpacity style={styles.editButton} activeOpacity={0.75} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}} onPress={() => {}}>
              <Ionicons name="pencil-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Signers list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Authorized Signers</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{SIGNERS.length} Total</Text>
            </View>
          </View>

          {SIGNERS.map((signer) => (
            <View key={signer.name} style={styles.signerCard}>
              <View style={[styles.signerIconBox, { backgroundColor: signer.active ? Colors.accentAzure + '15' : Colors.surfaceContainer }]}>
                <Ionicons name={signer.active ? "phone-portrait-outline" : "laptop-outline"} size={20} color={signer.active ? Colors.accentAzure : Colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.signerName, { flexShrink: 1 }]} numberOfLines={1}>{signer.name}</Text>
                  <View style={styles.passkeyBadge}>
                    <Text style={styles.passkeyText}>Passkey</Text>
                  </View>
                </View>
                <Text style={styles.signerDate}>{signer.date}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveSigner(signer.name)} style={{ padding: 8 }} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.textMuted} style={{ flexShrink: 0 }} />
          <Text style={styles.infoText}>
            Adding a new signer creates a proposal that must be approved by{' '}
            <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>3</Text>{' '}
            existing signers before taking effect.
          </Text>
        </View>

        {/* Session Keys */}
        <Text style={styles.sectionLabel}>Session Keys</Text>
        <View style={styles.card}>
          <View style={styles.policyRow}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <Text style={styles.cardTitle}>Active Session</Text>
              <Text style={styles.cardSubtitle}>Expires in 6h 42m — 1-click trading enabled</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: Colors.primary + '18' }]}>
              <Text style={[styles.countText, { color: Colors.primary }]}>Active</Text>
            </View>
          </View>
        </View>

        {/* Spending Limits */}
        <Text style={styles.sectionLabel}>Spending Limits</Text>
        {[
          { label: 'Daily Limit', value: '$5,000 USD' },
          { label: 'Per-Transaction', value: '$1,000 USD' },
        ].map(item => (
          <View key={item.label} style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={styles.cardSubtitle}>{item.label}</Text>
            <Text style={styles.cardTitle}>{item.value}</Text>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.backgroundInk },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  pageTitle: { fontSize: 32, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  addButton: { backgroundColor: Colors.accentAzure, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, height: 38, justifyContent: 'center', marginTop: 6 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: Colors.surfaceZinc, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  policyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  cardSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  editButton: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  countBadge: { backgroundColor: Colors.primary + '18', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  countText: { fontSize: 11, color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', fontWeight: '600' },
  signerCard: { backgroundColor: Colors.surfaceZinc, borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  signerIconBox: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  signerName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  signerDate: { fontSize: 12, color: Colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', marginTop: 2 },
  passkeyBadge: { backgroundColor: Colors.primary + '18', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  passkeyText: { fontSize: 10, color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', fontWeight: '700', textTransform: 'uppercase' },
  infoCard: { backgroundColor: Colors.surfaceContainer + '60', borderRadius: Radius.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  infoText: { fontSize: 13, color: Colors.textMuted, flex: 1, lineHeight: 20 },
});
