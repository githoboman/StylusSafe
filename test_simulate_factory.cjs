const { createPublicClient, http, encodeFunctionData, concat } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

const FACTORY = '0xe98c353fF883445995021182D918E3577365b284';
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const pubKeyHex = '04c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9b4c7b8c7e0c7a5f9';
const pubKeyBytes = `0x${pubKeyHex}`;

const publicClient = createPublicClient({ 
    chain: arbitrumSepolia, 
    transport: http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e') 
});

async function main() {
    console.log("Simulating createWallet on Factory...");
    try {
        const { result } = await publicClient.simulateContract({
            address: FACTORY,
            abi: [{ type: 'function', name: 'createWallet', inputs: [{ name: 'publicKey', type: 'bytes' }, { name: 'entryPoint', type: 'address' }, { name: 'rpId', type: 'string' }, { name: 'origin', type: 'string' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'nonpayable' }],
            functionName: 'createWallet',
            args: [pubKeyBytes, ENTRY_POINT, 'localhost', 'http://localhost:3000']
        });
        console.log("Deployment succeeded. Wallet:", result);
    } catch (e) {
        console.error("Simulation failed:", e.message);
        if (e.cause) console.error("Cause:", e.cause.message);
    }
}
main().catch(console.error);
