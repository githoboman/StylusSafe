const solc = require('solc');
const fs = require('fs');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arbitrumSepolia } = require('viem/chains');

const PRIVATE_KEY = '0xdfa0e0a022620c580f4213d6c83204ccd030dbc2c61f63cfe0454ed38f9db789';

async function main() {
    console.log("Compiling StylusSafeMock.sol...");
    const source = fs.readFileSync('contracts/src/StylusSafeMock.sol', 'utf8');
    
    const input = {
        language: 'Solidity',
        sources: {
            'StylusSafeMock.sol': { content: source }
        },
        settings: {
            outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    const contract = output.contracts['StylusSafeMock.sol']['StylusSafeMock'];
    
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;

    console.log("Deploying mock contract...");
    const account = privateKeyToAccount(PRIVATE_KEY);
    const transport = http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e');
    
    const publicClient = createPublicClient({ chain: arbitrumSepolia, transport });
    const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport });
    
    const hash = await walletClient.deployContract({
        abi,
        bytecode: '0x' + bytecode,
    });
    
    console.log("Tx hash:", hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Deployed Mock Contract Address:", receipt.contractAddress);
    
    // Write the new address to .env.local
    let env = fs.readFileSync('web/.env.local', 'utf8');
    env = env.replace(/NEXT_PUBLIC_WASM_IMPL_ADDRESS=.*/g, 'NEXT_PUBLIC_WASM_IMPL_ADDRESS=' + receipt.contractAddress);
    fs.writeFileSync('web/.env.local', env);
    console.log("Updated web/.env.local");
}

main().catch(console.error);
