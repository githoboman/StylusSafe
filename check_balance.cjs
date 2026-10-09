const { createPublicClient, http, formatEther } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

async function main() {
    const publicClient = createPublicClient({ 
        chain: arbitrumSepolia, 
        transport: http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e') 
    });
    const balance = await publicClient.getBalance({ address: '0xFE5759aA7C45421b773E937B7B4aea2E21adD3Fc' });
    console.log("Balance:", formatEther(balance), "ETH");
}
main().catch(console.error);
