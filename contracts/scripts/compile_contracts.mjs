import solc from 'solc';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const accountSrc = readFileSync(resolve(__dirname, '..', 'StylusSafeAccount.sol'), 'utf8');
const factorySrc = readFileSync(resolve(__dirname, '..', 'StylusSafeFactory.sol'), 'utf8');
const usdgSrc = readFileSync(resolve(__dirname, '..', 'USDG.sol'), 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'StylusSafeAccount.sol': { content: accountSrc },
    'StylusSafeFactory.sol': { content: factorySrc },
    'USDG.sol': { content: usdgSrc },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

console.log('Compiling StylusSafeAccount and StylusSafeFactory with solc...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error('Compilation errors:', errors);
    process.exit(1);
  }
}

const accountContract = output.contracts['StylusSafeAccount.sol']['StylusSafeAccount'];
const factoryContract = output.contracts['StylusSafeFactory.sol']['StylusSafeFactory'];
const usdgContract = output.contracts['USDG.sol']['USDG'];

writeFileSync(resolve(__dirname, '..', 'StylusSafeAccount.bin'), accountContract.evm.bytecode.object, 'utf8');
writeFileSync(resolve(__dirname, '..', 'StylusSafeAccount.json'), JSON.stringify(accountContract.abi, null, 2), 'utf8');

writeFileSync(resolve(__dirname, '..', 'StylusSafeFactory.bin'), factoryContract.evm.bytecode.object, 'utf8');
writeFileSync(resolve(__dirname, '..', 'StylusSafeFactory.json'), JSON.stringify(factoryContract.abi, null, 2), 'utf8');

writeFileSync(resolve(__dirname, '..', 'USDG.bin'), usdgContract.evm.bytecode.object, 'utf8');
writeFileSync(resolve(__dirname, '..', 'USDG.json'), JSON.stringify(usdgContract.abi, null, 2), 'utf8');

console.log('✅ Compilation successful!');
console.log('StylusSafeAccount bytecode:', accountContract.evm.bytecode.object.length / 2, 'bytes');
console.log('StylusSafeFactory bytecode:', factoryContract.evm.bytecode.object.length / 2, 'bytes');
console.log('USDG bytecode:', usdgContract.evm.bytecode.object.length / 2, 'bytes');
