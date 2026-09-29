import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';

// ── Inline hooks for mobile (no crypto.subtle in RN — use native passkey API) ─

function useBalanceMobile(address: string | null) {
  const [ethBalance, setEthBalance] = useState('0.00');
  const [usdcBalance, setUsdcBalance] = useState('0.00');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!address) return;
    const fetch_ = async () => {
      setIsFetching(true);
      try {
        const rpc = 'https://sepolia-rollup.arbitrum.io/rpc';
        const ethResp = await fetch(rpc, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
        });
        const ethJson = await ethResp.json();
        const weiHex = ethJson.result as string;
        const ethNum = parseInt(weiHex, 16) / 1e18;
        setEthBalance(ethNum.toFixed(4));

        // USDC balance call (balanceOf)
        const USDC = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
        const selector = '0x70a08231';
        const paddedAddr = address.replace('0x', '').padStart(64, '0');
        const usdcResp = await fetch(rpc, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_call', params: [{ to: USDC, data: selector + paddedAddr }, 'latest'] }),
        });
        const usdcJson = await usdcResp.json();
        const usdcHex = usdcJson.result as string;
        const usdcNum = parseInt(usdcHex, 16) / 1e6;
        setUsdcBalance(usdcNum.toFixed(2));
      } catch (_) {}
      finally { setIsFetching(false); }
    };
    fetch_();
    const timer = setInterval(fetch_, 15000);
    return () => clearInterval(timer);
  }, [address]);

  return { ethBalance, usdcBalance, isFetching };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PortfolioScreen() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const { ethBalance, usdcBalance, isFetching } = useBalanceMobile(walletAddress);

  // On mount, attempt to restore wallet from SecureStore / AsyncStorage
  useEffect(() => {
    // In a production app, use expo-secure-store to persist the credential ID.
    // For now we read from a simple key we'll set after registration.
    const stored = null; // Placeholder: AsyncStorage.getItem('stylussafe_address')
    if (stored) setWalletAddress(stored as string);
  }, []);

  const handleCreateWallet = async () => {
    setIsRegistering(true);
    try {
      // expo-local-authentication + expo-passkeys would trigger FaceID here.
      // For now we simulate a successful registration.
      const mockAddress = '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0');
      setWalletAddress(mockAddress);
      // AsyncStorage.setItem('stylussafe_address', mockAddress);
    } finally {
      setIsRegistering(false);
    }
  };

  const ethValue = parseFloat(ethBalance) * 3000;
  const usdcValue = parseFloat(usdcBalance);
  const netWorth = (ethValue + usdcValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: Spacing.md }}>
            <Text style={styles.pageTitle} adjustsFontSizeToFit numberOfLines={1}>Portfolio</Text>
            <Text style={styles.pageSubtitle} numberOfLines={1}>
              {walletAddress ? walletAddress.slice(0, 8) + '...' + walletAddress.slice(-6) : 'No wallet connected'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: walletAddress ? Colors.primary + '18' : Colors.error + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: walletAddress ? Colors.primary : Colors.error }]} />
            <Text style={[styles.statusText, { color: walletAddress ? Colors.primary : Colors.error }]}>
              {walletAddress ? 'Active' : 'No Wallet'}
            </Text>
          </View>
        </View>

        {/* Net Worth Card */}
        <View style={styles.netWorthCard}>
          <View style={styles.netWorthHeader}>
            <Text style={styles.netWorthLabel}>Consolidated Net Worth</Text>
            {isFetching && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>
          <Text style={styles.netWorthAmount} adjustsFontSizeToFit numberOfLines={1}>${walletAddress ? netWorth : '0.00'}</Text>
          <Text style={styles.netWorthCurrency}>USD</Text>

          <View style={styles.assetRow}>
            <View style={styles.assetChip}>
              <View style={[styles.assetDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.assetText}>{ethBalance} ETH</Text>
            </View>
            <View style={styles.assetChip}>
              <View style={[styles.assetDot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.assetText}>{usdcBalance} USDC</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {walletAddress ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={() => router.push('/transfer')}>
              <Text style={styles.primaryButtonText}>New Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8} onPress={() => router.push('/security')}>
              <Text style={styles.secondaryButtonText}>Sign Pending</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: Spacing.md }]}
            onPress={handleCreateWallet}
            disabled={isRegistering}
            activeOpacity={0.8}
          >
            {isRegistering
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryButtonText}>Create Wallet with FaceID</Text>
            }
          </TouchableOpacity>
        )}

        {/* Advanced Features */}
        <Text style={styles.sectionLabel}>Advanced Capabilities</Text>
        {[
          { title: 'Session Keys', subtitle: '1-click signing for 8 hours', icon: 'flash', route: '/session-keys' },
          { title: 'DCA Schedule', subtitle: 'Auto-invest every 7 days', icon: 'repeat', route: '/dca' },
          { title: 'Intent Batches', subtitle: 'Multi-step atomic swaps', icon: 'layers', route: '/intents' },
        ].map((item) => (
          <TouchableOpacity key={item.title} style={styles.featureCard} activeOpacity={0.75} onPress={() => router.push(item.route as any)}>
            <View style={styles.featureIconBox}>
              <Ionicons name={item.icon as any} size={22} color={Colors.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={[styles.featureSubtitle, { color: Colors.accentAzure }]}>Configure</Text>
          </TouchableOpacity>
        ))}

        {/* Footer badge */}
        <View style={styles.footerBadge}>
          <Text style={styles.footerText}>Rust-WASM Verified  ·  Stylus 0.5.2</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

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
    marginBottom: Spacing.sm,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  statusDot: { width: 7, height: 7, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  netWorthCard: {
    backgroundColor: Colors.surfaceZinc,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  netWorthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netWorthLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  netWorthAmount: { fontSize: 48, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -1.5, marginTop: Spacing.md },
  netWorthCurrency: { fontSize: 18, color: Colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', marginTop: 2 },
  assetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  assetChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assetDot: { width: 10, height: 10, borderRadius: 2 },
  assetText: { fontSize: 15, color: Colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.accentAzure,
    borderRadius: Radius.sm,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.sm,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },
  badge: { backgroundColor: Colors.tertiary, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace' },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', marginTop: Spacing.sm },
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
  featureIconBox: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
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
  footerText: { fontSize: 11, color: Colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace', letterSpacing: 0.5 },
});
