// Diagnose the on-chain factory / wallet setup for the bundler 400.
const { createPublicClient, http, toFunctionSelector, keccak256, toHex } = require('viem');
const RPC = 'https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e';
const FACTORY = '0xe98c353fF883445995021182D918E3577365b284';
const pc = createPublicClient({ transport: http(RPC) });

(async () => {
  const std = toFunctionSelector('validateUserOp((address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes),bytes32,uint256)');
  const stylus = toFunctionSelector('validateUserOp((address,uint256,bytes,bytes,bytes32,bytes32,bytes32,bytes32,bytes32,bytes,bytes),bytes32,uint256)');
  console.log('EntryPoint calls selector     :', std);
  console.log('lib.rs (B256 fields) exposes  :', stylus);

  const code = await pc.getCode({ address: FACTORY });
  console.log('\nFactory code bytes:', code ? (code.length - 2) / 2 : 0, 'prefix', code && code.slice(0, 10));
  // Try to find PUSH20 addresses embedded in factory bytecode (likely the wallet implementation)
  const addrs = new Set();
  if (code) {
    const re = /73([0-9a-f]{40})/g; let m;
    while ((m = re.exec(code.slice(2).toLowerCase()))) addrs.add('0x' + m[1]);
  }
  console.log('Embedded PUSH20 addresses:', [...addrs]);
  for (const a of addrs) {
    const c = await pc.getCode({ address: a });
    const hex = (c || '0x').toLowerCase();
    console.log(' ', a, 'code', c ? (c.length - 2) / 2 : 0, 'bytes', 'prefix', hex.slice(0, 8),
      '| has std sel:', hex.includes(std.slice(2)), '| has stylus sel:', hex.includes(stylus.slice(2)));
  }

  // Probe common getters
  for (const sig of ['implementation()', 'walletImplementation()', 'entryPoint()', 'accountImplementation()']) {
    try {
      const r = await pc.call({ to: FACTORY, data: toFunctionSelector(sig) });
      console.log(sig, '->', r.data);
    } catch (e) { console.log(sig, '-> revert'); }
  }

  // getAddress with a dummy key
  const dummy = '0x04' + '11'.repeat(64);
  try {
    const r = await pc.readContract({ address: FACTORY, abi: [{ type: 'function', name: 'getAddress', inputs: [{ type: 'bytes' }], outputs: [{ type: 'address' }], stateMutability: 'view' }], functionName: 'getAddress', args: [dummy] });
    console.log('\ngetAddress(dummy) ->', r);
  } catch (e) { console.log('getAddress revert:', e.shortMessage); }
})();
