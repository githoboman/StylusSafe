const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

async function main() {
    const res = await fetch('https://api-sepolia.arbiscan.io/api?module=contract&action=getcontractcreation&contractaddresses=0x671fAcC3a791781112F88245C38dC15155fa8ab2&apikey=YourApiKeyToken');
    const data = await res.json();
    console.log(data);
}
main().catch(console.error);
