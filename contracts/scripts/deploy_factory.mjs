/**
 * deploy_factory.mjs
 * 
 * Deploys the StylusSafeFactory contract and wires it to the deployed
 * Stylus WASM implementation address.
 * 
 * Usage:
 *   node scripts/deploy_factory.mjs \
 *     --rpc <RPC_URL> \
 *     --key <PRIVATE_KEY> \
 *     --impl <WASM_IMPLEMENTATION_ADDRESS>
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse CLI args
function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : process.env[name.replace('--', '').toUpperCase().replace('-', '_')];
}

const rpcUrl  = getArg('--rpc') ?? 'https://sepolia-rollup.arbitrum.io/rpc';
const privKey = getArg('--key');
const implAddr = getArg('--impl');

if (!privKey || !implAddr) {
  console.error('Usage: node deploy_factory.mjs --rpc <URL> --key <PRIV_KEY> --impl <WASM_ADDR>');
  process.exit(1);
}

// Minimal StylusSafeFactory ABI + bytecode
// The factory uses CREATE2 to deploy minimal proxy clones pointing to the Stylus WASM impl.
const FACTORY_ABI = [
  'constructor(address implementation)',
  'event WalletDeployed(address indexed wallet, bytes publicKey)',
  'function deployWallet(bytes calldata publicKey) external returns (address wallet)',
  'function computeAddress(bytes calldata publicKey) external view returns (address)',
];

// Minimal CREATE2 factory bytecode (compiled from StylusSafeFactory.sol).
// In CI, you would compile this with forge/hardhat. For demo purposes we
// include the bytecode directly.
const FACTORY_BYTECODE = readFileSync(
  join(__dirname, '..', 'StylusSafeFactory.bin'),
  'utf8'
).trim();

async function main() {
  console.log('🚀 StylusSafe Factory Deployment');
  console.log('──────────────────────────────────');
  console.log(`RPC     : ${rpcUrl}`);
  console.log(`WASM    : ${implAddr}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet   = new ethers.Wallet(privKey, provider);
  const balance  = await provider.getBalance(wallet.address);

  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance : ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.001')) {
    console.error('❌ Insufficient ETH for deployment. Need at least 0.001 ETH.');
    process.exit(1);
  }

  console.log('\nDeploying StylusSafeFactory...');

  const factory = new ethers.ContractFactory(
    FACTORY_ABI,
    FACTORY_BYTECODE,
    wallet
  );

  const contract = await factory.deploy(implAddr, {
    gasLimit: 2_000_000,
  });

  console.log(`Tx hash : ${contract.deploymentTransaction()?.hash}`);
  console.log('Waiting for confirmation...');

  await contract.waitForDeployment();
  const factoryAddr = await contract.getAddress();

  console.log(`\n✅ StylusSafeFactory deployed!`);
  console.log(`   Address : ${factoryAddr}`);
  console.log(`   Explorer: https://sepolia.arbiscan.io/address/${factoryAddr}`);
  console.log(`\n📋 Update your .env:`);
  console.log(`   NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`   NEXT_PUBLIC_WASM_IMPL_ADDRESS=${implAddr}`);
}

main().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
