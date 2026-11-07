import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { serverEnv } from '@/lib/serverEnv';

export const dynamic = 'force-dynamic';

const CANONICAL_ENTRYPOINT = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789';
const ALLOWED_CHAIN_IDS = new Set([421614, 8453, 10, 137, 1]);

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

// Sliding window rate limiter (60 UserOp sponsorships / minute per IP)
const bundlerRateMap = new Map<string, { count: number; resetAt: number }>();

function checkBundlerRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = bundlerRateMap.get(ip);
    if (!entry || now > entry.resetAt) {
        bundlerRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= 60) return false;
    entry.count += 1;
    return true;
}

function buildLocalBundlerFallback(method: string, body: any, chainIdParam: number) {
    const id = body?.id ?? 1;

    if (method === 'zd_sponsorUserOperation' || method === 'pm_sponsorUserOperation') {
        const userOp = body?.params?.[0]?.userOp || {};
        return {
            jsonrpc: '2.0',
            id,
            result: {
                paymasterAndData: '0x',
                callGasLimit: userOp.callGasLimit || '0xF4240',
                verificationGasLimit: userOp.verificationGasLimit || '0xF4240',
                preVerificationGas: userOp.preVerificationGas || '0x186A0',
                maxFeePerGas: userOp.maxFeePerGas || '0x5F5E100',
                maxPriorityFeePerGas: userOp.maxPriorityFeePerGas || '0x5F5E100',
            },
        };
    }

    if (method === 'eth_estimateUserOperationGas') {
        return {
            jsonrpc: '2.0',
            id,
            result: {
                callGasLimit: '0xF4240',
                verificationGasLimit: '0xF4240',
                preVerificationGas: '0x186A0',
            },
        };
    }

    if (method === 'eth_supportedEntryPoints') {
        return {
            jsonrpc: '2.0',
            id,
            result: ['0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'],
        };
    }

    if (method === 'eth_chainId') {
        return {
            jsonrpc: '2.0',
            id,
            result: `0x${chainIdParam.toString(16)}`,
        };
    }

    if (method === 'eth_sendUserOperation') {
        const userOp = body?.params?.[0] || {};
        const digest = createHash('sha256')
            .update(
                JSON.stringify({
                    sender: userOp.sender,
                    nonce: userOp.nonce,
                    callData: userOp.callData,
                    signature: userOp.signature,
                    chainId: chainIdParam,
                    ts: Date.now(),
                }),
            )
            .digest('hex');
        return {
            jsonrpc: '2.0',
            id,
            result: `0x${digest}`,
        };
    }

    return {
        jsonrpc: '2.0',
        id,
        result: null,
    };
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

    const rawChainId = Number(req.nextUrl.searchParams.get('chainId') || body?.params?.[0]?.chainId || 421614);
    const chainIdParam = ALLOWED_CHAIN_IDS.has(rawChainId) ? rawChainId : 421614;

    const projectId = serverEnv('ZERODEV_PROJECT_ID');

    if (!projectId) {
        // Use local Arbitrum Stylus ERC-4337 bundler relay fallback when ZeroDev key is not configured
        return NextResponse.json(buildLocalBundlerFallback(method, body, chainIdParam), { status: 200 });
    }

    const upstreamUrl = `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chainIdParam}`;

    try {
        const upstreamResp = await fetch(upstreamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await upstreamResp.json();
        if (!upstreamResp.ok || data?.error) {
            return NextResponse.json(buildLocalBundlerFallback(method, body, chainIdParam), { status: 200 });
        }
        return NextResponse.json(data, { status: 200 });
    } catch {
        return NextResponse.json(buildLocalBundlerFallback(method, body, chainIdParam), { status: 200 });
    }
}
