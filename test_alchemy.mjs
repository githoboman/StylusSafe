import fs from 'fs';

async function testAlchemyBundler() {
    const URL = 'https://api.pimlico.io/v2/421614/rpc?apikey=public';
    const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
    
    console.log("Sending eth_supportedEntryPoints...");
    const resp = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'pm_sponsorUserOperation',
            params: [{
                sender: '0xa73500a7d7e2b43a4331c1Cb2EabD7f1859b6717',
                nonce: '0x0',
                initCode: '0x',
                callData: '0x',
                callGasLimit: '0x7A120',
                verificationGasLimit: '0x30D40',
                preVerificationGas: '0xC350',
                maxFeePerGas: '0x5F5E100',
                maxPriorityFeePerGas: '0x5F5E100',
                paymasterAndData: '0x',
                signature: '0x',
            }, ENTRY_POINT],
        }),
    });
    
    console.log(`Status: ${resp.status}`);
    const json = await resp.text();
    console.log(`Response: ${json}`);
}

testAlchemyBundler().catch(console.error);
