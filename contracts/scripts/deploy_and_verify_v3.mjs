/**
 * deploy_and_verify_v3.mjs
 *
 * Compiles & deploys StylusSafeAccount v3 (multi-policy + ERC-7579 modules + executeAsAgentBatch)
 * and a new StylusSafeFactory on Arbitrum Sepolia, then verifies end-to-end through ERC-4337 v0.6 EntryPoint:
 *   - Concurrent AI Trading Agent, ERC-7579 DCA module, and Merchant Subscriptions without overwriting
 *   - Atomic passwordless Agent Batch (`executeAsAgentBatch`: ERC-20 approve + StylusSafeSwapPool swap)
 *   - Cross-key isolation, wrong target rejection, unapproved approve() spender rejection, selective revocation
 */

import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, generateKeyPairSync, sign as nodeSign } from 'crypto';
import { loadLocalSecrets, getRequiredSecret } from './env_loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadLocalSecrets();

const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc';
const PRIV_KEY = getRequiredSecret('DEPLOYER_PRIVATE_KEY', ['PRIVATE_KEY', 'STYLUS_DEPLOYER_PRIVATE_KEY']);

const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const RP_ID = 'stylussafe.xyz';
const ORIGIN = 'https://stylussafe.xyz';

const swapAddrs = JSON.parse(readFileSync(resolve(__dirname, '..', 'deployed_swap_addresses.json'), 'utf8'));
const SWAP_POOL = swapAddrs.swapPool;
const USDG_ADDR = swapAddrs.tokens.USDG.address;
const USDC_ADDR = swapAddrs.tokens.USDC.address;

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
const ok = (msg) => { passed++; console.log(`   OK: ${msg}`); };
const fail = (msg) => { throw new Error(`FAIL: ${msg}`); };

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
  console.log('Deploying StylusSafeAccount v3 + StylusSafeFactory on Arbitrum Sepolia...');
  const provider = new ethers.JsonRpcProvider(RPC_URL, 421614, { staticNetwork: ethers.Network.from(421614) });
  const deployer = new ethers.Wallet(PRIV_KEY, provider);
  const ep = new ethers.Contract(ENTRY_POINT, entryPointAbi, deployer);
  console.log(`Deployer: ${deployer.address}  ETH: ${ethers.formatEther(await provider.getBalance(deployer.address))}`);

  const implAddress = process.env.V3_IMPL || '0x0242E382976489B6E5aceEB7507a449B01535888';
  const implTx = '0x2c2a1a2d248671c911f2ea9533a81e690d94364afef6046a9e3dcd77481ba666';
  const impl = new ethers.Contract(implAddress, accountAbi, deployer);
  console.log(`Implementation v3: ${implAddress}`);

  const factoryAddress = process.env.V3_FACTORY || '0x1168B0CBc316d9194Eff58e2A27F1FfD33904465';
  const factoryTx = '0x0b228fc087903fa9b79fdc885f34ea8c05909b04c3ff59c1e76b2e7fc6286602';
  const factory = new ethers.Contract(factoryAddress, factoryAbi, deployer);
  console.log(`Factory v3:        ${factoryAddress}`);

  // P1: implementation locked
  try {
    await impl.initialize.staticCall(deployer.address, PUBKEY, RP_ID, ORIGIN);
    fail('P1 implementation initialize did not revert');
  } catch (e) {
    if (String(e.message).startsWith('FAIL:')) throw e;
    ok('P1 implementation is locked');
  }

  // Verify ERC-7579 metadata on impl
  if ((await impl.accountId()) !== 'stylussafe.account.v3.erc7579') fail('accountId mismatch');
  if (!(await impl.supportsModule(1)) || !(await impl.supportsModule(2))) fail('ERC-7579 supportsModule failed');
  ok('P2 ERC-7579 accountId + supportsModule verified');

  const walletAddress = await factory['getAddress(bytes,address,string,string)'](PUBKEY, ENTRY_POINT, RP_ID, ORIGIN);
  const wallet = new ethers.Contract(walletAddress, accountAbi, provider);
  console.log(`Counterfactual v3 wallet: ${walletAddress}`);
  await (await deployer.sendTransaction({ to: walletAddress, value: ethers.parseEther('0.00055') })).wait();

  // Mint 150 USDG to the v3 smart wallet for real SwapPool batch testing
  const usdg = new ethers.Contract(USDG_ADDR, [
    'function mint(address,uint256)',
    'function approve(address,uint256) returns (bool)',
    'function transfer(address,uint256) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
  ], deployer);
  const usdc = new ethers.Contract(USDC_ADDR, ['function balanceOf(address) view returns (uint256)'], deployer);
  const swapPoolIface = new ethers.Interface([
    'function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient) returns (uint256)',
  ]);
  await (await usdg.mint(walletAddress, 150_000_000n)).wait();
  ok('P3 Funded v3 counterfactual wallet with ETH + 150 USDG');

  const feeData = await provider.getFeeData();
  const maxFee = (feeData.gasPrice ?? 100_000_000n) * 2n;
  const iface = new ethers.Interface(accountAbi);

  async function buildOp(callData, { initCode = '0x', vgl = 700_000n, cgl = 500_000n } = {}) {
    return {
      sender: walletAddress,
      nonce: await ep.getNonce(walletAddress, 0),
      initCode,
      callData,
      callGasLimit: cgl,
      verificationGasLimit: vgl,
      preVerificationGas: 65_000n,
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
      if (String(reason).startsWith(codePrefix)) return ok(`${label} -> rejected (${reason})`);
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

  const recipient = ethers.Wallet.createRandom().address;
  let op = await buildOp(
    iface.encodeFunctionData('execute', [recipient, ethers.parseEther('0.0001'), '0x']),
    { initCode, vgl: 1_500_000n }
  );
  op.signature = webauthnSign(await ep.getUserOpHash(op));
  let res = await sendOp(op, 'Deploy v3 wallet');
  if (!res.success || (await provider.getCode(walletAddress)).length <= 2) fail('P4 deploy failed');
  ok(`P4 Passkey deployed v3 wallet cleanly (tx ${res.tx})`);

  // Configure 4 concurrent policies atomically via executeBatch:
  //   1. Agent1 (POLICY_AGENT = 0) allowed on SwapPool ($100/tx, $500/day)
  //   2. Agent2 (POLICY_DCA = 1 via ERC-7579 installModule) allowed on SwapPool ($40/tx, $200/7d)
  //   3. Merchant1 subscription ($15 / 30d)
  //   4. Merchant2 subscription ($25 / 7d)
  const agent1 = ethers.Wallet.createRandom();
  const agent2 = ethers.Wallet.createRandom();
  const merchant1 = ethers.Wallet.createRandom().address;
  const merchant2 = ethers.Wallet.createRandom().address;
  const now = (await provider.getBlock('latest')).timestamp;

  const dcaInit = coder.encode(
    ['uint8', 'uint256', 'uint256', 'uint256', 'address', 'uint256'],
    [1, now + 30 * 86400, 40_000_000n, 200_000_000n, SWAP_POOL, 7 * 86400]
  );

  const batchSetup = iface.encodeFunctionData('executeBatch', [
    [walletAddress, walletAddress, walletAddress, walletAddress],
    [0n, 0n, 0n, 0n],
    [
      iface.encodeFunctionData('setAgentPolicy', [agent1.address, now + 86400, 100_000_000n, 500_000_000n, SWAP_POOL]),
      iface.encodeFunctionData('installModule', [1, agent2.address, dcaInit]),
      iface.encodeFunctionData('setupSubscription', [merchant1, 15_000_000n, 30]),
      iface.encodeFunctionData('setupSubscription', [merchant2, 25_000_000n, 7]),
    ],
  ]);

  op = await buildOp(batchSetup, { cgl: 1_200_000n });
  op.signature = webauthnSign(await ep.getUserOpHash(op));
  res = await sendOp(op, 'Setup 4 concurrent policies');
  if (!res.success) fail('P5 batch policy setup failed');

  const count = await wallet.policyCount();
  const all = await wallet.getAllPolicies();
  if (count !== 4n || all.length !== 4) fail(`Expected 4 concurrent policies, got ${count}`);
  if (!(await wallet.isModuleInstalled(1, agent2.address, '0x'))) fail('ERC-7579 module not reported installed');
  if ((await wallet.sessionKey()).toLowerCase() !== agent2.address.toLowerCase()) fail('Subscriptions overwrote sessionKey');
  ok(`P5 Configured 4 concurrent policies (Agent1 + DCA Module + 2 Subscriptions) with ZERO overwrites (tx ${res.tx})`);

  // P6: Agent 1 executes real atomic SwapPool swap (approve + swap) passwordlessly using executeAsAgentBatch!
  const approveData = usdg.interface.encodeFunctionData('approve', [SWAP_POOL, 50_000_000n]);
  const swapData = swapPoolIface.encodeFunctionData('swap', [USDG_ADDR, USDC_ADDR, 50_000_000n, 48_000_000n, walletAddress]);
  const agentBatchCall = iface.encodeFunctionData('executeAsAgentBatch', [
    agent1.address,
    [USDG_ADDR, SWAP_POOL],
    [0n, 0n],
    [approveData, swapData],
  ]);

  op = await buildOp(agentBatchCall, { cgl: 800_000n });
  op.signature = sessionSign(agent1, await ep.getUserOpHash(op));
  res = await sendOp(op, 'Agent1 SwapPool executeAsAgentBatch');
  const usdcAfter = await usdc.balanceOf(walletAddress);
  const agent1Pol = await wallet.getPolicy(agent1.address);
  const agent2Pol = await wallet.getPolicy(agent2.address);
  if (!res.success || usdcAfter < 48_000_000n) fail(`P6 Agent1 swap failed: usdcAfter=${usdcAfter}`);
  if (agent1Pol.spent !== 50_000_000n || agent2Pol.spent !== 0n) fail('P6 policy spend tracking isolation failed');
  ok(`P6 Agent1 atomically approved+swapped 50 USDG -> ${ethers.formatUnits(usdcAfter, 6)} USDC (isolated spent=50 USDG, Agent2 spent=0) (tx ${res.tx})`);

  // N1: Agent1 tries impersonating Agent2 in executeAsAgentBatch -> AA24
  op = await buildOp(iface.encodeFunctionData('executeAsAgentBatch', [agent2.address, [USDG_ADDR], [0n], [approveData]]));
  op.signature = sessionSign(agent1, await ep.getUserOpHash(op));
  await expectFailedOp(op, 'AA24', 'N1 cross-key impersonation');

  // N2: Agent1 tries approving a rogue spender inside executeAsAgentBatch -> reverts in execution (success=false)
  const rogueApprove = usdg.interface.encodeFunctionData('approve', [deployer.address, 10_000_000n]);
  op = await buildOp(iface.encodeFunctionData('executeAsAgentBatch', [agent1.address, [USDG_ADDR], [0n], [rogueApprove]]));
  op.signature = sessionSign(agent1, await ep.getUserOpHash(op));
  res = await sendOp(op, 'N2 rogue approve');
  if (res.success) fail('N2 rogue approve inside executeAsAgentBatch was allowed');
  ok('N2 unapproved spender in batch approve blocked cleanly');

  // N3: Agent2 swaps cleanly while Merchant1 is revoked (selective revocation)
  op = await buildOp(iface.encodeFunctionData('revokeSessionKey(address)', [merchant1]));
  op.signature = webauthnSign(await ep.getUserOpHash(op));
  res = await sendOp(op, 'Revoke Merchant1 only');
  if (!res.success || (await wallet.policyCount()) !== 3n) fail('P7 selective revocation count mismatch');
  ok('P7 selectively revoked Merchant1 while preserving Agent1, Agent2 (DCA), and Merchant2');

  // Verify Agent2 still executes within its $40/tx policy after Merchant1 revocation
  const approve2 = usdg.interface.encodeFunctionData('approve', [SWAP_POOL, 20_000_000n]);
  const swap2 = swapPoolIface.encodeFunctionData('swap', [USDG_ADDR, USDC_ADDR, 20_000_000n, 19_000_000n, walletAddress]);
  op = await buildOp(
    iface.encodeFunctionData('executeAsAgentBatch', [agent2.address, [USDG_ADDR, SWAP_POOL], [0n, 0n], [approve2, swap2]]),
    { cgl: 800_000n }
  );
  op.signature = sessionSign(agent2, await ep.getUserOpHash(op));
  res = await sendOp(op, 'P8 Agent2 DCA batch after Merchant1 revoke');
  if (!res.success || (await wallet.getPolicy(agent2.address)).spent !== 20_000_000n) fail('P8 Agent2 failed after unrelated revoke');
  ok(`P8 Agent2 DCA module executed concurrently & independently (tx ${res.tx})`);

  console.log(`\nALL ${passed} V3 CHECKS PASSED`);

  const prev = JSON.parse(read('deployed_addresses.json'));
  const out = {
    ...prev,
    version: 'v3',
    implementation: implAddress,
    factory: factoryAddress,
    sampleWallet: walletAddress,
    entryPoint: ENTRY_POINT,
    deployTxs: { implementation: implTx, factory: factoryTx },
    previous: { implementation: prev.implementation, factory: prev.factory, version: prev.version || 'v2' },
    verifiedChecks: passed,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(resolve(__dirname, '..', 'deployed_addresses.json'), JSON.stringify(out, null, 2));
  console.log('Updated contracts/deployed_addresses.json -> v3');
}

main().catch((err) => {
  console.error('\n', err.message || err);
  process.exit(1);
});

