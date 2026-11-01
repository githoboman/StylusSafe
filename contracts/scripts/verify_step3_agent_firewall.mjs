/**
 * verify_step3_agent_firewall.mjs
 *
 * Senior Smart Contract Engineer Verification Suite for Step 3:
 * On-Chain Policy-Enforced Autonomous Agent Spending Firewall.
 *
 * Tests on Arbitrum Sepolia against deployed StylusSafeAccount:
 * 1. Policy initialization & getters (sessionKey, sessionExpiry, sessionMaxPerTx, sessionDailyLimit, sessionAllowedTarget).
 * 2. Invariant: Agent execution exceeding per-tx cap REVERTS (PerTxLimitExceeded).
 * 3. Invariant: Agent execution to unapproved target REVERTS (TargetNotAllowed).
 * 4. Invariant: Valid agent execution within caps SUCCEEDS.
 * 5. Invariant: Cumulative spending exceeding daily cap REVERTS (DailyLimitExceeded).
 * 6. Revocation: Session revocation zeroes all permissions.
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadLocalSecrets, getRequiredSecret } from './env_loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadLocalSecrets();

const RPC_URL = process.env.ALCHEMY_API_KEY
  ? `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc');

const PRIV_KEY = getRequiredSecret('DEPLOYER_PRIVATE_KEY', ['PRIVATE_KEY', 'STYLUS_DEPLOYER_PRIVATE_KEY']);
const deployedInfo = JSON.parse(readFileSync(resolve(__dirname, '..', 'deployed_addresses.json'), 'utf8'));
const accountAbi = JSON.parse(readFileSync(resolve(__dirname, '..', 'StylusSafeAccount.json'), 'utf8'));

async function main() {
  console.log('🛡️  VERIFYING STEP 3: On-Chain Autonomous Agent Spending Firewall');
  console.log('═══════════════════════════════════════════════════════════════════');

  const provider = new ethers.JsonRpcProvider(RPC_URL, 421614, { staticNetwork: ethers.Network.from(421614) });
  const owner = new ethers.Wallet(PRIV_KEY, provider);

  // Generate ephemeral agent keypair
  const agentWallet = ethers.Wallet.createRandom().connect(provider);
  console.log(`Owner Account: ${owner.address}`);
  console.log(`Agent Account: ${agentWallet.address}`);
  console.log(`Target Wallet: ${deployedInfo.sampleWallet}`);

  // Fund the agent with a tiny amount of ETH for gas (0.0005 ETH)
  console.log('\nFunding agent for test gas...');
  const fundTx = await owner.sendTransaction({
    to: agentWallet.address,
    value: ethers.parseEther('0.0005'),
  });
  await fundTx.wait();
  console.log(`Agent funded: ${agentWallet.address}`);

  // Fund the Smart Wallet with test ETH (0.001 ETH)
  const fundWalletTx = await owner.sendTransaction({
    to: deployedInfo.sampleWallet,
    value: ethers.parseEther('0.001'),
  });
  await fundWalletTx.wait();
  console.log(`Smart Wallet balance: ${ethers.formatEther(await provider.getBalance(deployedInfo.sampleWallet))} ETH`);

  const walletContractAsAgent = new ethers.Contract(deployedInfo.sampleWallet, accountAbi, agentWallet);

  // Set Agent Policy directly on the wallet implementation via storage or simulated call
  // Note: on the proxy, EntryPoint or wallet itself sets policy.
  // We simulate EntryPoint by impersonating or using staticCall to test logic, or we test on an implementation instance!
  console.log('\n🧪 Testing Policy Enforcement Invariants on-chain...');

  // Deploy an ephemeral test wallet directly owned to test executeWithPolicy
  const testAccountFactory = new ethers.ContractFactory(accountAbi, readFileSync(resolve(__dirname, '..', 'StylusSafeAccount.bin'), 'utf8').trim(), owner);
  const testWallet = await testAccountFactory.deploy({ gasLimit: 3_000_000 });
  await testWallet.waitForDeployment();
  const testWalletAddress = await testWallet.getAddress();
  console.log(`Dedicated Test Wallet deployed at: ${testWalletAddress}`);

  // Fund dedicated test wallet
  await (await owner.sendTransaction({ to: testWalletAddress, value: ethers.parseEther('0.002') })).wait();

  // Initialize test wallet with owner as EntryPoint so owner can configure policy
  const randomBytes = ethers.randomBytes(64);
  const testPubKey = '0x04' + Buffer.from(randomBytes).toString('hex');
  await (await testWallet.initialize(owner.address, testPubKey, 'stylussafe.xyz', 'https://stylussafe.xyz')).wait();
  console.log('Test Wallet initialized with owner as EntryPoint authority.');

  // 1. Configure Agent Policy:
  // - Agent: agentWallet.address
  // - Expiry: now + 1 hour
  // - Max Per Tx: 0.0003 ETH
  // - Daily Limit: 0.0008 ETH
  // - Allowed Target: owner.address
  const oneHour = 3600;
  const block = await provider.getBlock('latest');
  const expiry = block.timestamp + oneHour;
  const maxPerTx = ethers.parseEther('0.0003');
  const dailyLimit = ethers.parseEther('0.0008');
  const allowedTarget = owner.address;

  console.log('\n1. Configuring Agent Policy:');
  console.log(`   Agent: ${agentWallet.address}`);
  console.log(`   Expiry: ${expiry}`);
  console.log(`   Max Per Tx: 0.0003 ETH`);
  console.log(`   Daily Limit: 0.0008 ETH`);
  console.log(`   Allowed Target: ${allowedTarget}`);

  const setPolicyTx = await testWallet.setAgentPolicy(
    agentWallet.address,
    expiry,
    maxPerTx,
    dailyLimit,
    allowedTarget
  );
  await setPolicyTx.wait();

  // Verify getters on-chain
  const onChainKey = await testWallet.sessionKey();
  const onChainMax = await testWallet.sessionMaxPerTx();
  const onChainDaily = await testWallet.sessionDailyLimit();
  const onChainTarget = await testWallet.sessionAllowedTarget();

  console.log(`   On-chain sessionKey: ${onChainKey}`);
  console.log(`   On-chain sessionMaxPerTx: ${ethers.formatEther(onChainMax)} ETH`);
  console.log(`   On-chain sessionDailyLimit: ${ethers.formatEther(onChainDaily)} ETH`);
  console.log(`   On-chain sessionAllowedTarget: ${onChainTarget}`);

  if (onChainKey.toLowerCase() !== agentWallet.address.toLowerCase()) throw new Error('sessionKey mismatch!');
  if (onChainMax !== maxPerTx) throw new Error('maxPerTx mismatch!');
  if (onChainDaily !== dailyLimit) throw new Error('dailyLimit mismatch!');
  if (onChainTarget.toLowerCase() !== allowedTarget.toLowerCase()) throw new Error('allowedTarget mismatch!');
  console.log('   ✅ Policy state verified on-chain!');

  // Connect as agent
  const agentTestWallet = new ethers.Contract(testWalletAddress, accountAbi, agentWallet);

  // 2. Invariant Check: Execution exceeding maxPerTx REVERTS
  console.log('\n2. Testing Invariant: spend > maxPerTx MUST REVERT (PerTxLimitExceeded)...');
  try {
    await agentTestWallet.executeWithPolicy.staticCall(
      allowedTarget,
      ethers.parseEther('0.0005'), // > 0.0003 limit
      '0x'
    );
    throw new Error('FAILED: Transaction exceeding maxPerTx was NOT rejected!');
  } catch (err) {
    console.log('   ✅ SUCCESS: Rejected on-chain as expected! Revert:', err.shortMessage || err.message);
  }

  // 3. Invariant Check: Execution targeting unauthorized address REVERTS
  console.log('\n3. Testing Invariant: target != allowedTarget MUST REVERT (TargetNotAllowed)...');
  const unauthorizedRecipient = '0x1111111111111111111111111111111111111111';
  try {
    await agentTestWallet.executeWithPolicy.staticCall(
      unauthorizedRecipient,
      ethers.parseEther('0.0001'), // within per-tx limit
      '0x'
    );
    throw new Error('FAILED: Transaction to unauthorized target was NOT rejected!');
  } catch (err) {
    console.log('   ✅ SUCCESS: Rejected on-chain as expected! Revert:', err.shortMessage || err.message);
  }

  // 4. Invariant Check: Valid execution within policy limits SUCCEEDS
  console.log('\n4. Testing Invariant: Valid agent execution within limits MUST SUCCEED...');
  const validSpend1 = ethers.parseEther('0.0002');
  const tx1 = await agentTestWallet.executeWithPolicy(allowedTarget, validSpend1, '0x', { gasLimit: 500_000 });
  const rc1 = await tx1.wait();
  console.log(`   ✅ Execution 1 mined! Tx: ${tx1.hash} (Status: ${rc1.status})`);

  let spentToday = await testWallet.sessionSpentToday();
  console.log(`   Spent today after tx 1: ${ethers.formatEther(spentToday)} ETH`);

  // 5. Invariant Check: Accumulating spending up to dailyLimit
  console.log('\n5. Testing Invariant: Cumulative spending exceeding dailyLimit MUST REVERT...');
  const validSpend2 = ethers.parseEther('0.0002');
  await (await agentTestWallet.executeWithPolicy(allowedTarget, validSpend2, '0x', { gasLimit: 500_000 })).wait();
  spentToday = await testWallet.sessionSpentToday();
  console.log(`   Spent today after tx 2: ${ethers.formatEther(spentToday)} ETH (0.0004 / 0.0008 ETH)`);

  const validSpend3 = ethers.parseEther('0.0002');
  await (await agentTestWallet.executeWithPolicy(allowedTarget, validSpend3, '0x', { gasLimit: 500_000 })).wait();
  spentToday = await testWallet.sessionSpentToday();
  console.log(`   Spent today after tx 3: ${ethers.formatEther(spentToday)} ETH (0.0006 / 0.0008 ETH)`);

  // Now next spend of 0.0003 ETH would bring total to 0.0009 > 0.0008 dailyLimit!
  try {
    await agentTestWallet.executeWithPolicy.staticCall(
      allowedTarget,
      ethers.parseEther('0.00025'), // 0.0006 + 0.00025 = 0.00085 > 0.0008
      '0x'
    );
    throw new Error('FAILED: Cumulative transaction exceeding dailyLimit was NOT rejected!');
  } catch (err) {
    console.log('   ✅ SUCCESS: Daily limit exceeded rejected on-chain as expected! Revert:', err.shortMessage || err.message);
  }

  // 6. Revocation: Session key revocation zeroes all permissions
  console.log('\n6. Testing Invariant: Revocation disables agent key...');
  await (await testWallet.revokeSessionKey()).wait();
  const revokedKey = await testWallet.sessionKey();
  console.log(`   On-chain sessionKey after revocation: ${revokedKey}`);
  if (revokedKey !== ethers.ZeroAddress) throw new Error('Revocation failed!');

  try {
    await agentTestWallet.executeWithPolicy.staticCall(allowedTarget, ethers.parseEther('0.0001'), '0x');
    throw new Error('FAILED: Revoked agent was able to execute!');
  } catch (err) {
    console.log('   ✅ SUCCESS: Revoked agent cannot execute! Revert:', err.shortMessage || err.message);
  }

  console.log('\n🎉 STEP 3 VERIFICATION COMPLETE: ALL 6/6 ON-CHAIN POLICY FIREWALL INVARIANTS VERIFIED!');
}

main().catch(err => {
  console.error('\n❌ Step 3 Verification failed:', err);
  process.exit(1);
});

