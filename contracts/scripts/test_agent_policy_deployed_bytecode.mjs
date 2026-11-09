/**
 * test_agent_policy_deployed_bytecode.mjs
 *
 * Keyless, fundless verification of the AI-agent spending policy using the REAL
 * deployed StylusSafeAccount implementation bytecode on Arbitrum Sepolia.
 *
 * How it works:
 *   - Fetches the runtime bytecode of the deployed implementation (deployed_addresses.json).
 *   - Runs `eth_call` against a throwaway address with a *state override* that places that
 *     bytecode there and writes the session-policy storage slots (5..12).
 *   - Nothing is signed, nothing is broadcast, no gas or ETH is spent.
 *
 * This exercises the exact on-chain policy logic (`executeWithPolicy` -> `_enforcePolicy`)
 * for: per-tx cap, daily cap, target allowlist, self-target block, expiry, revocation,
 * caller check, and rolling-window reset.
 *
 * Usage:  node scripts/test_agent_policy_deployed_bytecode.mjs
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const deployed = JSON.parse(readFileSync(resolve(__dirname, '..', 'deployed_addresses.json'), 'utf8'));
const abi = JSON.parse(readFileSync(resolve(__dirname, '..', 'StylusSafeAccount.json'), 'utf8'));
const iface = new ethers.Interface(abi.abi ?? abi);

const RPC = process.env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc';
const provider = new ethers.JsonRpcProvider(RPC, 421614, { staticNetwork: ethers.Network.from(421614) });

// Storage layout of StylusSafeAccount (see contracts/StylusSafeAccount.sol)
const SLOT = {
  sessionKey: 5,
  sessionExpiry: 6,
  sessionMaxPerTx: 7,
  sessionDailyLimit: 8,
  sessionSpentToday: 9,
  sessionLastReset: 10,
  sessionAllowedTarget: 11,
  sessionWindow: 12,
};

const WALLET = '0x00000000000000000000000000000000DeaDBeef'; // throwaway simulation address
const AGENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const OTHER = '0x1111111111111111111111111111111111111111';
const APPROVED = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // e.g. Uniswap V3 router (just an address here)
const USDG = (n) => BigInt(Math.round(n * 1e6));

const pad = (hexOrBig) => ethers.zeroPadValue(ethers.toBeHex(hexOrBig), 32);
const slotKey = (n) => pad(n);

function erc20TransferData(to, amount) {
  return new ethers.Interface(['function transfer(address,uint256)']).encodeFunctionData('transfer', [to, amount]);
}

function buildPolicy(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    sessionKey: AGENT,
    sessionExpiry: now + 3600,
    sessionMaxPerTx: USDG(100),
    sessionDailyLimit: USDG(500),
    sessionSpentToday: 0n,
    sessionLastReset: now - 60,
    sessionAllowedTarget: APPROVED,
    sessionWindow: 86400n,
    ...overrides,
  };
}

async function simulate(code, policy, { from = AGENT, dest, value = 0n, data = '0x' }) {
  const stateDiff = {};
  for (const [name, slot] of Object.entries(SLOT)) {
    const v = policy[name];
    stateDiff[slotKey(slot)] = pad(typeof v === 'string' ? BigInt(v) : v);
  }
  const callData = iface.encodeFunctionData('executeWithPolicy', [dest, value, data]);
  try {
    await provider.send('eth_call', [
      { from, to: WALLET, data: callData },
      'latest',
      { [WALLET]: { code, stateDiff } },
    ]);
    return { ok: true, error: null };
  } catch (e) {
    const raw = e?.data ?? e?.info?.error?.data ?? e?.error?.data;
    if (typeof raw === 'string' && raw.startsWith('0x') && raw.length >= 10) {
      try {
        const parsed = iface.parseError(raw);
        return { ok: false, error: parsed?.name ?? raw.slice(0, 10) };
      } catch {
        return { ok: false, error: raw.slice(0, 10) };
      }
    }
    return { ok: false, error: `RPC:${(e?.shortMessage ?? e?.message ?? '').slice(0, 140)}` };
  }
}

const results = [];
function check(name, got, expectedError) {
  const pass = expectedError === null ? got.ok : got.error === expectedError;
  results.push(pass);
  const want = expectedError === null ? 'SUCCEEDS' : `REVERTS ${expectedError}`;
  const have = got.ok ? 'succeeded' : `reverted ${got.error}`;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      expected: ${want} | actual: ${have}`);
}

async function main() {
  console.log('Agent policy test against DEPLOYED bytecode (no keys, no gas, no txs)');
  console.log('Implementation :', deployed.implementation);
  console.log('RPC            :', RPC.replace(/\/v2\/.*/, '/v2/***'));

  const code = await provider.getCode(deployed.implementation);
  if (!code || code === '0x') throw new Error('No bytecode at implementation address');
  console.log(`Bytecode       : ${(code.length - 2) / 2} bytes\n`);

  // 1. Valid: $50 USDG-sized transfer to approved target, inside caps
  check(
    '1. $50 spend to approved app, inside $100/tx and $500/day',
    await simulate(code, buildPolicy(), { dest: APPROVED, data: erc20TransferData(OTHER, USDG(50)) }),
    null
  );

  // 2. Per-tx cap
  check(
    '2. $150 spend exceeds $100 per-trade cap',
    await simulate(code, buildPolicy(), { dest: APPROVED, data: erc20TransferData(OTHER, USDG(150)) }),
    'PerTxLimitExceeded'
  );

  // 3. Rogue $5,000
  check(
    '3. $5,000 rogue spend is blocked',
    await simulate(code, buildPolicy(), { dest: APPROVED, data: erc20TransferData(OTHER, USDG(5000)) }),
    'PerTxLimitExceeded'
  );

  // 4. Unapproved target
  check(
    '4. Spend to an app that is NOT on the allowlist',
    await simulate(code, buildPolicy(), { dest: OTHER, data: erc20TransferData(OTHER, USDG(10)) }),
    'TargetNotAllowed'
  );

  // 5. Self-target (agent tries to call the wallet itself, e.g. to change its own policy)
  check(
    '5. Agent targets the wallet itself (takeover attempt)',
    await simulate(code, buildPolicy({ sessionAllowedTarget: ethers.ZeroAddress }), { dest: WALLET, data: '0x' }),
    'TargetNotAllowed'
  );

  // 6. Cumulative daily cap: $480 already spent today, +$50 -> $530 > $500
  check(
    '6. $480 already spent today + $50 = $530 exceeds $500/day',
    await simulate(code, buildPolicy({ sessionSpentToday: USDG(480) }), { dest: APPROVED, data: erc20TransferData(OTHER, USDG(50)) }),
    'DailyLimitExceeded'
  );

  // 7. Exactly at the cap is allowed: $450 spent + $50 = $500
  check(
    '7. $450 spent + $50 = exactly $500/day is still allowed',
    await simulate(code, buildPolicy({ sessionSpentToday: USDG(450) }), { dest: APPROVED, data: erc20TransferData(OTHER, USDG(50)) }),
    null
  );

  // 8. Expired
  check(
    '8. Allowance expired 1 hour ago',
    await simulate(code, buildPolicy({ sessionExpiry: Math.floor(Date.now() / 1000) - 3600 }), {
      dest: APPROVED,
      data: erc20TransferData(OTHER, USDG(10)),
    }),
    'SessionExpired'
  );

  // 9. Revoked (session key zeroed)
  check(
    '9. AI key revoked (session key = 0x0)',
    await simulate(code, buildPolicy({ sessionKey: ethers.ZeroAddress }), { dest: APPROVED, data: erc20TransferData(OTHER, USDG(10)) }),
    'NotAuthorized'
  );

  // 10. Wrong caller
  check(
    '10. Someone other than the AI key tries to use the allowance',
    await simulate(code, buildPolicy(), { from: OTHER, dest: APPROVED, data: erc20TransferData(OTHER, USDG(10)) }),
    'NotAuthorized'
  );

  // 11. Window rollover: last reset 2 days ago, spent counter stale at $499 -> resets, $50 allowed
  check(
    '11. New day: stale $499 counter resets, $50 spend allowed',
    await simulate(
      code,
      buildPolicy({ sessionSpentToday: USDG(499), sessionLastReset: Math.floor(Date.now() / 1000) - 2 * 86400 }),
      { dest: APPROVED, data: erc20TransferData(OTHER, USDG(50)) }
    ),
    null
  );

  // 12. approve() is counted as spend too (cannot bypass cap with approve)
  const approveData = new ethers.Interface(['function approve(address,uint256)']).encodeFunctionData('approve', [OTHER, USDG(5000)]);
  check(
    '12. approve() of $5,000 is counted as spend and blocked',
    await simulate(code, buildPolicy(), { dest: APPROVED, data: approveData }),
    'PerTxLimitExceeded'
  );

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} policy checks passed against the deployed bytecode`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error('Test harness error:', e?.shortMessage ?? e?.message ?? e);
  process.exit(2);
});

