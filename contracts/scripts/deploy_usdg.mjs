/**
 * deploy_usdg.mjs
 *
 * Deploys the real ERC-20 USDG token on Arbitrum Sepolia.
 * Mints testnet USDG balances for the demo smart wallet and deployer.
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
const deployedInfo = JSON.parse(readFileSync(resolve(__dirname, '..', 'deployed_addresses.json'), 'utf8'));

const usdgBytecode = '0x' + readFileSync(resolve(__dirname, '..', 'USDG.bin'), 'utf8').trim();
const usdgAbi = JSON.parse(readFileSync(resolve(__dirname, '..', 'USDG.json'), 'utf8'));

// User's demo wallet from audit
const USER_WALLET = '0x32B391496b592a6e5E2c075091D8cD417673031a';

async function main() {
  console.log('💵 Deploying Real USDG ERC-20 Token on Arbitrum Sepolia');
  console.log('═══════════════════════════════════════════════════════');

  const provider = new ethers.JsonRpcProvider(RPC_URL, 421614, { staticNetwork: ethers.Network.from(421614) });
  const wallet = new ethers.Wallet(PRIV_KEY, provider);

  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance : ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH`);

  // Deploy with 10,000,000 USDG initial supply (6 decimals)
  const initialSupply = ethers.parseUnits('10000000', 6);
  console.log('\nDeploying USDG contract...');
  const usdgFactory = new ethers.ContractFactory(usdgAbi, usdgBytecode, wallet);
  const usdgContract = await usdgFactory.deploy(initialSupply, { gasLimit: 2_500_000 });
  console.log(`Tx Hash: ${usdgContract.deploymentTransaction()?.hash}`);
  await usdgContract.waitForDeployment();
  const usdgAddress = await usdgContract.getAddress();
  console.log(`✅ USDG Token deployed at: ${usdgAddress}`);

  // Mint 10,000 USDG to sample wallet and user demo wallet
  console.log('\nMinting 10,000 USDG to demo wallets...');
  const mintAmount = ethers.parseUnits('10000', 6);

  const mintTx1 = await usdgContract.mint(USER_WALLET, mintAmount, { gasLimit: 200_000 });
  await mintTx1.wait();
  console.log(`   Minted 10,000 USDG to user wallet ${USER_WALLET}`);

  if (deployedInfo.sampleWallet) {
    const mintTx2 = await usdgContract.mint(deployedInfo.sampleWallet, mintAmount, { gasLimit: 200_000 });
    await mintTx2.wait();
    console.log(`   Minted 10,000 USDG to sample wallet ${deployedInfo.sampleWallet}`);
  }

  // Verify balances on-chain
  const userBal = await usdgContract.balanceOf(USER_WALLET);
  const decimals = await usdgContract.decimals();
  const symbol = await usdgContract.symbol();
  console.log(`\nVerified On-Chain State:`);
  console.log(`   Token Symbol  : ${symbol}`);
  console.log(`   Decimals      : ${decimals}`);
  console.log(`   User Balance  : ${ethers.formatUnits(userBal, decimals)} ${symbol}`);

  // Update deployed_addresses.json
  deployedInfo.usdg = usdgAddress;
  writeFileSync(resolve(__dirname, '..', 'deployed_addresses.json'), JSON.stringify(deployedInfo, null, 2), 'utf8');

  console.log('\n✅ USDG deployment and verification complete!');
}

main().catch(err => {
  console.error('\n❌ USDG Deployment failed:', err);
  process.exit(1);
});

