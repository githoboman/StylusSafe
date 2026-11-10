/**
 * deploy_swap_pool.mjs
 *
 * Compiles & deploys StylusSafeSwapPool + companion Arbitrum Sepolia ERC-20 tokens
 * (USDC, USDT, ETH/WETH, ARB, UNI, WBTC, DEGEN), seeds deep USDG + token liquidity,
 * configures live prices fetched from DeFiLlama, verifies an on-chain EntryPoint swap,
 * and saves addresses to contracts/deployed_swap_addresses.json.
 */
import solc from 'solc';
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

const USDG_ADDRESS = '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36';
const FACTORY_ADDRESS = '0xd364b7339099E7633015FD5Cda7e21d4c40833f7';
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

// Fetch live USD prices from DeFiLlama with safe fallbacks
const LLAMA_IDS = {
  ETH: 'coingecko:ethereum',
  ARB: 'coingecko:arbitrum',
  UNI: 'coingecko:uniswap',
  WBTC: 'coingecko:wrapped-bitcoin',
  DEGEN: 'coingecko:degen-base',
  USDC: 'coingecko:usd-coin',
  USDT: 'coingecko:tether',
};
const pricesUsd = { USDG: 1, USDC: 1, USDT: 1, ETH: 2500, ARB: 0.85, UNI: 7.5, WBTC: 65000, DEGEN: 0.01 };
try {
  const res = await fetch(`https://coins.llama.fi/prices/current/${Object.values(LLAMA_IDS).join(',')}`);
  if (res.ok) {
    const json = await res.json();
    for (const [sym, id] of Object.entries(LLAMA_IDS)) {
      const p = json?.coins?.[id]?.price;
      if (typeof p === 'number' && p > 0) pricesUsd[sym] = p;
    }
  }
} catch {}
console.log('Seed prices USD:', pricesUsd);

// 1. Compile StylusSafeSwapPool.sol
const source = readFileSync(resolve(__dirname, '..', 'StylusSafeSwapPool.sol'), 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'StylusSafeSwapPool.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errs = (out.errors || []).filter((e) => e.severity === 'error');
if (errs.length) throw new Error(errs.map((e) => e.formattedMessage).join('\n'));

const tokenArt = out.contracts['StylusSafeSwapPool.sol'].StylusTestToken;
const poolArt = out.contracts['StylusSafeSwapPool.sol'].StylusSafeSwapPool;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIV_KEY, provider);
console.log('Deployer:', wallet.address, 'ETH:', ethers.formatEther(await provider.getBalance(wallet.address)));

// 2. Deploy pool
const PoolFactory = new ethers.ContractFactory(poolArt.abi, '0x' + poolArt.evm.bytecode.object, wallet);
const pool = await PoolFactory.deploy();
await pool.waitForDeployment();
const poolAddr = await pool.getAddress();
console.log('StylusSafeSwapPool deployed:', poolAddr);

// Seed pool with 100,000 USDG
const usdg = new ethers.Contract(USDG_ADDRESS, [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function balanceOf(address) view returns (uint256)',
], wallet);
await (await usdg.mint(poolAddr, ethers.parseUnits('500000', 6))).wait();
await (await pool.configureToken(USDG_ADDRESS, 6, 1_000_000n)).wait();
console.log('Seeded USDG in pool:', ethers.formatUnits(await usdg.balanceOf(poolAddr), 6));

