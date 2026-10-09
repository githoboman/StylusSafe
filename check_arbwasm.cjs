const { createPublicClient, http, formatEther } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

async function main() {
    const publicClient = createPublicClient({ 
        chain: arbitrumSepolia, 
        transport: http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e') 
    });
    
    try {
        const gasPrice = await publicClient.getGasPrice();
        console.log("Gas Price:", gasPrice);

        // Call ArbWasm precompile at 0x71
        // function stylusVersion(address) -> uint64
        const res = await publicClient.readContract({
            address: '0x0000000000000000000000000000000000000071',
            abi: [{ type: 'function', name: 'stylusVersion', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint64' }], stateMutability: 'view' }],
            functionName: 'stylusVersion',
            args: ['0x0000000000000000000000000000000000000071']
        });
        console.log("Stylus Version:", res);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
main().catch(console.error);
