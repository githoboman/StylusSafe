import { NextRequest, NextResponse } from 'next/server';
import { arbitrumSepoliaRpc, PUBLIC_ARB_SEPOLIA_RPC } from '@/lib/serverEnv';

export const dynamic = 'force-dynamic';

const CHAIN_RPCS: Record<number, string> = {
    42161: 'https://arb1.arbitrum.io/rpc',
    8453: 'https://mainnet.base.org',
    10: 'https://mainnet.optimism.io',
    137: 'https://polygon-rpc.com',
    1: 'https://cloudflare-eth.com',
};

const ALLOWED_RPC_METHODS = new Set([
    'eth_chainId',
    'eth_blockNumber',
    'eth_getBalance',
    'eth_getCode',
    'eth_getStorageAt',
    'eth_getTransactionCount',
    'eth_call',
    'eth_estimateGas',
    'eth_gasPrice',
    'eth_maxPriorityFeePerGas',
    'eth_feeHistory',
    'eth_getBlockByNumber',
    'eth_getBlockByHash',
    'eth_getTransactionByHash',
    'eth_getTransactionReceipt',
    'eth_getLogs',
    'eth_sendRawTransaction',
    'net_version',
]);

// Simple in-memory sliding window rate limiter per IP (120 req / minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= 120) return false;
    entry.count += 1;
    return true;
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { jsonrpc: '2.0', id: null, error: { code: -32005, message: 'Rate limit exceeded' } },
            { status: 429 }
        );
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
            { status: 400 }
        );
    }

    const requests = Array.isArray(body) ? body : [body];
    for (const item of requests) {
        if (!item || typeof item.method !== 'string' || !ALLOWED_RPC_METHODS.has(item.method)) {
            return NextResponse.json(
                {
                    jsonrpc: '2.0',
                    id: item?.id ?? null,
                    error: { code: -32601, message: `Method not allowed by proxy: ${item?.method}` },
                },
                { status: 403 }
            );
        }
    }

    const reqChainId = Number(req.nextUrl.searchParams.get('chainId') || 421614);
    const upstreamRpc = reqChainId === 421614
        ? arbitrumSepoliaRpc()
        : (CHAIN_RPCS[reqChainId] || arbitrumSepoliaRpc());

    try {
        const upstreamResp = await fetch(upstreamRpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await upstreamResp.json();
        return NextResponse.json(data, { status: upstreamResp.status });
    } catch (err: any) {
        if (reqChainId === 421614) {
            try {
                const fallbackResp = await fetch(PUBLIC_ARB_SEPOLIA_RPC, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const data = await fallbackResp.json();
                return NextResponse.json(data, { status: fallbackResp.status });
            } catch {
                // fall through to 502 error
            }
        }
        return NextResponse.json(
            { jsonrpc: '2.0', id: body?.id ?? null, error: { code: -32603, message: err?.message || 'Upstream RPC failed' } },
            { status: 502 }
        );
    }
}

