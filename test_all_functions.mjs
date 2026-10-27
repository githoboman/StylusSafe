import { createPublicClient, http, formatEther, encodeFunctionData } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const FACTORY_ADDRESS = '0x470631018cF36900F2A94b53D37f29C719B51990';
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const PROJECT_ID = 'a4c657bc-c4dd-4366-9cbf-77ef3fd46ba3';
const PAYMASTER_URL = `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/421614`;
const RPC_URL = 'https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e';

async function runAllTests() {
  console.log("=========================================");
  console.log("   STYLUSSAFE FULL FUNCTION SUITE TEST   ");
  console.log("=========================================\n");

  const pc = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC_URL) });

  // TEST 1: Alchemy RPC Connection & Native Balance
  console.log("TEST 1: RPC Connection & Native Token Balance Fetching...");
  try {
    const testWallet = '0xFE5759aA7C45421b773E937B7B4aea2E21adD3Fc';
    const balance = await pc.getBalance({ address: testWallet });
    console.log(`  [PASS] Native Balance for ${testWallet.slice(0, 8)}...: ${formatEther(balance)} USDG`);
  } catch (e) {
    console.error("  [FAIL] RPC connection failed:", e.message);
  }

  // TEST 2: Factory Address Prediction
  console.log("\nTEST 2: Factory CREATE2 Address Prediction...");
  let walletAddress;
  try {
    const mockPubKeyBytes = '0x04' + '11'.repeat(64);
    walletAddress = await pc.readContract({
      address: FACTORY_ADDRESS,
      abi: [{
        type: 'function',
        name: 'getAddress',
        inputs: [{ name: 'publicKey', type: 'bytes' }],
        outputs: [{ name: 'predicted', type: 'address' }],
        stateMutability: 'view'
      }],
      functionName: 'getAddress',
      args: [mockPubKeyBytes]
    });
    console.log(`  [PASS] Deterministic Wallet Address computed: ${walletAddress}`);
  } catch (e) {
    console.error("  [FAIL] Factory getAddress failed:", e.message);
  }

  // TEST 3: Native USDG Transfer Calldata Encoding
  console.log("\nTEST 3: Native USDG Transfer Encoding (execute)...");
  try {
    const recipient = '0x32B391496b592a6e5E2c075091D8cD417673031a';
    const amount = 1000000000000000000n; // 1.0 USDG (18 decimals)
    const nativeCallData = encodeFunctionData({
      abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
      functionName: 'execute',
      args: [recipient, amount, '0x']
    });
    console.log(`  [PASS] Encoded execute(recipient=${recipient.slice(0, 8)}..., value=${amount}, func=0x)`);
    console.log(`  Calldata size: ${nativeCallData.length / 2 - 1} bytes`);
  } catch (e) {
    console.error("  [FAIL] Native transfer encoding failed:", e.message);
  }

  // TEST 4: ERC20 USD Coin Transfer Calldata Encoding
  console.log("\nTEST 4: ERC-20 Token Transfer Encoding (execute)...");
  try {
    const usdcAddress = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
    const recipient = '0x32B391496b592a6e5E2c075091D8cD417673031a';
    const usdcAmount = 5000000n; // 5 USDC (6 decimals)
    const transferFunc = encodeFunctionData({
      abi: [{ constant: false, inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'transfer', outputs: [{ name: '', type: 'bool' }], type: 'function' }],
      functionName: 'transfer',
      args: [recipient, usdcAmount]
    });
    const erc20CallData = encodeFunctionData({
      abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
      functionName: 'execute',
      args: [usdcAddress, 0n, transferFunc]
    });
    console.log(`  [PASS] Encoded execute(token=${usdcAddress.slice(0, 8)}..., value=0, transfer(to=${recipient.slice(0, 8)}..., amount=${usdcAmount}))`);
    console.log(`  Calldata size: ${erc20CallData.length / 2 - 1} bytes`);
  } catch (e) {
    console.error("  [FAIL] ERC20 transfer encoding failed:", e.message);
  }

  // TEST 5: Batch Intent Execution Encoding
  console.log("\nTEST 5: Batch Intent Execution Encoding (executeBatch)...");
  try {
    const dests = ['0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', '0x32B391496b592a6e5E2c075091D8cD417673031a'];
    const values = [0n, 1000000000000000n];
    const funcs = ['0x', '0x'];
    const batchCallData = encodeFunctionData({
      abi: [{ type: 'function', name: 'executeBatch', inputs: [{ name: 'dest', type: 'address[]' }, { name: 'value', type: 'uint256[]' }, { name: 'func', type: 'bytes[]' }], outputs: [], stateMutability: 'nonpayable' }],
      functionName: 'executeBatch',
      args: [dests, values, funcs]
    });
    console.log(`  [PASS] Encoded executeBatch(${dests.length} operations)`);
  } catch (e) {
    console.error("  [FAIL] executeBatch encoding failed:", e.message);
  }

  // TEST 6: ZeroDev Paymaster Gas Sponsorship
  console.log("\nTEST 6: ZeroDev Paymaster Sponsorship API...");
  try {
    const mockPubKeyBytes = '0x04' + '11'.repeat(64);
    const deployCallData = encodeFunctionData({
      abi: [{ type: 'function', name: 'createWallet', inputs: [{ name: 'publicKey', type: 'bytes' }, { name: 'entryPoint', type: 'address' }, { name: 'rpId', type: 'string' }, { name: 'origin', type: 'string' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'nonpayable' }],
      functionName: 'createWallet',
      args: [mockPubKeyBytes, ENTRY_POINT, 'localhost', 'http://localhost']
    });
    const initCode = FACTORY_ADDRESS + deployCallData.slice(2);
    const callData = encodeFunctionData({
      abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
      functionName: 'execute',
      args: [ENTRY_POINT, 0n, '0x']
    });

    const userOp = {
      sender: walletAddress || '0x61e98E5cEbb4d0Ec2624Aab433FCF4815DaF85a8',
      nonce: '0x0',
      initCode: initCode,
      callData: callData,
      callGasLimit: '0xF4240',
      verificationGasLimit: '0xF4240',
      preVerificationGas: '0x186A0',
      maxFeePerGas: '0x5F5E100',
      maxPriorityFeePerGas: '0x5F5E100',
      paymasterAndData: '0x',
      signature: '0x',
    };

    const resp = await fetch(PAYMASTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'zd_sponsorUserOperation',
        params: [{ chainId: 421614, userOp, entryPointAddress: ENTRY_POINT }],
      }),
    });
    const json = await resp.json();
    if (json.result && json.result.paymasterAndData) {
      console.log(`  [PASS] ZeroDev Paymaster sponsored transaction!`);
      console.log(`  paymasterAndData length: ${json.result.paymasterAndData.length / 2 - 1} bytes`);
      console.log(`  callGasLimit: ${json.result.callGasLimit}, verificationGasLimit: ${json.result.verificationGasLimit}`);
    } else {
      console.log(`  [NOTICE] Paymaster response:`, json);
    }
  } catch (e) {
    console.error("  [FAIL] Paymaster sponsorship failed:", e.message);
  }

  console.log("\n=========================================");
  console.log("       ALL FUNCTION TESTS COMPLETED      ");
  console.log("=========================================\n");
}

runAllTests().catch(console.error);
