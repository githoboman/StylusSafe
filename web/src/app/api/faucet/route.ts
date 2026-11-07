import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { arbitrumSepoliaRpc, serverRelayerKey } from '@/lib/serverEnv';

export const dynamic = 'force-dynamic';

const USDG_ADDRESS = '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' as const;
const USDG_ABI = [
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'mint',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
] as const;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const address = body?.address as string | undefined;
        const requestedAmount = Number(body?.amount || 2500);
        const onlyIfZero = Boolean(body?.onlyIfZero);

        if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
            return NextResponse.json(
                { ok: false, error: 'Valid 0x wallet address required' },
                { status: 400 },
            );
        }

        const relayerPk = serverRelayerKey();
        if (!relayerPk) {
            return NextResponse.json(
                { ok: false, error: 'Server testnet relayer key not configured' },
                { status: 200 },
            );
        }

        const rpc = arbitrumSepoliaRpc();
        const publicClient = createPublicClient({
            chain: arbitrumSepolia,
            transport: http(rpc),
        });

        const currentBal = await publicClient.readContract({
            address: USDG_ADDRESS,
            abi: USDG_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
        });

        if (onlyIfZero && currentBal > 0n) {
            return NextResponse.json({
                ok: true,
                alreadyFunded: true,
                balance: formatUnits(currentBal, 6),
                token: USDG_ADDRESS,
            });
        }

        const clampedAmount = Math.min(Math.max(requestedAmount, 100), 10000);
        const amountUnits = parseUnits(String(clampedAmount), 6);

        const account = privateKeyToAccount(relayerPk);
        const walletClient = createWalletClient({
            account,
            chain: arbitrumSepolia,
            transport: http(rpc),
        });

        const txHash = await walletClient.writeContract({
            address: USDG_ADDRESS,
            abi: USDG_ABI,
            functionName: 'mint',
            args: [address as `0x${string}`, amountUnits],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 25_000 }).catch(() => null);

        const updatedBal = await publicClient
            .readContract({
                address: USDG_ADDRESS,
                abi: USDG_ABI,
                functionName: 'balanceOf',
                args: [address as `0x${string}`],
            })
            .catch(() => currentBal + amountUnits);

        return NextResponse.json({
            ok: true,
            txHash,
            minted: String(clampedAmount),
            balance: formatUnits(updatedBal, 6),
            token: USDG_ADDRESS,
        });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: err?.message || 'Testnet USDG mint failed' },
            { status: 200 },
        );
    }
}
