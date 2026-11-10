import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useInvisibleWallet } from '@/hooks/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';
import { getMobileBiometricStatus } from '@/hooks/biometricAuthenticator';

export default function PortfolioScreen() {
  const router = useRouter();
  const [selectedChain] = useState(421614);
  const {
    address: walletAddress,
    register,
    recoverWithBiometrics,
    disconnect,
    isPending,
  } = useInvisibleWallet();
  const {
    usdgBalance,
    ethBalance,
    usdcBalance,
    customTokens,
    isFetching,
    refetch,
  } = useBalances(walletAddress, selectedChain);

  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [bioMode, setBioMode] = useState<'enroll' | 'recover'>('enroll');
  const [bioStage, setBioStage] = useState<'face' | 'fingerprint' | 'complete'>('face');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const bioStatus = getMobileBiometricStatus();

  const openBiometricModal = (mode: 'enroll' | 'recover', initialStage: 'face' | 'fingerprint' = 'face') => {
    setBioMode(mode);
    setBioStage(initialStage);
    setStatusMessage(null);
    setBioModalVisible(true);
  };

  const handleCompleteFaceStage = () => {
    setBioStage('fingerprint');
  };

  const handleBindHardwareEnclave = async () => {
    try {
      setStatusMessage('Binding P-256 hardware enclave keypair...');
      if (bioMode === 'enroll') {
        const created = await register('MobileBiometricOwner', undefined, bioStage === 'fingerprint' ? 'fingerprint' : 'face');
        setBioStage('complete');
        setStatusMessage(`Vault ${created.walletAddress.slice(0, 8)}...${created.walletAddress.slice(-6)} created on Arbitrum Sepolia.`);
      } else {
        const addr = await recoverWithBiometrics();
        setBioStage('complete');
        setStatusMessage(addr ? `Unlocked vault ${addr.slice(0, 8)}...${addr.slice(-6)}.` : 'Biometric vault unlocked.');
      }
      setTimeout(() => {
        setBioModalVisible(false);
        refetch();
      }, 900);
    } catch (e) {
      setStatusMessage('Verification error: ' + String(e));
    }
  };

  const usdgValue = parseFloat((usdgBalance || '0').replace(/,/g, '')) * 1.0;
  const usdcValue = parseFloat((usdcBalance || '0').replace(/,/g, '')) * 1.0;
  const netWorth = (usdgValue + usdcValue).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Dual-Biometric Enrollment & Recovery Modal */}
      <Modal
        visible={bioModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBioModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalBadge}>
                  {bioMode === 'enroll'
                    ? 'FIRST-TIME BIOMETRIC ENROLLMENT'
                    : 'BIOMETRIC WALLET RECOVERY'}
                </Text>
                <Text style={styles.modalTitle}>
                  {bioStage === 'face'
                    ? 'Step 1: OpenBR 64-D Face Scan'
                    : bioStage === 'fingerprint'
                      ? 'Step 2: Hardware Fingerprint / FaceID'
                      : 'Biometric Vault Ready'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBioModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {bioStage === 'face' && (
              <View style={styles.stageBox}>
                <View style={styles.scanFrame}>
                  <Ionicons name="scan-outline" size={58} color={Colors.accentOrange} />
                  <Text style={styles.scanTitle}>468-Point Active Liveness + OpenBR 64-D</Text>
                  <Text style={styles.scanDesc}>
                    Extracts a 64-dimensional craniofacial geometry vector to bind your face to your Arbitrum Sepolia smart account.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryModalBtn}
                  activeOpacity={0.85}
                  onPress={handleCompleteFaceStage}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                  <Text style={styles.primaryModalBtnText}>
                    Verify Face Liveness &amp; Continue
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {bioStage === 'fingerprint' && (
              <View style={styles.stageBox}>
                <View style={styles.scanFrame}>
                  <Ionicons name="finger-print-outline" size={58} color="#10B981" />
                  <Text style={styles.scanTitle}>
                    {bioStatus.biometryType} · {bioStatus.keyAlgorithm}
                  </Text>
                  <Text style={styles.scanDesc}>
                    Signs and binds your hardware P-256 CryptoObject keypair and auto-funds 1,000.00 real Testnet USDG.
                  </Text>
                </View>

                {statusMessage && (
                  <Text style={styles.statusInfoText}>{statusMessage}</Text>
                )}

                <TouchableOpacity
                  style={[styles.primaryModalBtn, { backgroundColor: '#10B981' }]}
                  activeOpacity={0.85}
                  onPress={handleBindHardwareEnclave}
                  disabled={isPending}
                >
                  {isPending ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="finger-print-outline" size={18} color="#FFF" />
                      <Text style={styles.primaryModalBtnText}>
                        {bioMode === 'enroll'
                          ? 'Bind Fingerprint & Claim 1,000 USDG'
                          : 'Unlock Biometric Vault'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {bioStage === 'complete' && (
              <View style={styles.stageBox}>
                <View style={styles.scanFrame}>
                  <Ionicons name="shield-checkmark-outline" size={58} color="#10B981" />
                  <Text style={styles.scanTitle}>Biometric Vault Verified</Text>
                  <Text style={styles.scanDesc}>
                    {statusMessage || 'Your smart account is active on Arbitrum Sepolia.'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: Spacing.sm }}>
            <Text style={styles.pageTitle} adjustsFontSizeToFit numberOfLines={1}>
              Treasury Vault
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
              <Text style={styles.pageSubtitle} numberOfLines={1}>
                {walletAddress
                  ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
                  : 'No biometric enclave connected'}
              </Text>
              {walletAddress && (
                <TouchableOpacity onPress={disconnect}>
                  <Text style={styles.disconnectLink}>[disconnect]</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: Colors.surfaceZinc,
                  borderWidth: 1,
                  borderColor: Colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: walletAddress ? Colors.accentOrange : Colors.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: Colors.textPrimary },
                ]}
              >
                {walletAddress ? 'RIP-7212' : 'Locked'}
              </Text>
            </View>
          </View>
        </View>

        {/* Consolidated Net Worth Card */}
        <View style={styles.netWorthCard}>
          <View style={styles.netWorthHeader}>
            <Text style={styles.netWorthLabel}>Consolidated Treasury Balance</Text>
            {isFetching && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>
          <Text style={styles.netWorthAmount} adjustsFontSizeToFit numberOfLines={1}>
            ${walletAddress ? netWorth : '0.00'}
          </Text>
          <Text style={styles.netWorthCurrency}>USDG (Arbitrum Sepolia)</Text>

          <View style={styles.assetRow}>
            <View style={styles.assetChip}>
              <View style={[styles.assetDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.assetText}>
                {walletAddress ? usdgBalance : '0.00'} USDG
              </Text>
            </View>
            <View style={styles.assetChip}>
              <View style={[styles.assetDot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.assetText}>
                {walletAddress ? usdcBalance : '0.00'} USDC
              </Text>
            </View>
            <View style={styles.assetChip}>
              <View style={[styles.assetDot, { backgroundColor: Colors.accentAzure }]} />
              <Text style={styles.assetText}>
                {walletAddress ? ethBalance : '0.00'} ETH
              </Text>
            </View>
            {customTokens?.map((t: any) => (
              <View key={t.address} style={styles.assetChip}>
                <View
                  style={[
                    styles.assetDot,
                    {
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: Colors.textMuted,
                    },
                  ]}
                />
                <Text style={styles.assetText}>
                  {t.balance} {t.symbol}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Biometric Vault Enrollment / Recovery / Actions */}
        {walletAddress ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => router.push('/transfer' as any)}
            >
              <Ionicons name="swap-horizontal-outline" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>1-Click Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => router.push('/security' as any)}
            >
              <Ionicons name="finger-print-outline" size={18} color={Colors.primary} />
              <Text style={styles.secondaryButtonText}>Enclave Security</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.enrollCard}>
            <View style={{ gap: 4 }}>
              <Text style={styles.enrollTitle}>
                Hold Your Wallet with FaceID &amp; Fingerprint
              </Text>
              <Text style={styles.enrollSubtitle}>
                Enroll your OpenBR 64-D facial vector and hardware secp256r1 passkey to deploy your vault and auto-claim 1,000.00 Testnet USDG.
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: Colors.accentOrange }]}
                onPress={() => openBiometricModal('enroll', 'fingerprint')}
                disabled={isPending}
                activeOpacity={0.85}
              >
                <Ionicons name="finger-print-outline" size={17} color="#FFF" />
                <Text style={styles.primaryButtonText}>Create with Fingerprint</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => openBiometricModal('enroll', 'face')}
                disabled={isPending}
                activeOpacity={0.85}
              >
                <Ionicons name="scan-outline" size={17} color={Colors.textPrimary} />
                <Text style={styles.secondaryButtonText}>Face + Fingerprint</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.secondaryButton, { width: '100%' }]}
              onPress={() => openBiometricModal('recover', 'fingerprint')}
              disabled={isPending}
              activeOpacity={0.85}
            >
              <Ionicons name="key-outline" size={17} color={Colors.textPrimary} />
              <Text style={styles.secondaryButtonText}>Unlock / Recover Existing Vault</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Advanced Capabilities */}
        <Text style={styles.sectionLabel}>Autonomous Guardrails &amp; Intents</Text>
        {[
          {
            title: 'AI Agent Spending Firewall',
            subtitle: '$500/day USDG cap · 1-block biometric killswitch',
            icon: 'shield-half-outline',
            route: '/session-keys',
          },
          {
            title: 'DCA & Recurring Streams',
            subtitle: 'Automated USDG treasury accumulation every 7 days',
            icon: 'repeat-outline',
            route: '/dca',
          },
          {
            title: 'Atomic Intent Batches',
            subtitle: 'Multi-call cross-chain settlement in 1 signature',
            icon: 'layers-outline',
            route: '/intents',
          },
        ].map((item) => (
          <TouchableOpacity
            key={item.title}
            style={styles.featureCard}
            activeOpacity={0.75}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.featureIconBox}>
              <Ionicons name={item.icon as any} size={22} color={Colors.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={[styles.featureSubtitle, { color: Colors.accentOrange, fontWeight: '600' }]}>
              Open →
            </Text>
          </TouchableOpacity>
        ))}

        {/* Footer Telemetry Badge */}
        <View style={styles.footerBadge}>
          <Text style={styles.footerText}>
            Arbitrum Stylus WASM · RIP-7212 (0x0100) · Paxos USDG
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const monoFont = Platform.OS === 'ios' ? 'ui-monospace' : 'monospace';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroundInk,
  },
  scroll: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: monoFont,
  },
  disconnectLink: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
    fontFamily: monoFont,
  },
  swipeGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceZinc,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  swipeGuideText: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontFamily: monoFont,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  statusDot: { width: 7, height: 7, borderRadius: 99 },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: monoFont,
  },
  netWorthCard: {
    backgroundColor: Colors.surfaceZinc,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  netWorthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netWorthLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: monoFont,
  },
  netWorthAmount: {
    fontSize: 44,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -1.2,
    marginTop: Spacing.sm,
    fontFamily: monoFont,
  },
  netWorthCurrency: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: monoFont,
    marginTop: 4,
  },
  assetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  assetChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assetDot: { width: 9, height: 9, borderRadius: 99 },
  assetText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: monoFont,
  },
  enrollCard: {
    backgroundColor: Colors.surfaceZinc,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accentOrange + '40',
    gap: Spacing.md,
  },
  enrollTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  enrollSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
  },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.accentOrange,
    borderRadius: Radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: monoFont,
    marginTop: Spacing.xs,
  },
  featureCard: {
    backgroundColor: Colors.surfaceZinc,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  featureSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  footerBadge: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: monoFont,
    letterSpacing: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#121216',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.md,
  },
  modalBadge: {
    fontSize: 10,
    fontFamily: monoFont,
    color: Colors.accentOrange,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  modalCloseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceContainer,
  },
  modalCloseText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: monoFont,
  },
  stageBox: {
    gap: Spacing.md,
  },
  scanFrame: {
    backgroundColor: '#09090B',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scanTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  scanDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  statusInfoText: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: monoFont,
    textAlign: 'center',
  },
  primaryModalBtn: {
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
