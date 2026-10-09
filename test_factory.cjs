const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

const publicClient = createPublicClient({ 
    chain: arbitrumSepolia, 
    transport: http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e') 
});

async function main() {
    const code = await publicClient.getBytecode({ address: '0xe98c353fF883445995021182D918E3577365b284' });
    console.log("Factory code length:", code ? code.length : 0);
}
main().catch(console.error);
