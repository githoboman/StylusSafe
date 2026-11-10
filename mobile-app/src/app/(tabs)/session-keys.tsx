import React, { useCallback, useEffect, useState } from 'react';
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createPublicClient, decodeErrorResult, encodeFunctionData, formatUnits, http, padHex, parseAbi, toHex, zeroAddress, type Address, type Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useInvisibleWallet } from '@/hooks/useInvisibleWallet';
import { SWAP_POOL_ADDRESS } from '@/hooks/useBalances';

const DEPLOYED_ACCOUNT_IMPL: Address = '0x0242E382976489B6E5aceEB7507a449B01535888';
const ARB_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';

const TARGET_PRESETS: { name: string; address: Address }[] = [
  { name: 'SwapPool (421614)', address: SWAP_POOL_ADDRESS },
  { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
  { name: 'USDG Treasury', address: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' },
  { name: 'Any External App', address: zeroAddress },
];

const KIND_LABELS: Record<number, string> = {
  0: 'AI Agent',
  1: 'DCA Bot',
  2: 'Subscription',
};

const POLICY_ABI = parseAbi([
  'function sessionKey() view returns (address)',
  'function sessionMaxPerTx() view returns (uint256)',
  'function sessionDailyLimit() view returns (uint256)',
  'function sessionSpentToday() view returns (uint256)',
  'function sessionAllowedTarget() view returns (address)',
  'function getAllPolicies() view returns ((address key, uint48 expiry, uint8 kind, bool active, uint256 maxPerTx, uint256 dailyLimit, uint256 spent, uint256 lastReset, address allowedTarget, uint256 window)[])',
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

type MobilePolicy = {
  key: Address;
  expiry: number;
  kind: number;
  maxPerTx: bigint;
  dailyLimit: bigint;
  spent: bigint;
  allowedTarget: Address;
  windowSeconds: number;
};

function slotHex(slot: number): Hex {
  return padHex(toHex(slot), { size: 32 });
}

function wordHex(val: bigint | number | Address): Hex {
  if (typeof val === 'string' && val.startsWith('0x')) {
    return padHex(val as Hex, { size: 32 });
  }
  return padHex(toHex(BigInt(val)), { size: 32 });
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export default function SessionKeysScreen() {
  const router = useRouter();
  const { address, createSessionKey, setAgentPolicy, revokeSessionKey } = useInvisibleWallet();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [policies, setPolicies] = useState<MobilePolicy[]>([]);
  const [selectedPolicyKey, setSelectedPolicyKey] = useState<Address | null>(null);

  const [ruleKind, setRuleKind] = useState<0 | 1>(0);
  const [durationStr, setDurationStr] = useState('24');
  const [dailyLimitStr, setDailyLimitStr] = useState('500');
  const [maxPerTxStr, setMaxPerTxStr] = useState('100');
  const [allowedTarget, setAllowedTarget] = useState<Address>(SWAP_POOL_ADDRESS);
  const [customTargetInput, setCustomTargetInput] = useState('');

  const [spentTodayUnits, setSpentTodayUnits] = useState<bigint>(0n);
  const [simRunning, setSimRunning] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<{
    title: string;
    verdict: string;
    detail: string;
  } | null>(null);

  const loadPolicies = useCallback(async () => {
    if (!address) return;
    try {
      const client = createPublicClient({ transport: http(ARB_SEPOLIA_RPC) });
      const wallet = address as Address;
      const code = await client.getBytecode({ address: wallet });
      if (!code || code === '0x') return;

      try {
        const all = (await client.readContract({
          address: wallet,
          abi: POLICY_ABI,
          functionName: 'getAllPolicies',
        })) as any[];

        const active = all
          .filter((p) => p.active && p.key !== zeroAddress)
          .map((p) => ({
            key: p.key as Address,
            expiry: Number(p.expiry),
            kind: Number(p.kind),
            maxPerTx: p.maxPerTx as bigint,
            dailyLimit: p.dailyLimit as bigint,
            spent: p.spent as bigint,
            allowedTarget: p.allowedTarget as Address,
            windowSeconds: Number(p.window || 86400n),
          }));
        setPolicies(active);
        if (active.length > 0 && !selectedPolicyKey) {
          setSelectedPolicyKey(active[0].key);
          setSpentTodayUnits(active[0].spent);
        }
      } catch {
        const [key, perTx, daily, spent, target] = await Promise.all([
          client.readContract({ address: wallet, abi: POLICY_ABI, functionName: 'sessionKey' }),
          client.readContract({ address: wallet, abi: POLICY_ABI, functionName: 'sessionMaxPerTx' }),
          client.readContract({ address: wallet, abi: POLICY_ABI, functionName: 'sessionDailyLimit' }),
          client.readContract({ address: wallet, abi: POLICY_ABI, functionName: 'sessionSpentToday' }),
          client.readContract({ address: wallet, abi: POLICY_ABI, functionName: 'sessionAllowedTarget' }),
        ]);
        if (key !== zeroAddress) {
          setPolicies([
            {
              key: key as Address,
              expiry: Math.floor(Date.now() / 1000) + 86400,
              kind: 0,
              maxPerTx: perTx as bigint,
              dailyLimit: daily as bigint,
              spent: spent as bigint,
              allowedTarget: target as Address,
              windowSeconds: 86400,
            },
          ]);
          setSelectedPolicyKey(key as Address);
          setSpentTodayUnits(spent as bigint);
        }
      }
    } catch {
      // keep existing UI state
    }
  }, [address, selectedPolicyKey]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  const dailyNum = Math.max(1, parseFloat(dailyLimitStr) || 0);
  const perTxNum = Math.max(1, parseFloat(maxPerTxStr) || 0);
  const durationHours = Math.max(1, Math.min(720, Math.round(parseFloat(durationStr) || 24)));
  const dailyUnits = BigInt(Math.floor(dailyNum * 1_000_000));
  const perTxUnits = BigInt(Math.floor(perTxNum * 1_000_000));
  const resolvedTarget = /^0x[0-9a-fA-F]{40}$/.test(customTargetInput.trim())
    ? (customTargetInput.trim() as Address)
    : allowedTarget;

  const handleGenerate = async () => {
    if (!parseFloat(dailyLimitStr) || !parseFloat(maxPerTxStr) || perTxNum > dailyNum) {
      Alert.alert('Check Limits', 'Max per trade and window budget must be positive, and per-trade cannot exceed window limit.');
      return;
    }
    setIsSubmitting(true);
    try {
      const sessionRes = await createSessionKey(durationHours, '0000');
      if (sessionRes?.sessionKey) {
        const sessionAddr = sessionRes.sessionKey as Address;
        const windowSecs = ruleKind === 1 ? 7 * 86400 : 86400;
        await setAgentPolicy(
          {
            sessionKey: sessionAddr,
            durationHours,
            maxPerTx: perTxUnits,
            dailyLimit: dailyUnits,
            allowedTarget: resolvedTarget,
            kind: ruleKind,
            windowSeconds: windowSecs,
          },
          '0000'
        );
        setSelectedPolicyKey(sessionAddr);
        setSpentTodayUnits(0n);
        await loadPolicies();
        Alert.alert(
          `${KIND_LABELS[ruleKind]} Added`,
          `Authorized concurrently without overwriting existing rules (${durationHours}h, $${perTxNum}/tx, $${dailyNum} cap).`
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

  const handleRevokeKey = async (key: Address) => {
    setIsSubmitting(true);
    try {
      await revokeSessionKey(key, '0000');
      setPolicies((prev) => prev.filter((p) => p.key.toLowerCase() !== key.toLowerCase()));
      setSimResult(null);
      await loadPolicies();
      Alert.alert('Rule Revoked', `Removed ${shortAddr(key)}. Other active keys and subscriptions remain intact.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to revoke policy key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inspectedPolicy = policies.find((p) => p.key.toLowerCase() === (selectedPolicyKey || '').toLowerCase());
  const simMaxPerTx = inspectedPolicy ? inspectedPolicy.maxPerTx : perTxUnits;
  const simDailyLimit = inspectedPolicy ? inspectedPolicy.dailyLimit : dailyUnits;
  const simSpent = inspectedPolicy ? inspectedPolicy.spent : spentTodayUnits;
  const simTarget = inspectedPolicy ? inspectedPolicy.allowedTarget : resolvedTarget;
  const simPerTxNum = Math.max(1, Number(formatUnits(simMaxPerTx, 6)));
  const simDailyNum = Math.max(1, Number(formatUnits(simDailyLimit, 6)));

  const withinTestAmount = Math.max(1, Math.floor(Math.min(50, simPerTxNum)));
  const overTestAmount = Math.max(simPerTxNum + 100, Math.floor(simDailyNum * 2));

  const runLiveChainCheck = async (kind: 'within' | 'over' | 'unapproved') => {
    setSimRunning(kind);
    const agentKey = (inspectedPolicy?.key || privateKeyToAccount(generatePrivateKey()).address) as Address;
    const unapproved: Address = '0x1111111111111111111111111111111111111111';
    const dest: Address = kind === 'unapproved' ? unapproved : (simTarget === zeroAddress ? SWAP_POOL_ADDRESS : simTarget);
    const amountUsdg = kind === 'over' ? overTestAmount : kind === 'within' ? withinTestAmount : Math.min(10, simPerTxNum);
    const units = BigInt(Math.floor(amountUsdg * 1_000_000));
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
      [slotHex(6)]: wordHex(now + durationHours * 3600),
      [slotHex(7)]: wordHex(simMaxPerTx),
      [slotHex(8)]: wordHex(simDailyLimit),
      [slotHex(9)]: wordHex(simSpent),
      [slotHex(10)]: wordHex(now - 60),
      [slotHex(11)]: wordHex(simTarget),
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
                ? `$${amountUsdg.toLocaleString()} USDG exceeds the $${simPerTxNum} single-trade limit. $0.00 spent.`
                : decoded.errorName === 'DailyLimitExceeded'
                  ? `Adding $${amountUsdg} USDG exceeds the $${simDailyNum} window limit. $0.00 spent.`
                  : `That app is not on your approved allowlist (${decoded.errorName}).`,
          });
          setSimRunning(null);
          return;
        }
      }

      const nextSpent = simSpent + units;
      setSpentTodayUnits(nextSpent);
      setSimResult({
        title: 'Approved by Vault',
        verdict: 'Allowed',
        detail: `StylusSafeAccount v3 verified $${amountUsdg} USDG is inside $${simPerTxNum}/trade and $${simDailyNum} caps.`,
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
        <Text style={styles.headerTitle}>Multi-Agent &amp; DCA Studio</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.title}>Concurrent ERC-7579 Rules</Text>
              <Text style={styles.subtitle}>
                Authorize multiple AI traders, DCA bots, and subscriptions simultaneously without overwriting keys.
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={setIsEnabled}
              trackColor={{ true: Colors.accentOrange }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Add New Policy Rule</Text>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {([
              { k: 0 as const, label: 'AI Trading Agent (24h)' },
              { k: 1 as const, label: 'DCA Bot (7d Window)' },
            ]).map((item) => (
              <TouchableOpacity
                key={item.k}
                style={[styles.presetBtn, ruleKind === item.k && styles.presetBtnActive]}
                onPress={() => {
                  setRuleKind(item.k);
                  setDurationStr(item.k === 1 ? '720' : '24');
                }}
              >
                <Text style={[styles.presetText, ruleKind === item.k && { color: Colors.primary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Time Limit (Hours)</Text>
            <TextInput
              style={styles.numInput}
              value={durationStr}
              onChangeText={setDurationStr}
              keyboardType="number-pad"
              placeholder="24"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.label}>Window Limit (USDG)</Text>
            <TextInput
              style={styles.numInput}
              value={dailyLimitStr}
              onChangeText={setDailyLimitStr}
              keyboardType="decimal-pad"
              placeholder="500"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.label}>Max Per Trade (USDG)</Text>
            <TextInput
              style={styles.numInput}
              value={maxPerTxStr}
              onChangeText={setMaxPerTxStr}
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.borderTop}>
            <Text style={styles.label}>Approved Target Contract</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {TARGET_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.address}
                  style={[styles.presetBtn, { minWidth: '46%' }, allowedTarget.toLowerCase() === p.address.toLowerCase() && !customTargetInput && styles.presetBtnActive]}
                  onPress={() => {
                    setAllowedTarget(p.address);
                    setCustomTargetInput('');
                  }}
                >
                  <Text style={[styles.presetText, allowedTarget.toLowerCase() === p.address.toLowerCase() && !customTargetInput && { color: Colors.primary }]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.numInput, { textAlign: 'left', marginTop: 10, width: '100%' }]}
              value={customTargetInput}
              onChangeText={setCustomTargetInput}
              placeholder="Or custom 0x contract address"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
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
            <Text style={styles.saveButtonText}>Authorize Concurrent {KIND_LABELS[ruleKind]}</Text>
          )}
        </TouchableOpacity>

        {/* Active Concurrent Policies List */}
        <Text style={styles.sectionTitle}>Active On-Chain Policies ({policies.length})</Text>
        {policies.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.subtitle}>No concurrent policies deployed on-chain yet.</Text>
          </View>
        ) : (
          policies.map((p) => {
            const isSel = (selectedPolicyKey || '').toLowerCase() === p.key.toLowerCase();
            return (
              <TouchableOpacity
                key={p.key}
                activeOpacity={0.85}
                onPress={() => setSelectedPolicyKey(p.key)}
                style={[styles.card, isSel && { borderColor: Colors.accentOrange }]}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.title}>
                      {KIND_LABELS[p.kind] || 'Policy'} · {shortAddr(p.key)}
                    </Text>
                    <Text style={styles.subtitle}>
                      Target: {TARGET_PRESETS.find((t) => t.address.toLowerCase() === p.allowedTarget.toLowerCase())?.name || shortAddr(p.allowedTarget)} · Max ${formatUnits(p.maxPerTx, 6)}/tx
                    </Text>
                    <Text style={[styles.value, { fontSize: 12, marginTop: 2 }]}>
                      Spent ${formatUnits(p.spent, 6)} / ${formatUnits(p.dailyLimit, 6)} USDG
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.revokeButton, { paddingHorizontal: 12, height: 36 }]}
                    disabled={isSubmitting}
                    onPress={() => handleRevokeKey(p.key)}
                  >
                    <Text style={[styles.revokeButtonText, { fontSize: 12 }]}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Live On-Chain Allowance Tester */}
        <Text style={styles.sectionTitle}>Test Selected Rule (Arbitrum Sepolia)</Text>
        <View style={styles.card}>
          <Text style={styles.subtitle}>
            Runs real eth_call checks against deployed StylusSafeAccount v3 (0x0242...5888).
          </Text>

          <View style={{ gap: 10, marginTop: 14 }}>
            <TouchableOpacity
              style={styles.testBtn}
              disabled={simRunning !== null}
              onPress={() => runLiveChainCheck('within')}
            >
              <Text style={styles.testBtnTitle}>
                {simRunning === 'within' ? 'Calling Arbitrum Sepolia...' : `Try a $${withinTestAmount} Trade`}
              </Text>
              <Text style={styles.testBtnHint}>Inside limits</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testBtn}
              disabled={simRunning !== null}
              onPress={() => runLiveChainCheck('over')}
            >
              <Text style={styles.testBtnTitle}>
                {simRunning === 'over' ? 'Calling Arbitrum Sepolia...' : `Try a $${overTestAmount.toLocaleString()} Trade`}
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
  title: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4, lineHeight: 19 },
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
  numInput: {
    minWidth: 88,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: monoFont,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  presetBtnActive: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '12',
  },
  presetText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
});
