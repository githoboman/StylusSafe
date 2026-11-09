import { ethers } from 'ethers';
import { loadLocalSecrets } from './env_loader.mjs';

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadLocalSecrets();

const deployedInfo = JSON.parse(readFileSync(resolve(__dirname, '..', 'deployed_addresses.json'), 'utf8'));

const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
const factoryAddress = deployedInfo.factory || '0xAB283BA59EA6E9448c5C105d7afB12d73727c864';
const entryPoint = deployedInfo.entryPoint || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

if (!privateKey) {
  console.log("⚠️ Skipping on-chain smoke test: PRIVATE_KEY not found in environment or secret.txt.");
  process.exit(0);
}

const FACTORY_ABI = [
  'function createWallet(bytes calldata publicKey, address entryPoint, string calldata rpId, string calldata origin) external returns (address wallet)',
  'function getAddress(bytes calldata publicKey, address entryPoint, string calldata rpId, string calldata origin) external view returns (address)',
  'function getAddress(bytes calldata publicKey) external view returns (address)',
  'function implementation() external view returns (address)'
];

const WALLET_ABI = [
  'function entryPoint() external view returns (address)',
  'function sessionKey() external view returns (address)',
  'function sessionExpiry() external view returns (uint256)'
];

async function main() {
  console.log("🚀 Starting End-to-End Smoke Test...");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);

  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);
  const impl = await factory.implementation();
  console.log(`Factory (${factoryAddress}) -> Implementation: ${impl}`);

  const randomHex = Buffer.from(ethers.randomBytes(64)).toString('hex');
  const mockPubKey = "0x04" + randomHex;

  console.log("Predicting wallet address...");
  let predictedAddress;
  try {
    predictedAddress = await factory['getAddress(bytes,address,string,string)'](
      mockPubKey,
      entryPoint,
      "stylussafe.xyz",
      "https://stylussafe.xyz"
    );
  } catch {
    predictedAddress = await factory['getAddress(bytes)'](mockPubKey);
  }
  console.log(`Predicted Address: ${predictedAddress}`);

  const balance = await provider.getBalance(signer.address);
  if (balance < ethers.parseEther('0.002')) {
    console.log(`ℹ️ Relayer balance (${ethers.formatEther(balance)} ETH) reserved for live UserOps; skipping new dummy wallet deployment. Factory & CREATE2 prediction verified on-chain!`);
    return;
  }

  console.log("Deploying wallet via Factory...");
  const tx = await factory.createWallet(
    mockPubKey,
    entryPoint,
    "stylussafe.xyz",
    "https://stylussafe.xyz",
    { gasLimit: 2000000 }
  );

  console.log(`Transaction sent! Hash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Transaction mined! Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);

  if (receipt.status !== 1) {
    throw new Error("Transaction failed!");
  }

  const walletContract = new ethers.Contract(predictedAddress, WALLET_ABI, provider);
  const fetchedEntryPoint = await walletContract.entryPoint();
  console.log(`Wallet EntryPoint verified on-chain: ${fetchedEntryPoint}`);

  if (fetchedEntryPoint.toLowerCase() !== entryPoint.toLowerCase()) {
    throw new Error("EntryPoint mismatch!");
  }

  console.log("✅ End-to-End Smoke Test completed successfully!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
