import { ethers } from 'ethers';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, generateKeyPairSync, sign as nodeSign } from 'crypto';
import { loadLocalSecrets, getRequiredSecret } from './env_loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadLocalSecrets();

const RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
const PK = getRequiredSecret('DEPLOYER_PRIVATE_KEY');
const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PK, provider);

const POOL = '0xD306521Ff547Ab4523f0a77cb9EaE53873be143b';
const USDG = '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36';
const TOKENS = {
  USDG: { address: USDG, decimals: 6, symbol: 'USDG' },
  USDC: { address: '0x120A29db0F1Dd3F479D99B8DaaCf6BD1070CA56e', decimals: 6, symbol: 'USDC' },
  USDT: { address: '0xe5313FB74788cea60941dd0a171519cdCa14cCc6', decimals: 6, symbol: 'USDT' },
  ETH: { address: '0x2e05ED11a050106E15ceF55b7938dEB6249B14cF', decimals: 18, symbol: 'ETH' },
  ARB: { address: '0xa1AF657CEaF9566D21D7e596aeF923f368F5ead1', decimals: 18, symbol: 'ARB' },
  UNI: { address: '0xEC09D28A2f790630Bb97DE8313DB904aaF6FB6b7', decimals: 18, symbol: 'UNI' },
  WBTC: { address: '0x1aCa4D7bC53793c688d71e9061c19347EbAa8bC3', decimals: 8, symbol: 'WBTC' },
  DEGEN: { address: '0xd6d2f4258A23636d650Ee6dD22bFA1978C3827A0', decimals: 18, symbol: 'DEGEN' },
};
const FACTORY = '0xd364b7339099E7633015FD5Cda7e21d4c40833f7';
const ENTRY = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const { privateKey: p256Priv, publicKey: p256Pub } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = p256Pub.export({ format: 'jwk' });
const PUB = '0x04' + Buffer.from(jwk.x, 'base64url').toString('hex') + Buffer.from(jwk.y, 'base64url').toString('hex');
const RP_ID = 'stylussafe.xyz';
const ORIGIN = 'https://stylussafe.xyz';

const factory = new ethers.Contract(FACTORY, [
  'function getAddress(bytes publicKey, address entryPoint, string rpId, string origin) view returns (address)',
  'function createWallet(bytes publicKey, address entryPoint, string rpId, string origin) returns (address)',
], provider);

const sw = await factory['getAddress(bytes,address,string,string)'](PUB, ENTRY, RP_ID, ORIGIN);
const codeBefore = await provider.getCode(sw);
console.log({ sw, codeBefore, FACTORY });

const usdg = new ethers.Contract(USDG, [
  'function mint(address,uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
], wallet);
await (await usdg.mint(sw, ethers.parseUnits('200', 6))).wait();

const accIface = new ethers.Interface(['function executeBatch(address[] dest, uint256[] value, bytes[] func)']);
const poolIface = new ethers.Interface([
  'function getAmountOut(address,address,uint256) view returns (uint256)',
  'function swap(address,address,uint256,uint256,address) returns (uint256)',
]);
const poolC = new ethers.Contract(POOL, poolIface, provider);

const amt = ethers.parseUnits('50', 6);
const expectedWeth = await poolC.getAmountOut(USDG, TOKENS.ETH.address, amt);
console.log('Expected WETH out for 50 USDG:', ethers.formatEther(expectedWeth));

const callData = accIface.encodeFunctionData('executeBatch', [
  [USDG, POOL],
  [0n, 0n],
  [
    usdg.interface.encodeFunctionData('approve', [POOL, amt]),
    poolIface.encodeFunctionData('swap', [USDG, TOKENS.ETH.address, amt, 0n, sw]),
  ],
]);

const initCode = codeBefore === '0x'
  ? (FACTORY + factory.interface.encodeFunctionData('createWallet', [PUB, ENTRY, RP_ID, ORIGIN]).slice(2))
  : '0x';

const USEROP_TUPLE = 'tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature)';
const ep = new ethers.Contract(ENTRY, [
  `function getUserOpHash(${USEROP_TUPLE}) view returns (bytes32)`,
  `function handleOps(${USEROP_TUPLE}[] ops, address beneficiary)`,
], wallet);

const op = {
  sender: sw,
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
const opHash = await ep.getUserOpHash(op);
const sha256 = (b) => createHash('sha256').update(b).digest();
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const authData = Buffer.concat([sha256(Buffer.from(RP_ID)), Buffer.from([0x05]), Buffer.from([0, 0, 0, 1])]);
const cd = Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: b64url(ethers.getBytes(opHash)), origin: ORIGIN, crossOrigin: false }));
const sig = nodeSign('sha256', Buffer.concat([authData, sha256(cd)]), { key: p256Priv, dsaEncoding: 'ieee-p1363' });
op.signature = ethers.AbiCoder.defaultAbiCoder().encode(['bytes', 'bytes', 'bytes32', 'bytes32'], [authData, cd, sig.subarray(0, 32), sig.subarray(32, 64)]);

const tx = await ep.handleOps([op], wallet.address);
await tx.wait();

const wethC = new ethers.Contract(TOKENS.ETH.address, ['function balanceOf(address) view returns (uint256)'], provider);
const remUsdg = ethers.formatUnits(await usdg.balanceOf(sw), 6);
const gotEth = ethers.formatEther(await wethC.balanceOf(sw));
console.log({ swapTx: tx.hash, remUsdg, gotEth });

writeFileSync(resolve(__dirname, '..', 'deployed_swap_addresses.json'), JSON.stringify({
  network: 'arbitrum-sepolia',
  chainId: 421614,
  swapPool: POOL,
  tokens: TOKENS,
  verifiedSwapTx: tx.hash,
  deployedAt: new Date().toISOString(),
}, null, 2));
console.log('Wrote contracts/deployed_swap_addresses.json');

