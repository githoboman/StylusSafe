const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');

async function main() {
    // V2 API for etherscan: api.arbiscan.io or api-sepolia.arbiscan.io might support it
    // Or we can just fetch the first tx from the address
    const res = await fetch('https://api-sepolia.arbiscan.io/api?module=account&action=txlist&address=0x671fAcC3a791781112F88245C38dC15155fa8ab2&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=YourApiKeyToken');
    const data = await res.json();
    if (data.result && data.result.length > 0) {
        console.log("Deployer Address:", data.result[0].from);
    } else {
        console.log(data);
    }
}
main().catch(console.error);
