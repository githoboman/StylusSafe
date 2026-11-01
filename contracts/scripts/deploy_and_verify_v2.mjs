/**
 * deploy_and_verify_v2.mjs
 *
 * Deploys StylusSafeAccount v2 + StylusSafeFactory on Arbitrum Sepolia and verifies them END-TO-END
 * through the canonical ERC-4337 v0.6 EntryPoint (real handleOps, real RIP-7212 P-256 verification).
 *
 * Addresses are written to deployed_addresses.json ONLY if every check passes.
 *
 * Positive:
 *   P1  Implementation is locked (initialize reverts)
 *   P2  RIP-7212 precompile is live on this chain
 *   P3  Passkey UserOp with initCode deploys the wallet and executes an ETH transfer
 *   P4  Passkey UserOp sets an agent policy
 *   P5  Session-key UserOp (executeAsAgent) within policy succeeds
 *   P6  Passkey UserOp revokes the session key
 * Negative (must be rejected by validateUserOp → AA24):
 *   N1  Challenge != userOpHash (replayed assertion)
 *   N2  Wrong origin
 *   N3  UV flag missing
 *   N4  Session key signs setAgentPolicy (privilege escalation)
 *   N5  Session key signs execute (bypass policy)
 *   N6  Session key after revocation
 *   N7  Re-submitting an already-used UserOp (AA25 nonce)
 *   N8  executeWithPolicy targeting the wallet itself (TargetNotAllowed)
 *   N9  Session-key UserOp over the per-tx cap → executes with success=false
 */

import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, generateKeyPairSync, sign as nodeSign } from 'crypto';
import { loadLocalSecrets, getRequiredSecret } from './env_loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadLocalSecrets();

