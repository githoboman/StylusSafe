const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');

function main() {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    console.log("ADDRESS:", account.address);
    console.log("PRIVATE_KEY:", pk);
}

main();
