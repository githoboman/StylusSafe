/**
 * deploy_stylus.mjs
 * 
 * Deploys a compiled Stylus WASM contract directly via RPC.
 * Does NOT require cargo-stylus CLI — works on Windows natively.
 * 
 * Stylus deployment is just:
 *  1. eth_sendRawTransaction with the WASM bytecode as calldata to address(0)
 *     using the Arbitrum-specific ArbWasm precompile approach
 *  2. Then activate the program via ArbWasm.activateProgram()
 * 
 * Usage:
 *   node scripts/deploy_stylus.mjs --wasm path/to/contract.wasm
 */

import { ethers } from 'ethers';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { brotliCompressSync, constants } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

const RPC_URL   = 'https://sepolia-rollup.arbitrum.io/rpc';
const PRIV_KEY  = '0xe899838ab3fe9931c0a33cb168e814168ccb88aacc6927be88e8357b41b62ebe';
const WASM_PATH = getArg('--wasm') ?? join(__dirname, '..', 'target', 'wasm32-unknown-unknown', 'release', 'stylus_safe.wasm');

// Arbitrum precompile addresses
const ARB_WASM          = '0x0000000000000000000000000000000000000071';
const ARB_WASM_CACHE    = '0x0000000000000000000000000000000000000072';

const ARB_WASM_ABI = [
  'function activateProgram(address program) external payable returns (uint16 version, uint256 dataFee)',
  'function programVersion(address program) external view returns (uint16)',
  'function stylusVersion() external view returns (uint16)',
];

async function main() {
  console.log('🦀 StylusSafe WASM Deployment (direct RPC)');
  console.log('═══════════════════════════════════════════');

  // Resolve WASM file
  const wasmPath = resolve(WASM_PATH);
  
  // Try multiple possible locations
  const candidates = [
    wasmPath,
    join(__dirname, '..', 'target', 'wasm32-unknown-unknown', 'release', 'stylus_safe.wasm'),
    join('C:\\t', 'wasm32-unknown-unknown', 'release', 'stylus_safe.wasm'),
    join('C:\\t', 'wasm32-unknown-unknown', 'release', 'stylus-safe.wasm'),
  ];

  let wasmBytes = null;
  let foundPath = null;
  for (const p of candidates) {
    if (existsSync(p)) {
      wasmBytes = readFileSync(p);
      foundPath = p;
      break;
    }
  }

  if (!wasmBytes) {
    console.error('❌ WASM file not found. Searched:');
    candidates.forEach(c => console.error('  -', c));
    console.error('\nRun first: cargo build --manifest-path contracts/Cargo.toml --release --target wasm32-unknown-unknown');
    process.exit(1);
  }

  console.log(`✅ WASM found: ${foundPath}`);
  console.log(`   Size: ${(wasmBytes.length / 1024).toFixed(1)} KB`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIV_KEY, provider);
  const balance  = await provider.getBalance(wallet.address);

  console.log(`\nDeployer : ${wallet.address}`);
  console.log(`Balance  : ${ethers.formatEther(balance)} ETH`);
  console.log(`Network  : Arbitrum Sepolia (chainId 421614)`);

  if (balance < ethers.parseEther('0.001')) {
    console.error('\n❌ Need at least 0.001 ETH on Arbitrum Sepolia.');
    console.error('   Faucet: https://www.alchemy.com/faucets/arbitrum-sepolia');
    process.exit(1);
  }

  // Step 1: Deploy WASM bytecode
  // 1. Brotli compress the WASM
  console.log('\n📦 Compressing WASM using Brotli (Level 11)...');
  const compressedWasm = brotliCompressSync(wasmBytes, {
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY
  });
  console.log(`   Compressed size: ${(compressedWasm.length / 1024).toFixed(1)} KB`);

  // 2. Prefix with EOF magic bytes for Stylus (0xEFF00000)
  const STYLUS_MAGIC = Buffer.from('eff00000', 'hex');
  const runtimeCode = Buffer.concat([STYLUS_MAGIC, compressedWasm]);

  // 3. Construct EVM Init Code to return the runtime code
  // 61 <len_high> <len_low> 80 60 0c 60 00 39 60 00 f3
  const lenHigh = (runtimeCode.length >> 8) & 0xff;
  const lenLow = runtimeCode.length & 0xff;
  const initCode = Buffer.from([
      0x61, lenHigh, lenLow,
      0x80,
      0x60, 0x0c,
      0x60, 0x00,
      0x39,
      0x60, 0x00,
      0xf3
  ]);
  
  const deployPayload = Buffer.concat([initCode, runtimeCode]);
  console.log(`   Final transaction payload size: ${(deployPayload.length / 1024).toFixed(1)} KB`);

  console.log('\n📤 Step 1: Deploying WASM bytecode...');
  const feeData = await provider.getFeeData();
  
  const deployTx = await wallet.sendTransaction({
    data: '0x' + deployPayload.toString('hex'),
    gasLimit: 15_000_000n,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  });

  console.log(`   Tx hash: ${deployTx.hash}`);
  console.log('   Waiting for confirmation...');
  
  const receipt = await deployTx.wait();
  
  if (!receipt || receipt.status === 0) {
    console.error('❌ Deployment transaction reverted!');
    process.exit(1);
  }
  
  const programAddress = receipt.contractAddress;
  console.log(`\n✅ WASM deployed!`);
  console.log(`   Program address: ${programAddress}`);
  console.log(`   Block: ${receipt.blockNumber}`);

  // Step 2: Activate the program via ArbWasm precompile
  console.log('\n⚡ Step 2: Activating Stylus program...');
  
  const arbWasm = new ethers.Contract(ARB_WASM, ARB_WASM_ABI, wallet);
  
  // Check current Stylus version
  const stylusVersion = await arbWasm.stylusVersion();
  console.log(`   Stylus version: ${stylusVersion}`);
  
  // Get activation data fee estimate
  const [, dataFee] = await arbWasm.activateProgram.staticCall(programAddress, {
    value: ethers.parseEther('0.01'),
  });
  console.log(`   Activation data fee: ${ethers.formatEther(dataFee)} ETH`);

  const activateTx = await arbWasm.activateProgram(programAddress, {
    value: dataFee + ethers.parseEther('0.001'), // Add buffer
    gasLimit: 5_000_000n,
  });

  console.log(`   Activation tx: ${activateTx.hash}`);
  const activateReceipt = await activateTx.wait();

  if (!activateReceipt || activateReceipt.status === 0) {
    console.error('❌ Activation failed! The program may already be active.');
  } else {
    console.log(`✅ Program activated!`);
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           🎉 StylusSafe Deployed to Testnet! 🎉           ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Program Address: ${programAddress}`);
  console.log(`║  Arbiscan: https://sepolia.arbiscan.io/address/${programAddress}`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n📋 Add to web/.env.local:');
  console.log(`   NEXT_PUBLIC_WASM_IMPL_ADDRESS=${programAddress}`);
}

main().catch(err => {
  console.error('\n❌ Deployment error:', err.message ?? err);
  process.exit(1);
});
