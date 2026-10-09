const { createPublicClient, http, encodeFunctionData, concat } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

const publicClient = createPublicClient({ 
    chain: arbitrumSepolia, 
    transport: http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e') 
});

async function main() {
    console.log("Checking if implementation is initialized...");
    try {
        const result = await publicClient.readContract({
            address: '0x671fAcC3a791781112F88245C38dC15155fa8ab2',
            abi: [{ type: 'function', name: 'entry_point', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' }],
            functionName: 'entry_point',
        });
        console.log("Entry point on impl:", result);
    } catch (e) {
        console.error("Failed:", e.message);
    }
}
main().catch(console.error);
