const { createPublicClient, http, encodeFunctionData, concat } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const pubKeyHex = '04c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9';
const pubKeyBytes = `0x${pubKeyHex}`;

const publicClient = createPublicClient({ 
    chain: arbitrumSepolia, 
    transport: http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e') 
});

async function main() {
    console.log("Simulating initialize on Implementation...");
    try {
        const { result } = await publicClient.simulateContract({
            address: '0x671fAcC3a791781112F88245C38dC15155fa8ab2',
            abi: [{ type: 'function', name: 'initialize', inputs: [{ name: 'entryPoint', type: 'address' }, { name: 'publicKey', type: 'bytes' }, { name: 'rpId', type: 'string' }, { name: 'origin', type: 'string' }], outputs: [], stateMutability: 'nonpayable' }],
            functionName: 'initialize',
            args: [ENTRY_POINT, pubKeyBytes, 'localhost', 'http://localhost:3000']
        });
        console.log("Initialize succeeded.");
    } catch (e) {
        console.error("Simulation failed:", e.message);
        if (e.cause) console.error("Cause:", e.cause.message);
    }
}
main().catch(console.error);
