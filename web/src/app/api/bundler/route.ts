import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/serverEnv';

export const dynamic = 'force-dynamic';

const CANONICAL_ENTRYPOINT = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789';
const ALLOWED_CHAIN_IDS = new Set([421614]);

const ALLOWED_BUNDLER_METHODS = new Set([
    'zd_sponsorUserOperation',
    'pm_sponsorUserOperation',
    'eth_sendUserOperation',
    'eth_estimateUserOperationGas',
    'eth_getUserOperationReceipt',
    'eth_getUserOperationByHash',
    'eth_supportedEntryPoints',
    'eth_chainId',
]);

// Sliding window rate limiter (30 UserOp sponsorships / minute per IP)
const bundlerRateMap = new Map<string, { count: number; resetAt: number }>();

function checkBundlerRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = bundlerRateMap.get(ip);
    if (!entry || now > entry.resetAt) {
        bundlerRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= 30) return false;
    entry.count += 1;
    return true;
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkBundlerRateLimit(ip)) {
        return NextResponse.json(
            { jsonrpc: '2.0', id: null, error: { code: -32005, message: 'Bundler rate limit exceeded' } },
            { status: 429 }
        );
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON payload' } },
            { status: 400 }
        );
    }

    const method = body?.method;
    if (!method || !ALLOWED_BUNDLER_METHODS.has(method)) {
        return NextResponse.json(
            { jsonrpc: '2.0', id: body?.id ?? null, error: { code: -32601, message: `Disallowed bundler method: ${method}` } },
            { status: 403 }
        );
    }

    // Validate EntryPoint on UserOperation requests to prevent paymaster drainage
    if (method === 'zd_sponsorUserOperation') {
        const ep = body?.params?.[0]?.entryPointAddress?.toLowerCase?.();
        if (ep && ep !== CANONICAL_ENTRYPOINT) {
            return NextResponse.json(
                { jsonrpc: '2.0', id: body?.id ?? null, error: { code: -32602, message: 'Unsupported EntryPoint address' } },
                { status: 400 }
            );
        }
    } else if (method === 'eth_sendUserOperation' || method === 'eth_estimateUserOperationGas') {
        const ep = body?.params?.[1]?.toLowerCase?.();
        if (ep && ep !== CANONICAL_ENTRYPOINT) {
            return NextResponse.json(
                { jsonrpc: '2.0', id: body?.id ?? null, error: { code: -32602, message: 'Unsupported EntryPoint address' } },
                { status: 400 }
            );
        }
    }

    const chainIdParam = Number(req.nextUrl.searchParams.get('chainId') || body?.params?.[0]?.chainId || 421614);
    if (!ALLOWED_CHAIN_IDS.has(chainIdParam)) {
        return NextResponse.json(
            { jsonrpc: '2.0', id: body?.id ?? null, error: { code: -32602, message: `Unsupported chainId ${chainIdParam}` } },
            { status: 400 }
        );
    }
    const projectId = serverEnv('ZERODEV_PROJECT_ID');

    if (!projectId) {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: body?.id ?? null,
                error: { code: -32000, message: 'ZERODEV_PROJECT_ID is not configured on the server' },
            },
            { status: 500 }
        );
    }

    const upstreamUrl = `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chainIdParam}`;

    try {
        const upstreamResp = await fetch(upstreamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await upstreamResp.json();
        return NextResponse.json(data, { status: upstreamResp.status });
    } catch (err: any) {
        return NextResponse.json(
            { jsonrpc: '2.0', id: body?.id ?? null, error: { code: -32603, message: err?.message || 'Bundler proxy error' } },
            { status: 502 }
        );
    }
}

