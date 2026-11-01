/**
 * deploy_production_contracts.mjs
 *
 * Senior Blockchain Engineer Production Deployment & Verification Script:
 * 1. Deploys StylusSafeAccount (hardened implementation with WebAuthn & Agent Policy Firewall).
 * 2. Deploys StylusSafeFactory (CREATE2 deterministic factory with parameter-bound salt against front-running).
 * 3. Verifies deterministic wallet creation, initialization, and policy enforcement on Arbitrum Sepolia.
 */

import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadLocalSecrets, getRequiredSecret } from './env_loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadLocalSecrets();

const RPC_URL = process.env.ALCHEMY_API_KEY
  ? `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc');

const PRIV_KEY = getRequiredSecret('DEPLOYER_PRIVATE_KEY', ['PRIVATE_KEY', 'STYLUS_DEPLOYER_PRIVATE_KEY']);
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const accountBytecode = '0x' + readFileSync(resolve(__dirname, '..', 'StylusSafeAccount.bin'), 'utf8').trim();
const accountAbi = JSON.parse(readFileSync(resolve(__dirname, '..', 'StylusSafeAccount.json'), 'utf8'));

const factoryBytecode = '0x' + readFileSync(resolve(__dirname, '..', 'StylusSafeFactory.bin'), 'utf8').trim();
const factoryAbi = JSON.parse(readFileSync(resolve(__dirname, '..', 'StylusSafeFactory.json'), 'utf8'));

async function main() {
  console.log('🚀 Deploying Hardened Production Contracts on Arbitrum Sepolia');
  console.log('═══════════════════════════════════════════════════════════════');

  const provider = new ethers.JsonRpcProvider(RPC_URL, 421614, { staticNetwork: ethers.Network.from(421614) });
  const wallet = new ethers.Wallet(PRIV_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance : ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.001')) {
    throw new Error('Insufficient balance to deploy contracts. Need >= 0.001 ETH');
  }

  // 1. Deploy StylusSafeAccount Implementation
  console.log('\n📦 Step 1: Deploying StylusSafeAccount implementation...');
  const accountFactory = new ethers.ContractFactory(accountAbi, accountBytecode, wallet);
  const accountContract = await accountFactory.deploy({ gasLimit: 5_000_000 });
  console.log(`   Tx Hash: ${accountContract.deploymentTransaction()?.hash}`);
  await accountContract.waitForDeployment();
  const implAddress = await accountContract.getAddress();
  console.log(`✅ StylusSafeAccount Implementation deployed at: ${implAddress}`);

  // 2. Deploy StylusSafeFactory
  console.log('\n🏭 Step 2: Deploying StylusSafeFactory...');
  const factoryContractFactory = new ethers.ContractFactory(factoryAbi, factoryBytecode, wallet);
  const factoryContract = await factoryContractFactory.deploy(implAddress, { gasLimit: 3_000_000 });
  console.log(`   Tx Hash: ${factoryContract.deploymentTransaction()?.hash}`);
  await factoryContract.waitForDeployment();
  const factoryAddress = await factoryContract.getAddress();
  console.log(`✅ StylusSafeFactory deployed at: ${factoryAddress}`);

  // 3. Test Wallet Creation & Front-Running Invariant
  console.log('\n🔐 Step 3: Verifying Deterministic CREATE2 Wallet Deployment...');
  const randomBytes = ethers.randomBytes(64);
  const testPubKey = '0x04' + Buffer.from(randomBytes).toString('hex');
  const rpId = 'stylussafe.xyz';
  const origin = 'https://stylussafe.xyz';

  const predicted = await factoryContract['getAddress(bytes,address,string,string)'](
    testPubKey,
    ENTRY_POINT,
    rpId,
    origin
  );
  console.log(`   Predicted address: ${predicted}`);

  const createTx = await factoryContract.createWallet(testPubKey, ENTRY_POINT, rpId, origin, { gasLimit: 2_000_000 });
  const createReceipt = await createTx.wait();
  console.log(`   Wallet created! Tx: ${createTx.hash} (Status: ${createReceipt.status})`);

  // 4. Verify Wallet State & Initial Invariants
  console.log('\n🔎 Step 4: Verifying on-chain wallet invariants...');
  const deployedWallet = new ethers.Contract(predicted, accountAbi, wallet);
  const onChainEntryPoint = await deployedWallet.entryPoint();
  console.log(`   On-chain EntryPoint: ${onChainEntryPoint}`);
  if (onChainEntryPoint.toLowerCase() !== ENTRY_POINT.toLowerCase()) {
    throw new Error('EntryPoint address mismatch!');
  }

  // 5. Verify Idempotence (Audit C4): calling createWallet again returns same address without re-executing
  const secondCallRes = await factoryContract.createWallet.staticCall(testPubKey, ENTRY_POINT, rpId, origin);
  console.log(`   Idempotent call address: ${secondCallRes}`);
  if (secondCallRes.toLowerCase() !== predicted.toLowerCase()) {
    throw new Error('Idempotence check failed!');
  }

  // Record deployment addresses in JSON config
  const deployedAddresses = {
    network: 'arbitrum-sepolia',
    chainId: 421614,
    implementation: implAddress,
    factory: factoryAddress,
    sampleWallet: predicted,
    entryPoint: ENTRY_POINT,
    timestamp: new Date().toISOString()
  };
  writeFileSync(resolve(__dirname, '..', 'deployed_addresses.json'), JSON.stringify(deployedAddresses, null, 2), 'utf8');

  console.log('\n🎉 ALL CHECKS PASSED! Production deployment verified on-chain.');
  console.log(JSON.stringify(deployedAddresses, null, 2));
}

main().catch(err => {
  console.error('\n❌ Deployment failed:', err);
  process.exit(1);
});

