import fs from 'fs';

async function testBundler() {
    const URL = 'https://rpc.zerodev.app/api/v3/a4c657bc-c4dd-4366-9cbf-77ef3fd46ba3/chain/421614';
    const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
    
    const userOp = {
        sender: '0xa73500a7d7e2b43a4331c1Cb2EabD7f1859b6717',
        nonce: '0x0',
        initCode: '0x', // Just test with 0x first
        callData: '0x',
        callGasLimit: '0x7A120',
        verificationGasLimit: '0x30D40',
        preVerificationGas: '0xC350',
        maxFeePerGas: '0x5F5E100',
        maxPriorityFeePerGas: '0x5F5E100',
        paymasterAndData: '0x',
        signature: '0x',
    };

    console.log("Sending pm_sponsorUserOperation...");
    const pmResp = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'pm_sponsorUserOperation',
            params: [userOp, ENTRY_POINT],
        }),
    });
    
    console.log(`Status: ${pmResp.status}`);
    const pmJson = await pmResp.text();
    console.log(`Response: ${pmJson}`);
}

testBundler().catch(console.error);
