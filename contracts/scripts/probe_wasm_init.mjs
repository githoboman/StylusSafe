/**
 * probe_wasm_init.mjs
 *
 * Diagnoses why dynamic arguments in `initialize` / `execute` / `validateUserOp`
 * reverted on the activated Stylus WASM program 0x671fAcC3a791781112F88245C38dC15155fa8ab2.
 */

import { createPublicClient, http, encodeFunctionData, parseAbi } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { loadLocalSecrets } from './env_loader.mjs';

loadLocalSecrets();

const RPC = process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const WASM_IMPL = '0x671fAcC3a791781112F88245C38dC15155fa8ab2';
const FACTORY = '0xe98c353fF883445995021182D918E3577365b284';
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(RPC),
});

async function main() {
  console.log('1. Checking entryPoint() on WASM_IMPL directly:');
  const ep = await client.readContract({
    address: WASM_IMPL,
    abi: parseAbi(['function entryPoint() view returns (address)']),
    functionName: 'entryPoint',
  });
  console.log('   WASM_IMPL.entryPoint() =', ep);

  console.log('\n2. Simulating initialize() directly on WASM_IMPL with empty vs non-empty args:');
  const pubKey65 = '0x04' + '11'.repeat(64);

  for (const [label, pk, rp, orig] of [
    ['all empty', '0x', '', ''],
    ['short strings (<31B), empty bytes', '0x', 'localhost', 'http://localhost'],
    ['short strings (<31B), 4B bytes', '0x11223344', 'localhost', 'http://localhost'],
    ['short strings (<31B), 32B bytes', '0x' + '11'.repeat(32), 'localhost', 'http://localhost'],
    ['short strings (<31B), 65B bytes (>31B!)', pubKey65, 'localhost', 'http://localhost'],
    ['long string (>31B), empty bytes', '0x', 'stylussafe.xyz', 'https://stylussafe-long-domain-name-example.xyz'],
  ]) {
    try {
      const data = encodeFunctionData({
        abi: parseAbi(['function initialize(address entry_point, bytes public_key, string rp_id, string origin)']),
        functionName: 'initialize',
        args: [ENTRY_POINT, pk, rp, orig],
      });
      const res = await client.call({
        to: WASM_IMPL,
        data,
        gas: 5_000_000n,
      });
      console.log(`   [PASS] ${label}:`, res);
    } catch (err) {
      console.log(`   [FAIL] ${label}:`, err.shortMessage || err.message);
    }
  }
}

main().catch(console.error);