const RPC_URL = process.env.ALCHEMY_API_KEY
  ? `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc');
const PRIV_KEY = getRequiredSecret('DEPLOYER_PRIVATE_KEY', ['PRIVATE_KEY', 'STYLUS_DEPLOYER_PRIVATE_KEY']);

const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const RP_ID = 'stylussafe.xyz';
const ORIGIN = 'https://stylussafe.xyz';

const read = (f) => readFileSync(resolve(__dirname, '..', f), 'utf8');
const accountAbi = JSON.parse(read('StylusSafeAccount.json'));
const accountBin = '0x' + read('StylusSafeAccount.bin').trim();
const factoryAbi = JSON.parse(read('StylusSafeFactory.json'));
const factoryBin = '0x' + read('StylusSafeFactory.bin').trim();

const USEROP_TUPLE =
  'tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature)';
const entryPointAbi = [
  `function handleOps(${USEROP_TUPLE}[] ops, address beneficiary)`,
  `function getUserOpHash(${USEROP_TUPLE} userOp) view returns (bytes32)`,
  'function getNonce(address sender, uint192 key) view returns (uint256)',
  'error FailedOp(uint256 opIndex, string reason)',
  'event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)',
];

const sha256 = (buf) => createHash('sha256').update(buf).digest();
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const coder = ethers.AbiCoder.defaultAbiCoder();

let passed = 0;
const ok = (msg) => { passed++; console.log(`   ✅ ${msg}`); };
const fail = (msg) => { throw new Error(`❌ ${msg}`); };

// ── P-256 passkey simulator (equivalent to what a platform authenticator produces) ──
const { privateKey: p256Priv, publicKey: p256Pub } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = p256Pub.export({ format: 'jwk' });
const PUBKEY = '0x04' + Buffer.from(jwk.x, 'base64url').toString('hex') + Buffer.from(jwk.y, 'base64url').toString('hex');
let authCounter = 0;

function webauthnSign(userOpHash, { origin = ORIGIN, flags = 0x05, challengeOverride } = {}) {
  authCounter++;
  const authData = Buffer.concat([
    sha256(Buffer.from(RP_ID)),
    Buffer.from([flags]),
    Buffer.from([(authCounter >>> 24) & 255, (authCounter >>> 16) & 255, (authCounter >>> 8) & 255, authCounter & 255]),
  ]);
  const challenge = challengeOverride ?? b64url(ethers.getBytes(userOpHash));
  const clientDataJSON = Buffer.from(
    JSON.stringify({ type: 'webauthn.get', challenge, origin, crossOrigin: false })
  );
  // crypto.sign hashes once: sig over sha256(authData || sha256(clientDataJSON))
  const sig = nodeSign('sha256', Buffer.concat([authData, sha256(clientDataJSON)]), {
    key: p256Priv,
    dsaEncoding: 'ieee-p1363',
  });
  return coder.encode(
    ['bytes', 'bytes', 'bytes32', 'bytes32'],
    [authData, clientDataJSON, sig.subarray(0, 32), sig.subarray(32, 64)]
  );
}

function sessionSign(agent, userOpHash) {
  const s = agent.signingKey.sign(userOpHash);
  return ethers.concat(['0x01', s.r, s.s, ethers.toBeHex(s.v, 1)]);
}

async function main() {
  console.log('🚀 StylusSafe v2 — deploy + end-to-end ERC-4337 verification (Arbitrum Sepolia)');
  console.log('══════════════════════════════════════════════════════════════════════════════');
  const provider = new ethers.JsonRpcProvider(RPC_URL, 421614, { staticNetwork: ethers.Network.from(421614) });
  const deployer = new ethers.Wallet(PRIV_KEY, provider);
  const ep = new ethers.Contract(ENTRY_POINT, entryPointAbi, deployer);
  console.log(`Deployer: ${deployer.address}  balance ${ethers.formatEther(await provider.getBalance(deployer.address))} ETH`);

  // ── P2: precompile live? (sanity vector signed locally) ──
  {
    const msg = Buffer.from('rip7212-probe');
    const sig = nodeSign('sha256', msg, { key: p256Priv, dsaEncoding: 'ieee-p1363' });
    const input = ethers.concat([sha256(msg), sig.subarray(0, 32), sig.subarray(32), '0x' + PUBKEY.slice(4)]);
    const out = await provider.call({ to: '0x0000000000000000000000000000000000000100', data: input });
    if (BigInt(out || '0x0') !== 1n) fail('RIP-7212 precompile not available on this chain');
    ok('P2 RIP-7212 P-256 precompile is live at 0x100');
  }

  // ── Deploy ──
  console.log('\n📦 Deploying implementation + factory...');
  const impl = await new ethers.ContractFactory(accountAbi, accountBin, deployer).deploy({ gasLimit: 6_000_000 });
  await impl.waitForDeployment();
  const implAddress = await impl.getAddress();
  const implTx = impl.deploymentTransaction().hash;
  console.log(`   Implementation: ${implAddress}  (tx ${implTx})`);
  const factory = await new ethers.ContractFactory(factoryAbi, factoryBin, deployer).deploy(implAddress, { gasLimit: 3_000_000 });
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  const factoryTx = factory.deploymentTransaction().hash;
  console.log(`   Factory:        ${factoryAddress}  (tx ${factoryTx})`);

  // ── P1: implementation locked ──
  try {
    await impl.initialize.staticCall(deployer.address, PUBKEY, RP_ID, ORIGIN);
    fail('P1 implementation could be initialized');
  } catch (e) {
    if (String(e.message).startsWith('❌')) throw e;
    ok('P1 implementation is locked (initialize reverts)');
  }

  // ── Counterfactual wallet ──
  const walletAddress = await factory['getAddress(bytes,address,string,string)'](PUBKEY, ENTRY_POINT, RP_ID, ORIGIN);
  const wallet = new ethers.Contract(walletAddress, accountAbi, provider);
  console.log(`\n👛 Counterfactual wallet: ${walletAddress}`);
  await (await deployer.sendTransaction({ to: walletAddress, value: ethers.parseEther('0.0015') })).wait();
  console.log('   Prefunded 0.0015 ETH');

  const feeData = await provider.getFeeData();
  const maxFee = (feeData.gasPrice ?? 100_000_000n) * 2n;

  const iface = new ethers.Interface(accountAbi);
  const recipient = ethers.Wallet.createRandom().address;

  async function buildOp(callData, { initCode = '0x', vgl = 600_000n, cgl = 300_000n } = {}) {
    return {
      sender: walletAddress,
      nonce: await ep.getNonce(walletAddress, 0),
      initCode,
      callData,
      callGasLimit: cgl,
      verificationGasLimit: vgl,
      preVerificationGas: 60_000n,
      maxFeePerGas: maxFee,
      maxPriorityFeePerGas: maxFee,
      paymasterAndData: '0x',
      signature: '0x',
    };
  }

  async function expectFailedOp(op, codePrefix, label) {
    try {
      await ep.handleOps.staticCall([op], deployer.address, { gasLimit: 5_000_000 });
    } catch (e) {
      const decoded = e?.revert ?? (e?.data ? ep.interface.parseError(e.data) : null);
      const reason = decoded?.args?.[1] ?? e.shortMessage ?? e.message;
      if (String(reason).startsWith(codePrefix)) return ok(`${label} → rejected (${reason})`);
      fail(`${label} rejected with unexpected reason: ${reason}`);
    }
    fail(`${label} was NOT rejected`);
  }

  async function sendOp(op, label) {
    const tx = await ep.handleOps([op], deployer.address, { gasLimit: 5_000_000 });
    const rc = await tx.wait();
    const ev = rc.logs.map((l) => { try { return ep.interface.parseLog(l); } catch { return null; } })
      .find((p) => p?.name === 'UserOperationEvent');
    if (!ev) fail(`${label}: no UserOperationEvent`);
    return { tx: tx.hash, success: ev.args.success };
  }

  const initCode = ethers.concat([
    factoryAddress,
    factory.interface.encodeFunctionData('createWallet', [PUBKEY, ENTRY_POINT, RP_ID, ORIGIN]),
  ]);

  // ── Negative passkey tests on the deploying op ──
  console.log('\n🧪 Passkey (owner) path');
  const transferCall = iface.encodeFunctionData('execute', [recipient, ethers.parseEther('0.0001'), '0x']);
  let op = await buildOp(transferCall, { initCode, vgl: 1_500_000n });
  let hash = await ep.getUserOpHash(op);

  await expectFailedOp({ ...op, signature: webauthnSign(hash, { challengeOverride: b64url(ethers.randomBytes(32)) }) }, 'AA24', 'N1 challenge != userOpHash (replay)');
  await expectFailedOp({ ...op, signature: webauthnSign(hash, { origin: 'https://evil.example' }) }, 'AA24', 'N2 wrong origin');
  await expectFailedOp({ ...op, signature: webauthnSign(hash, { flags: 0x01 }) }, 'AA24', 'N3 UV flag missing');

  op.signature = webauthnSign(hash);
  let res = await sendOp(op, 'P3');
  const recBal = await provider.getBalance(recipient);
  if (!res.success || recBal !== ethers.parseEther('0.0001')) fail('P3 deploy+transfer did not execute');
  if ((await provider.getCode(walletAddress)).length <= 2) fail('P3 wallet not deployed');
  if ((await wallet.entryPoint()).toLowerCase() !== ENTRY_POINT.toLowerCase()) fail('P3 entryPoint mismatch');
  ok(`P3 passkey UserOp deployed wallet + sent 0.0001 ETH (tx ${res.tx})`);

  await expectFailedOp(op, 'AA', 'N7 re-submitting used UserOp');

  // ── Agent policy ──
  console.log('\n🛡️  Agent policy path');
  const agent = ethers.Wallet.createRandom();
  const target = ethers.Wallet.createRandom().address;
  const now = (await provider.getBlock('latest')).timestamp;
  const policyCall = iface.encodeFunctionData('setAgentPolicy', [
    agent.address, now + 3600, ethers.parseEther('0.0002'), ethers.parseEther('0.0005'), target,
  ]);
  op = await buildOp(policyCall);
  hash = await ep.getUserOpHash(op);
  op.signature = webauthnSign(hash);
  res = await sendOp(op, 'P4');
  if (!res.success || (await wallet.sessionKey()).toLowerCase() !== agent.address.toLowerCase()) fail('P4 policy not set');
  ok(`P4 passkey UserOp set agent policy (tx ${res.tx})`);

  // N4: agent tries to rewrite its own policy
  op = await buildOp(iface.encodeFunctionData('setAgentPolicy', [agent.address, now + 999999, 0, 0, ethers.ZeroAddress]));
  op.signature = sessionSign(agent, await ep.getUserOpHash(op));
  await expectFailedOp(op, 'AA24', 'N4 session key signing setAgentPolicy');

  // N5: agent tries plain execute
  op = await buildOp(iface.encodeFunctionData('execute', [agent.address, ethers.parseEther('0.0001'), '0x']));
  op.signature = sessionSign(agent, await ep.getUserOpHash(op));
  await expectFailedOp(op, 'AA24', 'N5 session key signing execute');

  // P5: within policy
  op = await buildOp(iface.encodeFunctionData('executeAsAgent', [target, ethers.parseEther('0.0001'), '0x']));
  op.signature = sessionSign(agent, await ep.getUserOpHash(op));
  res = await sendOp(op, 'P5');
  if (!res.success || (await provider.getBalance(target)) !== ethers.parseEther('0.0001')) fail('P5 agent transfer failed');
  ok(`P5 session-key UserOp executeAsAgent within policy succeeded (tx ${res.tx})`);

  // N9: over per-tx cap → validation passes, execution reverts (success=false), nothing moves
  op = await buildOp(iface.encodeFunctionData('executeAsAgent', [target, ethers.parseEther('0.0003'), '0x']));
  op.signature = sessionSign(agent, await ep.getUserOpHash(op));
  res = await sendOp(op, 'N9');
  if (res.success || (await provider.getBalance(target)) !== ethers.parseEther('0.0001')) fail('N9 over-cap spend was not blocked');
  ok(`N9 over-cap agent spend reverted in execution, funds unchanged (tx ${res.tx})`);

  // N8: direct path to the wallet itself
  try {
    await wallet.connect(provider).executeWithPolicy.staticCall(walletAddress, 0, '0x', { from: agent.address });
    fail('N8 executeWithPolicy to self was allowed');
  } catch (e) {
    if (String(e.message).startsWith('❌')) throw e;
    ok('N8 executeWithPolicy targeting the wallet itself reverts');
  }

  // P6: revoke
  op = await buildOp(iface.encodeFunctionData('revokeSessionKey', []));
  op.signature = webauthnSign(await ep.getUserOpHash(op));
  res = await sendOp(op, 'P6');
  if (!res.success || (await wallet.sessionKey()) !== ethers.ZeroAddress) fail('P6 revoke failed');
  ok(`P6 passkey UserOp revoked session key (tx ${res.tx})`);

  op = await buildOp(iface.encodeFunctionData('executeAsAgent', [target, 1n, '0x']));
  op.signature = sessionSign(agent, await ep.getUserOpHash(op));
  await expectFailedOp(op, 'AA24', 'N6 revoked session key');

  console.log(`\n🎉 ALL ${passed} CHECKS PASSED`);

  const prev = JSON.parse(read('deployed_addresses.json'));
  const out = {
    ...prev,
    version: 'v2',
    implementation: implAddress,
    factory: factoryAddress,
    sampleWallet: walletAddress,
    entryPoint: ENTRY_POINT,
    deployTxs: { implementation: implTx, factory: factoryTx },
    previous: { implementation: prev.implementation, factory: prev.factory },
    verifiedChecks: passed,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(resolve(__dirname, '..', 'deployed_addresses.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error('\n', err.message || err);
  process.exit(1);
});

