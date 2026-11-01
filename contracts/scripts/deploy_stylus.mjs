/**
 * deploy_stylus.mjs
 *
 * Deploys a compiled Stylus WASM contract (supports both single-contract and
 * multi-chunk `0xEFF002` EOF root programs when compressed size > 24KB) and
 * activates it via the Arbitrum `ArbWasm` precompile (`0x71`).
 *
 * Reads credentials from environment variables or git-ignored `secret.txt`.
 */

import { ethers } from 'ethers';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { brotliCompressSync, constants } from 'zlib';
import { loadLocalSecrets, getRequiredSecret } from './env_loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadLocalSecrets();

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

const RPC_URL   = getArg('--rpc') ?? (process.env.ALCHEMY_API_KEY ? `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : (process.env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc'));
const PRIV_KEY  = getArg('--key') ?? getRequiredSecret('DEPLOYER_PRIVATE_KEY', ['PRIVATE_KEY', 'STYLUS_DEPLOYER_PRIVATE_KEY']);
const WASM_PATH = getArg('--wasm') ?? join(__dirname, '..', 'target', 'wasm32-unknown-unknown', 'release', 'stylus_safe.wasm');

const ARB_WASM = '0x0000000000000000000000000000000000000071';
const ARB_WASM_ABI = [
  'function activateProgram(address program) external payable returns (uint16 version, uint256 dataFee)',
  'function programVersion(address program) external view returns (uint16)',
  'function stylusVersion() external view returns (uint16)',
];

/**
 * Wraps runtime bytecode in standard 43-byte EVM initcode:
 *   PUSH32 <runtimeLen> | DUP1 | PUSH1 0x2b | PUSH1 0x00 | CODECOPY | PUSH1 0x00 | RETURN | 0x00
 */
function wrapInEvmInitCode(runtimeCode) {
  const header = Buffer.alloc(43, 0);
  header[0] = 0x7f; // PUSH32
  header.writeUInt32BE(runtimeCode.length, 29); // last 4 bytes of 32-byte word (indices 29..32)
  header[33] = 0x80; // DUP1
  header[34] = 0x60; header[35] = 0x2b; // PUSH1 43
  header[36] = 0x60; header[37] = 0x00; // PUSH1 0
  header[38] = 0x39; // CODECOPY
  header[39] = 0x60; header[40] = 0x00; // PUSH1 0
  header[41] = 0xf3; // RETURN
  header[42] = 0x00; // STOP padding
  return Buffer.concat([header, runtimeCode]);
}

async function deployRawContract(wallet, provider, runtimeCode, label) {
  const payload = wrapInEvmInitCode(runtimeCode);
  const feeData = await provider.getFeeData();
  const tx = await wallet.sendTransaction({
    data: '0x' + payload.toString('hex'),
    maxFeePerGas: (feeData.maxFeePerGas ?? 100_000_000n) * 2n,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 10_000_000n,
    gasLimit: 15_000_000n,
  });
  console.log(`   [${label}] Tx Hash: ${tx.hash}`);
  const receipt = await tx.wait();
  if (!receipt || receipt.status === 0) {
    throw new Error(`${label} deployment reverted!`);
  }
  console.log(`   [${label}] Deployed at: ${receipt.contractAddress} (${runtimeCode.length} bytes)`);
  return receipt.contractAddress;
}

async function main() {
  console.log('🦀 StylusSafe WASM Deployment (Arbitrum Sepolia)');
  console.log('════════════════════════════════════════════════');

  const wasmPath = resolve(WASM_PATH);
  if (!existsSync(wasmPath)) {
    console.error(`❌ WASM file not found at ${wasmPath}`);
    process.exit(1);
  }

  const wasmBytes = readFileSync(wasmPath);
  console.log(`✅ WASM found: ${wasmPath} (${(wasmBytes.length / 1024).toFixed(1)} KB)`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIV_KEY, provider);
  const balance  = await provider.getBalance(wallet.address);

  console.log(`Deployer : ${wallet.address}`);
  console.log(`Balance  : ${ethers.formatEther(balance)} ETH`);

  // Brotli-11 compress
  console.log('\n📦 Compressing WASM using Brotli (Level 11)...');
  const compressedWasm = brotliCompressSync(wasmBytes, {
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
  });
  console.log(`   Compressed size: ${compressedWasm.length} bytes (${(compressedWasm.length / 1024).toFixed(1)} KB)`);

  let programAddress;
  const MAX_SINGLE_RUNTIME = 24_572; // 24576 - 4 bytes magic

  if (compressedWasm.length <= MAX_SINGLE_RUNTIME) {
    const runtimeCode = Buffer.concat([Buffer.from('eff00000', 'hex'), compressedWasm]);
    programAddress = await deployRawContract(wallet, provider, runtimeCode, 'SingleProgram');
  } else {
    // Split into <= 24,573 byte chunks (each prefixed with 0xEFF001, max 24,576 bytes total)
    const MAX_CHUNK_DATA = 24_573;
    const chunkAddresses = [];
    for (let offset = 0, idx = 1; offset < compressedWasm.length; offset += MAX_CHUNK_DATA, idx++) {
      const slice = compressedWasm.slice(offset, offset + MAX_CHUNK_DATA);
      const chunkRuntime = Buffer.concat([Buffer.from('eff001', 'hex'), slice]);
      const addr = await deployRawContract(wallet, provider, chunkRuntime, `Chunk #${idx}`);
      chunkAddresses.push(addr);
    }

    // Build root pointer contract: 0xEFF00200 + u16BE(numChunks) + 0x1980 + 20-byte addresses
    const rootHeader = Buffer.alloc(8);
    rootHeader[0] = 0xef;
    rootHeader[1] = 0xf0;
    rootHeader[2] = 0x02;
    rootHeader[3] = 0x00;
    rootHeader.writeUInt16BE(chunkAddresses.length, 4);
    rootHeader[6] = 0x19;
    rootHeader[7] = 0x80;

    const addrBuffers = chunkAddresses.map(a => Buffer.from(a.slice(2), 'hex'));
    const rootRuntime = Buffer.concat([rootHeader, ...addrBuffers]);
    programAddress = await deployRawContract(wallet, provider, rootRuntime, 'RootProgram');
  }

  console.log(`\n⚡ Step 2: Activating Stylus program ${programAddress} via ArbWasm...`);
  const arbWasm = new ethers.Contract(ARB_WASM, ARB_WASM_ABI, wallet);
  const stylusVersion = await arbWasm.stylusVersion();
  console.log(`   ArbWasm Stylus version: ${stylusVersion}`);

  const [ver, dataFee] = await arbWasm.activateProgram.staticCall(programAddress, {
    value: ethers.parseEther('0.005'),
  });
  console.log(`   StaticCall activateProgram succeeded! Version=${ver}, DataFee=${ethers.formatEther(dataFee)} ETH`);

  const activateTx = await arbWasm.activateProgram(programAddress, {
    value: dataFee + (dataFee / 5n) + ethers.parseEther('0.0002'),
    gasLimit: 12_000_000n,
  });
  console.log(`   Activation tx: ${activateTx.hash}`);
  const activateReceipt = await activateTx.wait();
  if (!activateReceipt || activateReceipt.status === 0) {
    throw new Error('Activation transaction reverted!');
  }
  console.log(`✅ Stylus WASM Program Activated! Address: ${programAddress}`);
}

main().catch(err => {
  console.error('\n❌ Deployment error:', err.shortMessage ?? err.message ?? err);
  process.exit(1);
});
