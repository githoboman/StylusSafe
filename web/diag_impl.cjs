const { createPublicClient, http, toFunctionSelector, encodeAbiParameters, parseAbiParameters, hexToString } = require('viem');
const pc = createPublicClient({ transport: http('https://arb-sepolia.g.alchemy.com/v2/alch_DzrpNevAgv3nXQK93so7e') });
const IMPL = '0x671facc3a791781112f88245c38dc15155fa8ab2';
const EP = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

(async () => {
  const code = await pc.getCode({ address: IMPL });
  console.log('impl code bytes', code ? (code.length - 2) / 2 : 0, 'prefix', code && code.slice(0, 8), code && code.startsWith('0xeff000') ? '(Stylus)' : '');
  const args = encodeAbiParameters(
    parseAbiParameters('(address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes),bytes32,uint256'),
    [['0x0000000000000000000000000000000000000001', 0n, '0x', '0x', 0n, 0n, 0n, 0n, 0n, '0x', '0x'], '0x' + '00'.repeat(32), 0n]
  ).slice(2);
  const sels = {
    'validateUserOp std (EntryPoint)': toFunctionSelector('validateUserOp((address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes),bytes32,uint256)'),
    'validateUserOp bytes32 (lib.rs)': toFunctionSelector('validateUserOp((address,uint256,bytes,bytes,bytes32,bytes32,bytes32,bytes32,bytes32,bytes,bytes),bytes32,uint256)'),
    'execute(address,uint256,bytes)': toFunctionSelector('execute(address,uint256,bytes)'),
    'executeBatch(address[],uint256[],bytes[])': toFunctionSelector('executeBatch(address[],uint256[],bytes[])'),
    'execute_batch(address[],uint256[],bytes[])': toFunctionSelector('execute_batch(address[],uint256[],bytes[])'),
    'entryPoint()': toFunctionSelector('entryPoint()'),
  };
  for (const [name, sel] of Object.entries(sels)) {
    const data = name.startsWith('validate') ? sel + args : name.startsWith('entryPoint') ? sel : sel + '00'.repeat(96);
    try {
      const r = await pc.call({ to: IMPL, data, account: EP });
      console.log(`${name.padEnd(45)} ${sel} -> OK ${r.data}`);
    } catch (e) {
      const d = e.cause?.data || e.data || e.details || e.shortMessage;
      let txt = String(d); try { if (/^0x[0-9a-f]+$/i.test(d)) txt = d + ' "' + hexToString(d).replace(/[^\x20-\x7e]/g, '') + '"'; } catch {}
      console.log(`${name.padEnd(45)} ${sel} -> REVERT ${txt}`);
    }
  }
})();
