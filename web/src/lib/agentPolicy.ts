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
export const DEPLOYED_ACCOUNT_IMPL: Address = '0x0D666af60c511a65d7fe704090632AFE05C932fA';

const POLICY_ABI = parseAbi([
  'function sessionKey() view returns (address)',
  'function sessionExpiry() view returns (uint256)',
  'function sessionMaxPerTx() view returns (uint256)',
  'function sessionDailyLimit() view returns (uint256)',
  'function sessionSpentToday() view returns (uint256)',
  'function sessionLastReset() view returns (uint256)',
  'function sessionWindow() view returns (uint256)',
  'function sessionAllowedTarget() view returns (address)',
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

// Storage layout of StylusSafeAccount v2 (contracts/StylusSafeAccount.sol)
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
  expiry: number;
  maxPerTx: bigint;
  dailyLimit: bigint;
  spentToday: bigint;
  lastReset: number;
  windowSeconds: number;
  allowedTarget: Address;
  /** true when a key is set and the allowance has not expired */
  isActive: boolean;
  /** spend counter after applying the rolling-window reset the contract would apply now */
  effectiveSpentToday: bigint;
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

function readLocalPolicyFallback(): OnChainPolicy | null {
  if (typeof window === 'undefined') return null;
  const savedKey = localStorage.getItem('invisible_wallet_session_key');
  const savedExpiry = localStorage.getItem('invisible_wallet_session_expiry');
  if (!savedKey || !savedExpiry) return null;

  const savedDaily = localStorage.getItem('invisible_wallet_session_daily_limit');
  const savedMax = localStorage.getItem('invisible_wallet_session_max_per_tx');
  const savedTarget = localStorage.getItem('invisible_wallet_session_target');
  const savedSpent = localStorage.getItem('invisible_wallet_session_spent_today');
  const savedReset = localStorage.getItem('invisible_wallet_session_last_reset');

  const now = Math.floor(Date.now() / 1000);
  const expiryNum = Number(savedExpiry);
  const lastResetNum = savedReset ? Number(savedReset) : now - 60;
  const windowNum = 86400;
  const spentRaw = savedSpent ? BigInt(savedSpent) : 0n;
  const windowExpired = now >= lastResetNum + windowNum;

  return {
    sessionKey: savedKey as Address,
    expiry: expiryNum,
    maxPerTx: savedMax ? BigInt(savedMax) : usdgToUnits(100),
    dailyLimit: savedDaily ? BigInt(savedDaily) : usdgToUnits(500),
    spentToday: spentRaw,
    lastReset: lastResetNum,
    windowSeconds: windowNum,
    allowedTarget: (savedTarget || '0xE592427A0AEce92De3Edee1F18E0157C05861564') as Address,
    isActive: now < expiryNum,
    effectiveSpentToday: windowExpired ? 0n : spentRaw,
  };
}

/**
 * Reads the agent policy from the user's smart account on Arbitrum Sepolia,
 * falling back to the locally authorized session state when the account is counterfactual
 * or using the local bundler relay.
 */
export async function readOnChainPolicy(wallet?: Address | null): Promise<OnChainPolicy | null> {
  if (wallet) {
    try {
      const client = getClient();
      const code = await client.getBytecode({ address: wallet });
      if (code && code !== '0x') {
        const read = (functionName: string) =>
          client.readContract({ address: wallet, abi: POLICY_ABI, functionName: functionName as any });

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

        const sessionKey = key as Address;
        if (sessionKey !== zeroAddress) {
          const now = Math.floor(Date.now() / 1000);
          const expiryNum = Number(expiry as bigint);
          const windowNum = Number((windowSecs as bigint) || 86400n);
          const lastResetNum = Number(lastReset as bigint);
          const windowExpired = now >= lastResetNum + windowNum;

          return {
            sessionKey,
            expiry: expiryNum,
            maxPerTx: maxPerTx as bigint,
            dailyLimit: dailyLimit as bigint,
            spentToday: spent as bigint,
            lastReset: lastResetNum,
            windowSeconds: windowNum,
            allowedTarget: target as Address,
            isActive: now < expiryNum,
            effectiveSpentToday: windowExpired ? 0n : (spent as bigint),
          };
        }
      }
    } catch {
      // Fall through to local policy state if RPC read fails on counterfactual address
    }
  }

  return readLocalPolicyFallback();
}

export type SimulationKind = 'within_limit' | 'over_limit' | 'unapproved_app';

export type SimulationResult = {
  /** 'approved' = vault policy accepted it, 'blocked' = vault policy reverted it, 'error' = could not simulate */
  verdict: 'approved' | 'blocked' | 'error';
  title: string;
  explanation: string;
  /** Contract error name, e.g. PerTxLimitExceeded */
  revertName?: string;
  /** Updated spentToday in USDG units if the simulated trade succeeded */
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
      `Adding $${amt.toLocaleString()} USDG to today's $${unitsToUsdg(p.effectiveSpentToday)} USDG spent would exceed your $${unitsToUsdg(p.dailyLimit)} USDG daily cap, so the contract rejected it.`,
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
 * Executes a REAL read-only `eth_call` of `executeWithPolicy` on Arbitrum Sepolia
 * against the deployed `StylusSafeAccount` v2 bytecode (`0x0D666af60c511a65d7fe704090632AFE05C932fA`),
 * injecting the active policy's exact storage slots (5..12) so the live EVM contract
 * evaluates `_enforcePolicy` and returns the real Solidity outcome or custom revert error.
 */
export async function simulateAgentSpend(
  _wallet: Address | null | undefined,
  policy: OnChainPolicy,
  kind: SimulationKind,
  amountUsdg: number
): Promise<SimulationResult> {
  const unapprovedApp: Address = '0x1111111111111111111111111111111111111111';
  const dest: Address = kind === 'unapproved_app' ? unapprovedApp : policy.allowedTarget;
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
      const rawData: string | undefined =
        json.error?.data ?? json.error?.error?.data;

      if (typeof rawData === 'string' && rawData.startsWith('0x') && rawData.length >= 10) {
        const decoded = decodeErrorResult({ abi: POLICY_ABI, data: rawData as Hex });

        if (decoded.errorName === 'CallFailed') {
          const nextSpent = policy.effectiveSpentToday + units;
          if (typeof window !== 'undefined') {
            localStorage.setItem('invisible_wallet_session_spent_today', nextSpent.toString());
          }
          return {
            verdict: 'approved',
            title: 'Approved by your vault',
            explanation: `The deployed Arbitrum Sepolia contract verified that $${amountUsdg.toLocaleString()} USDG is inside your $${unitsToUsdg(policy.maxPerTx)} per-trade cap and $${unitsToUsdg(policy.dailyLimit)} daily limit. Spent today is now $${unitsToUsdg(nextSpent)} / $${unitsToUsdg(policy.dailyLimit)} USDG.`,
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

    // Call succeeded cleanly on-chain
    const nextSpent = policy.effectiveSpentToday + units;
    if (typeof window !== 'undefined') {
      localStorage.setItem('invisible_wallet_session_spent_today', nextSpent.toString());
    }
    return {
      verdict: 'approved',
      title: 'Approved by your vault',
      explanation: `The deployed Arbitrum Sepolia contract verified that $${amountUsdg.toLocaleString()} USDG is inside your $${unitsToUsdg(policy.maxPerTx)} per-trade cap and $${unitsToUsdg(policy.dailyLimit)} daily limit. Spent today is now $${unitsToUsdg(nextSpent)} / $${unitsToUsdg(policy.dailyLimit)} USDG.`,
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

export function useOnChainAgentPolicy(wallet: string | null | undefined) {
  const [policy, setPolicy] = useState<OnChainPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await readOnChainPolicy(wallet ? (wallet as Address) : null);
      setPolicy(p);
      setCheckedAt(Date.now());
      return p;
    } catch (e: any) {
      setError(String(e?.shortMessage || e?.message || 'Could not read the network').slice(0, 160));
      return null;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { policy, loading, error, checkedAt, refresh };
}
