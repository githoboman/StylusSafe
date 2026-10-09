const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

const publicClient = createPublicClient({ 
    chain: arbitrumSepolia, 
    transport: http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e') 
});

async function main() {
    const impl = await publicClient.readContract({
        address: '0xe98c353fF883445995021182D918E3577365b284',
        abi: [{ type: 'function', name: 'implementation', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' }],
        functionName: 'implementation'
    });
    console.log("Implementation address:", impl);
    
    const implCode = await publicClient.getBytecode({ address: impl });
    console.log("Implementation code length:", implCode ? implCode.length : 0);
}
main().catch(console.error);
