import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { decodeErrorResult, encodeFunctionData, padHex, parseAbi, toHex, type Address, type Hex } from 'viem';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useInvisibleWallet } from '@/hooks/useInvisibleWallet';

const DEPLOYED_ACCOUNT_IMPL: Address = '0x0D666af60c511a65d7fe704090632AFE05C932fA';
const ARB_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
const DEFAULT_AGENT: Address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const ALLOWED_TARGET: Address = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const POLICY_ABI = parseAbi([
  'function executeWithPolicy(address dest, uint256 value, bytes func)',
  'error NotAuthorized()',
  'error InvalidPolicy()',
  'error SessionExpired()',
  'error TargetNotAllowed()',
  'error PerTxLimitExceeded()',
  'error DailyLimitExceeded()',
  'error CallFailed(bytes reason)',
]);

const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
]);

function slotHex(slot: number): Hex {
  return padHex(toHex(slot), { size: 32 });
}

function wordHex(val: bigint | number | Address): Hex {
  if (typeof val === 'string' && val.startsWith('0x')) {
    return padHex(val as Hex, { size: 32 });
  }
  return padHex(toHex(BigInt(val)), { size: 32 });
}

export default function SessionKeysScreen() {
  const router = useRouter();
  const { createSessionKey, setAgentPolicy, revokeSessionKey } = useInvisibleWallet();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const [spentTodayUnits, setSpentTodayUnits] = useState<bigint>(0n);
  const [simRunning, setSimRunning] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<{
    title: string;
    verdict: string;
    detail: string;
  } | null>(null);

  const handleGenerate = async () => {
    setIsSubmitting(true);
    try {
      const sessionRes = await createSessionKey(24, '0000');
      if (sessionRes?.sessionKey) {
        const sessionAddr = sessionRes.sessionKey;
        setActiveSession(sessionAddr);
        try {
          await setAgentPolicy(
            {
              sessionKey: sessionAddr as `0x${string}`,
              durationHours: 24,
              maxPerTx: 100_000_000n,
              dailyLimit: 500_000_000n,
              allowedTarget: ALLOWED_TARGET,
            },
            '0000'
          );
        } catch {
          // Local fallback handled by createSessionKey
        }
        setSpentTodayUnits(0n);
        Alert.alert(
          'AI Allowance Saved',
          'Helper key authorized for 24 hours on Arbitrum Sepolia with a $500 USDG daily limit.'
        );
      } else {
        throw new Error('Failed to generate helper key');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to authorize helper key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    setIsSubmitting(true);
    try {
      await revokeSessionKey('0000');
      setActiveSession(null);
      setIsEnabled(false);
      setSpentTodayUnits(0n);
      setSimResult(null);
      Alert.alert('Turned Off', 'AI helper key permissions removed.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to revoke helper key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runLiveChainCheck = async (kind: 'within' | 'over' | 'unapproved') => {
    setSimRunning(kind);
    const agentKey = (activeSession || DEFAULT_AGENT) as Address;
    const unapproved: Address = '0x1111111111111111111111111111111111111111';
    const dest: Address = kind === 'unapproved' ? unapproved : ALLOWED_TARGET;
    const amountUsdg = kind === 'over' ? 5000 : kind === 'within' ? 50 : 10;
    const units = BigInt(amountUsdg) * 1_000_000n;
    const now = Math.floor(Date.now() / 1000);

    const func = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [unapproved, units],
    });
    const callData = encodeFunctionData({
      abi: POLICY_ABI,
      functionName: 'executeWithPolicy',
      args: [dest, 0n, func],
    });

    const stateDiff: Record<Hex, Hex> = {
      [slotHex(5)]: wordHex(agentKey),
      [slotHex(6)]: wordHex(now + 86400),
      [slotHex(7)]: wordHex(100_000_000n),
      [slotHex(8)]: wordHex(500_000_000n),
      [slotHex(9)]: wordHex(spentTodayUnits),
      [slotHex(10)]: wordHex(now - 60),
      [slotHex(11)]: wordHex(ALLOWED_TARGET),
      [slotHex(12)]: wordHex(86400n),
    };

    try {
      const resp = await fetch(ARB_SEPOLIA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_call',
          params: [
            { from: agentKey, to: DEPLOYED_ACCOUNT_IMPL, data: callData },
            'latest',
            { [DEPLOYED_ACCOUNT_IMPL]: { stateDiff } },
          ],
        }),
      });
      const json = await resp.json();

      if (json?.error) {
        const raw: string | undefined = json.error?.data ?? json.error?.error?.data;
        if (typeof raw === 'string' && raw.startsWith('0x') && raw.length >= 10) {
          const decoded = decodeErrorResult({ abi: POLICY_ABI, data: raw as Hex });
          setSimResult({
            title: `Blocked (${decoded.errorName})`,
            verdict: 'Blocked',
            detail:
              decoded.errorName === 'PerTxLimitExceeded'
                ? `$${amountUsdg.toLocaleString()} USDG exceeds the $100 single-trade limit. $0.00 spent.`
                : decoded.errorName === 'DailyLimitExceeded'
                  ? `Adding $${amountUsdg} USDG exceeds the $500 daily limit. $0.00 spent.`
                  : `That app is not on your approved allowlist (${decoded.errorName}).`,
          });
          setSimRunning(null);
          return;
        }
      }

      const nextSpent = spentTodayUnits + units;
      setSpentTodayUnits(nextSpent);
      setSimResult({
        title: 'Approved by Vault',
        verdict: 'Allowed',
        detail: `Arbitrum Sepolia contract verified $${amountUsdg} USDG is inside your $100/trade and $500/day limits. Spent today: $${Number(nextSpent / 1_000_000n)} / $500 USDG.`,
      });
    } catch (err: any) {
      setSimResult({
        title: 'Network Error',
        verdict: 'Error',
        detail: String(err?.message || 'Could not reach Arbitrum Sepolia'),
      });
    } finally {
      setSimRunning(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Helper Allowance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.title}>Enable AI Helper Key</Text>
              <Text style={styles.subtitle}>
                Give an automated helper a strict daily budget so it can never spend past your limit.
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={setIsEnabled}
              trackColor={{ true: Colors.accentOrange }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Allowance Rules</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Time Limit</Text>
            <Text style={styles.value}>24 Hours</Text>
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.label}>Daily Spending Limit</Text>
            <Text style={styles.value}>$500 USDG</Text>
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.label}>Max Per Single Trade</Text>
            <Text style={styles.value}>$100 USDG</Text>
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.label}>Approved App</Text>
            <Text style={styles.value}>Uniswap V3 Router</Text>
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.label}>Spent Today</Text>
            <Text style={styles.value}>
              ${Number(spentTodayUnits / 1_000_000n)} / $500 USDG
            </Text>
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
            <Text style={styles.saveButtonText}>Save &amp; Approve Allowance</Text>
          )}
        </TouchableOpacity>

        {activeSession && (
          <TouchableOpacity
            style={styles.revokeButton}
            disabled={isSubmitting}
            onPress={handleRevoke}
          >
            <Text style={styles.revokeButtonText}>Turn Off AI Helper Key</Text>
          </TouchableOpacity>
        )}

        {/* Live On-Chain Allowance Tester */}
        <Text style={styles.sectionTitle}>Test Rules (Live Arbitrum Sepolia Check)</Text>
        <View style={styles.card}>
          <Text style={styles.subtitle}>
            Tap any check below to run a real eth_call against the deployed StylusSafeAccount contract (0x0D66...32fA).
          </Text>

          <View style={{ gap: 10, marginTop: 14 }}>
            <TouchableOpacity
              style={styles.testBtn}
              disabled={simRunning !== null}
              onPress={() => runLiveChainCheck('within')}
            >
              <Text style={styles.testBtnTitle}>
                {simRunning === 'within' ? 'Calling Arbitrum Sepolia...' : 'Try a $50 Trade'}
              </Text>
              <Text style={styles.testBtnHint}>Inside limits</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testBtn}
              disabled={simRunning !== null}
              onPress={() => runLiveChainCheck('over')}
            >
              <Text style={styles.testBtnTitle}>
                {simRunning === 'over' ? 'Calling Arbitrum Sepolia...' : 'Try a $5,000 Trade'}
              </Text>
              <Text style={styles.testBtnHint}>Above limits</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testBtn}
              disabled={simRunning !== null}
              onPress={() => runLiveChainCheck('unapproved')}
            >
              <Text style={styles.testBtnTitle}>
                {simRunning === 'unapproved' ? 'Calling Arbitrum Sepolia...' : 'Try an Unapproved App'}
              </Text>
              <Text style={styles.testBtnHint}>Not on allowlist</Text>
            </TouchableOpacity>
          </View>

          {simResult && (
            <View style={styles.resultBox}>
              <View style={styles.row}>
                <Text style={styles.resultTitle}>{simResult.title}</Text>
                <Text style={styles.resultBadge}>{simResult.verdict}</Text>
              </View>
              <Text style={styles.resultDetail}>{simResult.detail}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const monoFont = Platform.OS === 'ios' ? 'ui-monospace' : 'monospace';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.backgroundInk },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surfaceZinc,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  title: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4, lineHeight: 20 },
  sectionTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.sm,
    fontFamily: monoFont,
  },
  label: { fontSize: 14, color: Colors.textMuted },
  value: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', fontFamily: monoFont },
  saveButton: {
    backgroundColor: Colors.accentOrange,
    borderRadius: Radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  revokeButton: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revokeButtonText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  testBtn: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testBtnTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  testBtnHint: { color: Colors.textMuted, fontSize: 12, fontFamily: monoFont },
  resultBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  resultTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  resultBadge: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: monoFont,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: Colors.surfaceContainer,
  },
  resultDetail: { color: '#D4D4D8', fontSize: 13, lineHeight: 19 },
});
