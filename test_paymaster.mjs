import { createPublicClient, http, encodeFunctionData, concat } from 'viem';

const FACTORY = '0xe98c353fF883445995021182D918E3577365b284';
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const pubKeyHex = '04c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9';
const pubKeyBytes = `0x${pubKeyHex}`;

const deployCallData = encodeFunctionData({
    abi: [{ type: 'function', name: 'createWallet', inputs: [{ name: 'publicKey', type: 'bytes' }, { name: 'entryPoint', type: 'address' }, { name: 'rpId', type: 'string' }, { name: 'origin', type: 'string' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'nonpayable' }],
    functionName: 'createWallet',
    args: [pubKeyBytes, ENTRY_POINT, 'localhost', 'http://localhost:3000']
});

const initCode = concat([FACTORY, deployCallData]);

const publicClient = createPublicClient({ chain: { id: 421614 } as any, transport: http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e') });

async function main() {
    const sender = await publicClient.readContract({
        address: FACTORY,
        abi: [{ type: 'function', name: 'getWalletAddress', inputs: [{ name: 'publicKey', type: 'bytes' }, { name: 'entryPoint', type: 'address' }, { name: 'rpId', type: 'string' }, { name: 'origin', type: 'string' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' }],
        functionName: 'getWalletAddress',
        args: [pubKeyBytes, ENTRY_POINT, 'localhost', 'http://localhost:3000']
    });

    const userOp = {
        sender,
        nonce: "0x0",
        initCode: initCode,
        callData: "0x",
        callGasLimit: "0x7A120",
        verificationGasLimit: "0x30D40",
        preVerificationGas: "0xC350",
        maxFeePerGas: "0x5F5E100",
        maxPriorityFeePerGas: "0x5F5E100",
        signature: "0x"
    };

    const projectId = 'a4c657bc-c4dd-4366-9cbf-77ef3fd46ba3';
    const paymasterUrl = `https://rpc.zerodev.app/api/v3/${projectId}/chain/421614`;

    console.log("Sending to paymaster...");
    const pmResp = await fetch(paymasterUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'zd_sponsorUserOperation',
            params: [{ chainId: 421614, userOp, entryPointAddress: ENTRY_POINT }],
        }),
    });

    const body = await pmResp.text();
    console.log("Status:", pmResp.status);
    console.log("Body:", body);
}

main().catch(console.error);
