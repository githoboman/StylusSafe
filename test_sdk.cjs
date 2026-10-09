const { createPublicClient, http, encodeFunctionData, parseAbi, parseAbiParameters, encodeAbiParameters, toHex } = require('viem');
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');
const { arbitrumSepolia } = require('viem/chains');

const FACTORY_ADDRESS = '0x470631018cF36900F2A94b53D37f29C719B51990';
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const PROJECT_ID = 'a4c657bc-c4dd-4366-9cbf-77ef3fd46ba3';
const PAYMASTER_URL = `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/421614`;
const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';

async function main() {
    const pc = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC_URL) });
    
    // 1. Generate Fake WebAuthn Key (P-256)
    // For testing, we just use a random bytes65 public key
    const mockPubKeyBytes = Buffer.concat([Buffer.from([0x04]), Buffer.alloc(64, 1)]);
    const publicKeyHex = '0x' + mockPubKeyBytes.toString('hex');
    
    // 2. Compute Address
    const walletAddress = await pc.readContract({
        address: FACTORY_ADDRESS,
        abi: [{
            type: 'function', name: 'getAddress', inputs: [{ name: 'publicKey', type: 'bytes' }], outputs: [{ name: 'predicted', type: 'address' }], stateMutability: 'view'
        }],
        functionName: 'getAddress',
        args: [publicKeyHex]
    });
    console.log("Computed Wallet Address:", walletAddress);
    
    // 3. Build initCode
    const deployCallData = encodeFunctionData({
        abi: [{ type: 'function', name: 'createWallet', inputs: [{ name: 'publicKey', type: 'bytes' }, { name: 'entryPoint', type: 'address' }, { name: 'rpId', type: 'string' }, { name: 'origin', type: 'string' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'nonpayable' }],
        functionName: 'createWallet',
        args: [publicKeyHex, ENTRY_POINT, 'localhost', 'http://localhost']
    });
    const initCode = FACTORY_ADDRESS + deployCallData.slice(2);
    
    // 4. Build UserOp
    const callData = encodeFunctionData({
        abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
        functionName: 'execute',
        args: [ENTRY_POINT, 0n, '0x']
    });
    
    const userOp = {
        sender: walletAddress,
        nonce: '0x0',
        initCode: initCode,
        callData: callData,
        callGasLimit: '0xF4240',      // 1,000,000
        verificationGasLimit: '0xF4240', // 1,000,000
        preVerificationGas: '0x186A0',   // 100,000
        maxFeePerGas: '0x5F5E100',      // 100 gwei
        maxPriorityFeePerGas: '0x5F5E100',
        paymasterAndData: '0x',
        signature: '0x', // Dummy signature for simulation
    };
    
    console.log("Simulating with ZeroDev...");
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
    console.log(JSON.stringify(json, null, 2));
}
main().catch(console.error);
