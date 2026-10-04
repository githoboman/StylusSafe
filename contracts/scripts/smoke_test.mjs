import { ethers } from 'ethers';

const rpcUrl = process.env.RPC_URL || 'https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e';
const privateKey = process.env.PRIVATE_KEY;
const factoryAddress = '0xe98c353fF883445995021182D918E3577365b284';
const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

if (!privateKey) {
  console.log("⚠️ Skipping on-chain smoke test: PRIVATE_KEY not found in environment (expected in CI).");
  process.exit(0);
}

const FACTORY_ABI = [
  'function createWallet(bytes calldata publicKey, address entryPoint, string calldata rpId, string calldata origin) external returns (address wallet)',
  'function getAddress(bytes calldata publicKey) external view returns (address)'
];

const WALLET_ABI = [
  'function entry_point() external view returns (address)',
  'function session_key() external view returns (address)'
];

async function main() {
  console.log("🚀 Starting End-to-End Smoke Test...");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  
  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);

  // Generate a random 65-byte uncompressed P-256 public key mock
  // In a real scenario, this comes from WebAuthn registration.
  // 0x04 + 32 bytes X + 32 bytes Y
  const mockPubKey = "0x04" + "11".repeat(64);
  
  console.log("Predicting wallet address...");
  const predictedAddress = await factory.getAddress(mockPubKey);
  console.log(`Predicted Address: ${predictedAddress}`);
  
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
  
  // Verify the wallet contract state
  const walletContract = new ethers.Contract(predictedAddress, WALLET_ABI, provider);
  
  const fetchedEntryPoint = await walletContract.entry_point();
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
