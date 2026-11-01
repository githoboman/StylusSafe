import solc from 'solc';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(__dirname, '..', 'StylusSafeFactory.sol');
const source = readFileSync(sourcePath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'StylusSafeFactory.sol': {
      content: source,
    },
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

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error('Compilation errors:', errors);
    process.exit(1);
  }
}

const contract = output.contracts['StylusSafeFactory.sol']['StylusSafeFactory'];
const bytecode = contract.evm.bytecode.object;
const abi = contract.abi;

writeFileSync(resolve(__dirname, '..', 'StylusSafeFactory.bin'), bytecode, 'utf8');
writeFileSync(resolve(__dirname, '..', 'StylusSafeFactory.json'), JSON.stringify(abi, null, 2), 'utf8');

console.log('✅ StylusSafeFactory compiled successfully!');
console.log('Bytecode length:', bytecode.length / 2, 'bytes');

