const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

async function main() {
    const res = await fetch('https://api-sepolia.arbiscan.io/api?module=account&action=txlist&address=0x671fAcC3a791781112F88245C38dC15155fa8ab2&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=YourApiKeyToken');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
