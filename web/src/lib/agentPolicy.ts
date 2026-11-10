'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createPublicClient,
  decodeErrorResult,
  encodeFunctionData,
  http,
  padHex,
  parseAbi,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
} from 'viem';

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const DEPLOYED_ACCOUNT_IMPL: Address = '0x0242E382976489B6E5aceEB7507a449B01535888';
export const POLICY_STORAGE_KEY = 'stylussafe_local_policies';

export type PolicyKind = 0 | 1 | 2;
export const POLICY_KIND_LABELS: Record<PolicyKind, string> = {
  0: 'AI Agent',
  1: 'DCA Bot',
  2: 'Subscription',
};

const POLICY_ABI = parseAbi([
  'function sessionKey() view returns (address)',
  'function sessionExpiry() view returns (uint256)',
  'function sessionMaxPerTx() view returns (uint256)',
  'function sessionDailyLimit() view returns (uint256)',
  'function sessionSpentToday() view returns (uint256)',
  'function sessionLastReset() view returns (uint256)',
  'function sessionWindow() view returns (uint256)',
  'function sessionAllowedTarget() view returns (address)',
  'function getAllPolicies() view returns ((address key, uint48 expiry, uint8 kind, bool active, uint256 maxPerTx, uint256 dailyLimit, uint256 spent, uint256 lastReset, address allowedTarget, uint256 window)[])',
  'function getPolicy(address key) view returns ((address key, uint48 expiry, uint8 kind, bool active, uint256 maxPerTx, uint256 dailyLimit, uint256 spent, uint256 lastReset, address allowedTarget, uint256 window))',
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
  'function approve(address spender, uint256 amount) returns (bool)',
]);

const USDG_DECIMALS = 6;

// Legacy mirror slots preserved identically across StylusSafeAccount v2 & v3
const POLICY_SLOTS = {
  sessionKey: 5,
  sessionExpiry: 6,
  sessionMaxPerTx: 7,
  sessionDailyLimit: 8,
  sessionSpentToday: 9,
  sessionLastReset: 10,
  sessionAllowedTarget: 11,
  sessionWindow: 12,
} as const;

export type OnChainPolicy = {
  sessionKey: Address;
  kind: PolicyKind;
  expiry: number;
  maxPerTx: bigint;
  dailyLimit: bigint;
  spentToday: bigint;
  lastReset: number;
  windowSeconds: number;
  allowedTarget: Address;
  /** true when active on-chain/local and not expired */
  isActive: boolean;
  /** spend counter after applying rolling-window reset */
  effectiveSpentToday: bigint;
  label?: string;
};

type StoredLocalPolicy = {
  sessionKey: Address;
  kind: PolicyKind;
  expiry: number;
  maxPerTx: string;
  dailyLimit: string;
  spentToday: string;
  lastReset: number;
  windowSeconds: number;
  allowedTarget: Address;
  label?: string;
};

function getRpcUrl(): string {
  return typeof window !== 'undefined'
    ? `${window.location.origin}/api/rpc`
    : 'https://sepolia-rollup.arbitrum.io/rpc';
}

function getClient() {
  return createPublicClient({
    chain: { id: ARBITRUM_SEPOLIA_CHAIN_ID } as any,
    transport: http(getRpcUrl()),
  });
}

export function usdgToUnits(amount: number | string): bigint {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return 0n;
  return BigInt(Math.round(n * 10 ** USDG_DECIMALS));
}

