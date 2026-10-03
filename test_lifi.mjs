

async function testLifi() {
    const fromChain = '421614'; // Arb Sepolia
    const toChain = '84532'; // Base Sepolia
    const fromToken = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'; // USDC on Arb Sepolia
    const toToken = '0x0000000000000000000000000000000000000000'; // ETH on Base Sepolia
    const fromAddress = '0xa73500a7d7e2b43a4331c1Cb2EabD7f1859b6717';
    const amount = '1000000'; // 1 USDC

    const url = `https://li.quest/v1/quote?fromChain=${fromChain}&toChain=${toChain}&fromToken=${fromToken}&toToken=${toToken}&fromAmount=${amount}&fromAddress=${fromAddress}`;
    
    console.log("Fetching: " + url);
    const resp = await fetch(url);
    const data = await resp.text();
    console.log(resp.status);
    console.log(data);
}

testLifi().catch(console.error);
