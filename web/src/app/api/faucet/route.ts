import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseAbi, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { serverEnv, arbitrumSepoliaRpc } from '@/lib/serverEnv';

export const dynamic = 'force-dynamic';

const USDG_ADDRESS = '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' as const;

// One claim per address per hour (best-effort, per server instance)
const lastClaim = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (typeof address !== 'string' || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
    }
    const key = address.toLowerCase();
    const prev = lastClaim.get(key) ?? 0;
    if (Date.now() - prev < 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Faucet already claimed for this address in the last hour' }, { status: 429 });
    }

    const privKey = serverEnv('DEPLOYER_PRIVATE_KEY') ?? serverEnv('PRIVATE_KEY');
    if (!privKey) {
      return NextResponse.json({ error: 'Faucet key not configured on server' }, { status: 500 });
    }

    const account = privateKeyToAccount((privKey.startsWith('0x') ? privKey : `0x${privKey}`) as `0x${string}`);
    const client = createWalletClient({ account, chain: arbitrumSepolia, transport: http(arbitrumSepoliaRpc()) });

    const mintAmount = 1_000n * 1_000_000n; // 1,000 USDG (6 decimals)
    const hash = await client.writeContract({
      address: USDG_ADDRESS,
      abi: parseAbi(['function mint(address to, uint256 amount) external']),
      functionName: 'mint',
      args: [address as `0x${string}`, mintAmount],
    });
    lastClaim.set(key, Date.now());

    return NextResponse.json({ success: true, amount: '1000', symbol: 'USDG', txHash: hash });
  } catch (err: any) {
    console.error('Faucet error:', err?.shortMessage || err?.message);
    return NextResponse.json({ error: err?.shortMessage || 'Faucet mint failed' }, { status: 500 });
  }
}