export function unitsToUsdg(units: bigint): string {
  const whole = units / 10n ** BigInt(USDG_DECIMALS);
  const frac = units % 10n ** BigInt(USDG_DECIMALS);
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(USDG_DECIMALS, '0').replace(/0+$/, '')}`;
}

function hydratePolicy(raw: {
  sessionKey: Address;
  kind?: number;
  expiry: number;
  maxPerTx: bigint;
  dailyLimit: bigint;
  spent: bigint;
  lastReset: number;
  windowSeconds: number;
  allowedTarget: Address;
  active?: boolean;
  label?: string;
}): OnChainPolicy {
  const now = Math.floor(Date.now() / 1000);
  const win = raw.windowSeconds || 86400;
  const expiredWindow = now >= raw.lastReset + win;
  const effectiveSpent = expiredWindow ? 0n : raw.spent;
  const normalizedKind: PolicyKind = raw.kind === 1 ? 1 : raw.kind === 2 ? 2 : 0;
  return {
    sessionKey: raw.sessionKey,
    kind: normalizedKind,
    expiry: raw.expiry,
    maxPerTx: raw.maxPerTx,
    dailyLimit: raw.dailyLimit,
    spentToday: raw.spent,
    lastReset: raw.lastReset,
    windowSeconds: win,
    allowedTarget: raw.allowedTarget,
    isActive: (raw.active ?? true) && now < raw.expiry,
    effectiveSpentToday: effectiveSpent,
    label: raw.label,
  };
}

export function readLocalPolicies(): OnChainPolicy[] {
  if (typeof window === 'undefined') return [];
  const results: OnChainPolicy[] = [];
  const seen = new Set<string>();

  try {
    const rawMap = JSON.parse(localStorage.getItem(POLICY_STORAGE_KEY) || '{}') as Record<string, StoredLocalPolicy>;
    for (const item of Object.values(rawMap)) {
      if (!item?.sessionKey) continue;
      seen.add(item.sessionKey.toLowerCase());
      results.push(
        hydratePolicy({
          sessionKey: item.sessionKey,
          kind: item.kind ?? 0,
          expiry: Number(item.expiry),
          maxPerTx: BigInt(item.maxPerTx || '0'),
          dailyLimit: BigInt(item.dailyLimit || '0'),
          spent: BigInt(item.spentToday || '0'),
          lastReset: Number(item.lastReset || Math.floor(Date.now() / 1000)),
          windowSeconds: Number(item.windowSeconds || 86400),
          allowedTarget: item.allowedTarget || zeroAddress,
          label: item.label,
        })
      );
    }
  } catch {
    // ignore corrupt map
  }

  // Legacy single-policy local fallback
  const savedKey = localStorage.getItem('invisible_wallet_session_key');
  const savedExpiry = localStorage.getItem('invisible_wallet_session_expiry');
  const savedDaily = localStorage.getItem('invisible_wallet_session_daily_limit');
  const savedMax = localStorage.getItem('invisible_wallet_session_max_per_tx');
  const savedTarget = localStorage.getItem('invisible_wallet_session_target');
  if (savedKey && savedExpiry && savedDaily && savedMax && savedTarget && !seen.has(savedKey.toLowerCase())) {
    const now = Math.floor(Date.now() / 1000);
    results.push(
      hydratePolicy({
        sessionKey: savedKey as Address,
        kind: 0,
        expiry: Number(savedExpiry),
        maxPerTx: BigInt(savedMax),
        dailyLimit: BigInt(savedDaily),
        spent: BigInt(localStorage.getItem('invisible_wallet_session_spent_today') || '0'),
        lastReset: Number(localStorage.getItem('invisible_wallet_session_last_reset') || now - 60),
        windowSeconds: 86400,
        allowedTarget: savedTarget as Address,
      })
    );
  }

  return results;
}

export function upsertLocalPolicy(policy: {
  sessionKey: Address;
  kind: PolicyKind;
  expiry: number;
  maxPerTx: bigint;
  dailyLimit: bigint;
  spentToday?: bigint;
  lastReset?: number;
  windowSeconds: number;
  allowedTarget: Address;
  label?: string;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const rawMap = JSON.parse(localStorage.getItem(POLICY_STORAGE_KEY) || '{}') as Record<string, StoredLocalPolicy>;
    const k = policy.sessionKey.toLowerCase();
    rawMap[k] = {
      sessionKey: policy.sessionKey,
      kind: policy.kind,
      expiry: policy.expiry,
      maxPerTx: policy.maxPerTx.toString(),
      dailyLimit: policy.dailyLimit.toString(),
      spentToday: (policy.spentToday ?? 0n).toString(),
      lastReset: policy.lastReset ?? Math.floor(Date.now() / 1000),
      windowSeconds: policy.windowSeconds,
      allowedTarget: policy.allowedTarget,
      label: policy.label ?? rawMap[k]?.label,
    };
    localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(rawMap));
  } catch {
    // ignore
  }
}

export function removeLocalPolicy(sessionKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const rawMap = JSON.parse(localStorage.getItem(POLICY_STORAGE_KEY) || '{}') as Record<string, StoredLocalPolicy>;
    delete rawMap[sessionKey.toLowerCase()];
    localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(rawMap));
  } catch {
    // ignore
  }
}

/**
 * Reads all concurrent policies (AGENT, DCA, SUBSCRIPTION) from StylusSafeAccount v3 `getAllPolicies()`,
 * falling back to v2 single-key slots when reading legacy v2 wallets, and merging local metadata.
 */
export async function readAllOnChainPolicies(wallet?: Address | null): Promise<OnChainPolicy[]> {
  const local = readLocalPolicies();
  const labelMap = new Map<string, string>();
  for (const item of local) {
    if (item.label) labelMap.set(item.sessionKey.toLowerCase(), item.label);
  }

  if (wallet) {
    try {
      const client = getClient();
      const code = await client.getBytecode({ address: wallet });
      if (code && code !== '0x') {
        try {
          const all = (await client.readContract({
            address: wallet,
            abi: POLICY_ABI,
            functionName: 'getAllPolicies',
          })) as readonly {
            key: Address;
            expiry: number;
            kind: number;
            active: boolean;
            maxPerTx: bigint;
            dailyLimit: bigint;
            spent: bigint;
            lastReset: bigint;
            allowedTarget: Address;
            window: bigint;
          }[];

          return all
            .filter((p) => p.active && p.key !== zeroAddress)
            .map((p) =>
              hydratePolicy({
                sessionKey: p.key,
                kind: p.kind,
                expiry: Number(p.expiry),
                maxPerTx: p.maxPerTx,
                dailyLimit: p.dailyLimit,
                spent: p.spent,
                lastReset: Number(p.lastReset),
                windowSeconds: Number(p.window || 86400n),
                allowedTarget: p.allowedTarget,
                active: p.active,
                label: labelMap.get(p.key.toLowerCase()),
              })
            );
        } catch {
          // Legacy v2 smart account fallback
          const read = (fn: string) =>
            client.readContract({ address: wallet, abi: POLICY_ABI, functionName: fn as any });
          const [key, expiry, maxPerTx, dailyLimit, spent, lastReset, windowSecs, target] = await Promise.all([
            read('sessionKey'),
            read('sessionExpiry'),
            read('sessionMaxPerTx'),
            read('sessionDailyLimit'),
            read('sessionSpentToday'),
            read('sessionLastReset'),
            read('sessionWindow'),
            read('sessionAllowedTarget'),
          ]);
          const k = key as Address;
          if (k !== zeroAddress) {
            return [
              hydratePolicy({
                sessionKey: k,
                kind: 0,
                expiry: Number(expiry as bigint),
                maxPerTx: maxPerTx as bigint,
                dailyLimit: dailyLimit as bigint,
                spent: spent as bigint,
                lastReset: Number(lastReset as bigint),
                windowSeconds: Number((windowSecs as bigint) || 86400n),
                allowedTarget: target as Address,
                label: labelMap.get(k.toLowerCase()),
              }),
            ];
          }
          return [];
        }
      }
    } catch {
      // Fall through to counterfactual local cache
    }
  }

  return local;
}

export async function readOnChainPolicy(wallet?: Address | null): Promise<OnChainPolicy | null> {
  const all = await readAllOnChainPolicies(wallet);
  return all.find((p) => p.kind !== 2) ?? all[0] ?? null;
}

export type SimulationKind = 'within_limit' | 'over_limit' | 'unapproved_app';

export type SimulationResult = {
  verdict: 'approved' | 'blocked' | 'error';
  title: string;
  explanation: string;
  revertName?: string;
  newSpentToday?: bigint;
};

const BLOCK_COPY: Record<string, { title: string; why: (p: OnChainPolicy, amountUsdg: number) => string }> = {
  PerTxLimitExceeded: {
    title: 'Blocked by your vault (PerTxLimitExceeded)',
    why: (p, amt) =>
      `A $${amt.toLocaleString()} USDG request exceeds your $${unitsToUsdg(p.maxPerTx)} USDG single-trade limit, so the Arbitrum contract rejected it.`,
  },
  DailyLimitExceeded: {
    title: 'Blocked by your vault (DailyLimitExceeded)',
    why: (p, amt) =>
      `Adding $${amt.toLocaleString()} USDG to current $${unitsToUsdg(p.effectiveSpentToday)} USDG spent would exceed your $${unitsToUsdg(p.dailyLimit)} USDG window cap, so the contract rejected it.`,
  },
  TargetNotAllowed: {
    title: 'Blocked by your vault (TargetNotAllowed)',
    why: () => 'That destination contract is not on your approved allowlist, so the smart contract refused to run.',
  },
  SessionExpired: {
    title: 'Blocked by your vault (SessionExpired)',
    why: () => 'The AI helper allowance has expired or been turned off.',
  },
  NotAuthorized: {
    title: 'Blocked by your vault (NotAuthorized)',
    why: () => 'Only the authorized AI helper key can use this allowance.',
  },
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

/**
 * Runs a real read-only `eth_call` of `executeWithPolicy` against deployed `StylusSafeAccount` v3
 * (`0x0242E382976489B6E5aceEB7507a449B01535888`) with the selected policy's limits injected.
 */
export async function simulateAgentSpend(
  _wallet: Address | null | undefined,
  policy: OnChainPolicy,
  kind: SimulationKind,
  amountUsdg: number
): Promise<SimulationResult> {
  const unapprovedApp: Address = '0x1111111111111111111111111111111111111111';
  const dest: Address =
    kind === 'unapproved_app'
      ? unapprovedApp
      : policy.allowedTarget === zeroAddress
        ? '0xD306521Ff547Ab4523f0a77cb9EaE53873be143b'
        : policy.allowedTarget;
  const units = usdgToUnits(amountUsdg);

  const func = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [unapprovedApp, units],
  });

  const callData = encodeFunctionData({
    abi: POLICY_ABI,
    functionName: 'executeWithPolicy',
    args: [dest, 0n, func],
  });

  const stateDiff: Record<Hex, Hex> = {
    [slotHex(POLICY_SLOTS.sessionKey)]: wordHex(policy.sessionKey),
    [slotHex(POLICY_SLOTS.sessionExpiry)]: wordHex(policy.expiry),
    [slotHex(POLICY_SLOTS.sessionMaxPerTx)]: wordHex(policy.maxPerTx),
    [slotHex(POLICY_SLOTS.sessionDailyLimit)]: wordHex(policy.dailyLimit),
    [slotHex(POLICY_SLOTS.sessionSpentToday)]: wordHex(policy.effectiveSpentToday),
    [slotHex(POLICY_SLOTS.sessionLastReset)]: wordHex(policy.lastReset),
    [slotHex(POLICY_SLOTS.sessionAllowedTarget)]: wordHex(policy.allowedTarget),
    [slotHex(POLICY_SLOTS.sessionWindow)]: wordHex(policy.windowSeconds),
  };

  try {
    const resp = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_call',
        params: [
          {
            from: policy.sessionKey,
            to: DEPLOYED_ACCOUNT_IMPL,
            data: callData,
          },
          'latest',
          {
            [DEPLOYED_ACCOUNT_IMPL]: { stateDiff },
          },
        ],
      }),
    });

    const json = await resp.json();

    if (json?.error) {
      const rawData: string | undefined = json.error?.data ?? json.error?.error?.data;

      if (typeof rawData === 'string' && rawData.startsWith('0x') && rawData.length >= 10) {
        const decoded = decodeErrorResult({ abi: POLICY_ABI, data: rawData as Hex });

        if (decoded.errorName === 'CallFailed') {
          const nextSpent = policy.effectiveSpentToday + units;
          upsertLocalPolicy({
            sessionKey: policy.sessionKey,
            kind: policy.kind,
            expiry: policy.expiry,
            maxPerTx: policy.maxPerTx,
            dailyLimit: policy.dailyLimit,
            spentToday: nextSpent,
            lastReset: policy.lastReset,
            windowSeconds: policy.windowSeconds,
            allowedTarget: policy.allowedTarget,
            label: policy.label,
          });
          return {
            verdict: 'approved',
            title: 'Approved by your vault',
            explanation: `The deployed Arbitrum Sepolia contract verified that $${amountUsdg.toLocaleString()} USDG is inside your $${unitsToUsdg(policy.maxPerTx)} per-trade cap and $${unitsToUsdg(policy.dailyLimit)} window limit. Window spend is now $${unitsToUsdg(nextSpent)} / $${unitsToUsdg(policy.dailyLimit)} USDG.`,
            newSpentToday: nextSpent,
          };
        }

        const copy = BLOCK_COPY[decoded.errorName];
        if (copy) {
          return {
            verdict: 'blocked',
            title: copy.title,
            explanation: `${copy.why(policy, amountUsdg)} $0.00 was spent.`,
            revertName: decoded.errorName,
          };
        }

        return {
          verdict: 'blocked',
          title: `Blocked by your vault (${decoded.errorName})`,
          explanation: `The contract rejected this request with ${decoded.errorName}.`,
          revertName: decoded.errorName,
        };
      }

      return {
        verdict: 'error',
        title: 'RPC error during check',
        explanation: String(json.error?.message || 'Unknown RPC error').slice(0, 140),
      };
    }

    const nextSpent = policy.effectiveSpentToday + units;
    return {
      verdict: 'approved',
      title: 'Approved by your vault',
      explanation: `The deployed Arbitrum Sepolia contract verified that $${amountUsdg.toLocaleString()} USDG is inside your $${unitsToUsdg(policy.maxPerTx)} per-trade cap and $${unitsToUsdg(policy.dailyLimit)} window limit.`,
      newSpentToday: nextSpent,
    };
  } catch (err: any) {
    return {
      verdict: 'error',
      title: 'Could not reach Arbitrum Sepolia',
      explanation: `Network check failed (${String(err?.shortMessage || err?.message || 'unknown error').slice(0, 120)}).`,
    };
  }
}

export function useOnChainAgentPolicies(wallet: string | null | undefined) {
  const [policies, setPolicies] = useState<OnChainPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await readAllOnChainPolicies(wallet ? (wallet as Address) : null);
      setPolicies(list);
      setCheckedAt(Date.now());
      return list;
    } catch (e: any) {
      setError(String(e?.shortMessage || e?.message || 'Could not read the network').slice(0, 160));
      return [];
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const agentPolicies = policies.filter((p) => p.kind !== 2);
  const subscriptionPolicies = policies.filter((p) => p.kind === 2);
  const primaryPolicy = agentPolicies[0] ?? policies[0] ?? null;

  return {
    policies,
    agentPolicies,
    subscriptionPolicies,
    primaryPolicy,
    loading,
    error,
    checkedAt,
    refresh,
  };
}

export function useOnChainAgentPolicy(wallet: string | null | undefined) {
  const { primaryPolicy, loading, error, checkedAt, refresh: refreshAll } = useOnChainAgentPolicies(wallet);
  const refresh = useCallback(async () => {
    const list = await refreshAll();
    return list.find((p) => p.kind !== 2) ?? list[0] ?? null;
  }, [refreshAll]);
  return { policy: primaryPolicy, loading, error, checkedAt, refresh };
}