// 3. Deploy companion swap tokens and mint liquidity directly to poolAddr
const TOKENS_SPEC = [
  { symbol: 'USDC', name: 'USD Coin (Sepolia Swap)', decimals: 6, supply: '1000000' },
  { symbol: 'USDT', name: 'Tether USD (Sepolia Swap)', decimals: 6, supply: '1000000' },
  { symbol: 'ETH', name: 'Wrapped Ether (Sepolia Swap)', decimals: 18, supply: '1000' },
  { symbol: 'ARB', name: 'Arbitrum (Sepolia Swap)', decimals: 18, supply: '1000000' },
  { symbol: 'UNI', name: 'Uniswap (Sepolia Swap)', decimals: 18, supply: '200000' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin (Sepolia Swap)', decimals: 8, supply: '100' },
  { symbol: 'DEGEN', name: 'Degen (Sepolia Swap)', decimals: 18, supply: '50000000' },
];

const deployedTokens = { USDG: { address: USDG_ADDRESS, decimals: 6, symbol: 'USDG' } };
const TokenFactory = new ethers.ContractFactory(tokenArt.abi, '0x' + tokenArt.evm.bytecode.object, wallet);

for (const spec of TOKENS_SPEC) {
  const initialUnits = ethers.parseUnits(spec.supply, spec.decimals);
  const tok = await TokenFactory.deploy(spec.name, spec.symbol, spec.decimals, 0);
  await tok.waitForDeployment();
  const tAddr = await tok.getAddress();
  await (await tok.mint(poolAddr, initialUnits)).wait();
  const pE6 = BigInt(Math.max(1, Math.round(pricesUsd[spec.symbol] * 1_000_000)));
  await (await pool.configureToken(tAddr, spec.decimals, pE6)).wait();
  deployedTokens[spec.symbol] = { address: tAddr, decimals: spec.decimals, symbol: spec.symbol };
  console.log(`Deployed ${spec.symbol}: ${tAddr} (pool bal: ${spec.supply}, priceE6: ${pE6})`);
}

// 4. End-to-end verification via EntryPoint handleOps (create smart wallet + approve USDG + pool.swap USDG -> USDC)
const { privateKey: p256Priv, publicKey: p256Pub } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = p256Pub.export({ format: 'jwk' });
const PUBKEY = '0x04' + Buffer.from(jwk.x, 'base64url').toString('hex') + Buffer.from(jwk.y, 'base64url').toString('hex');
const RP_ID = 'stylussafe.xyz';
const ORIGIN = 'https://stylussafe.xyz';
const factory = new ethers.Contract(FACTORY_ADDRESS, [
  'function getAddress(bytes publicKey, address entryPoint, string rpId, string origin) view returns (address)',
  'function createWallet(bytes publicKey, address entryPoint, string rpId, string origin) returns (address)',
], provider);
const accountIface = new ethers.Interface(['function executeBatch(address[] dest, uint256[] value, bytes[] func)']);
const erc20Iface = new ethers.Interface(['function approve(address spender, uint256 amount) returns (bool)', 'function balanceOf(address) view returns (uint256)']);
const poolIface = new ethers.Interface(['function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient) returns (uint256)']);

const smartWallet = await factory['getAddress(bytes,address,string,string)'](PUBKEY, ENTRY_POINT, RP_ID, ORIGIN);
await (await usdg.mint(smartWallet, ethers.parseUnits('200', 6))).wait();

const swapAmt = ethers.parseUnits('50', 6);
const callData = accountIface.encodeFunctionData('executeBatch', [
  [USDG_ADDRESS, poolAddr],
  [0n, 0n],
  [
    erc20Iface.encodeFunctionData('approve', [poolAddr, swapAmt]),
    poolIface.encodeFunctionData('swap', [USDG_ADDRESS, deployedTokens.USDC.address, swapAmt, 0n, smartWallet]),
  ],
]);
const initCode = FACTORY_ADDRESS + factory.interface.encodeFunctionData('createWallet', [PUBKEY, ENTRY_POINT, RP_ID, ORIGIN]).slice(2);
const opTuple = {
  sender: smartWallet,
  nonce: 0n,
  initCode,
  callData,
  callGasLimit: 450000n,
  verificationGasLimit: 700000n,
  preVerificationGas: 60000n,
  maxFeePerGas: 0n,
  maxPriorityFeePerGas: 0n,
  paymasterAndData: '0x',
  signature: '0x',
};
const USEROP_TUPLE = 'tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature)';
const entryPoint = new ethers.Contract(ENTRY_POINT, [
  `function getUserOpHash(${USEROP_TUPLE}) view returns (bytes32)`,
  `function handleOps(${USEROP_TUPLE}[] ops, address beneficiary)`,
], wallet);
const opHash = await entryPoint.getUserOpHash(opTuple);
const sha256 = (b) => createHash('sha256').update(b).digest();
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const authData = Buffer.concat([sha256(Buffer.from(RP_ID)), Buffer.from([0x05]), Buffer.from([0, 0, 0, 1])]);
const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: b64url(ethers.getBytes(opHash)), origin: ORIGIN, crossOrigin: false }));
const sig = nodeSign('sha256', Buffer.concat([authData, sha256(clientDataJSON)]), { key: p256Priv, dsaEncoding: 'ieee-p1363' });
opTuple.signature = ethers.AbiCoder.defaultAbiCoder().encode(['bytes', 'bytes', 'bytes32', 'bytes32'], [authData, clientDataJSON, sig.subarray(0, 32), sig.subarray(32, 64)]);

const tx = await entryPoint.handleOps([opTuple], wallet.address);
await tx.wait();
const usdcContract = new ethers.Contract(deployedTokens.USDC.address, ['function balanceOf(address) view returns (uint256)'], provider);
const outBal = await usdcContract.balanceOf(smartWallet);
const remUsdg = await usdg.balanceOf(smartWallet);
console.log(`VERIFIED ON-CHAIN SWAP tx=${tx.hash} smartWallet=${smartWallet} remainingUSDG=${ethers.formatUnits(remUsdg, 6)} receivedUSDC=${ethers.formatUnits(outBal, 6)}`);

const artifact = {
  network: 'arbitrum-sepolia',
  chainId: 421614,
  swapPool: poolAddr,
  tokens: deployedTokens,
  verifiedSwapTx: tx.hash,
  deployedAt: new Date().toISOString(),
};
writeFileSync(resolve(__dirname, '..', 'deployed_swap_addresses.json'), JSON.stringify(artifact, null, 2));
console.log('Saved contracts/deployed_swap_addresses.json');
