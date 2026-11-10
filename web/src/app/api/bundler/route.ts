import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { arbitrumSepoliaRpc, PUBLIC_ARB_SEPOLIA_RPC, serverEnv, serverRelayerKey } from '@/lib/serverEnv';

export const dynamic = 'force-dynamic';

const CANONICAL_ENTRYPOINT = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789';
const CANONICAL_ENTRYPOINT_CHECKSUM = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as const;
const ALLOWED_CHAIN_IDS = new Set([421614, 42161, 8453, 10, 137, 1]);

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

const ENTRY_POINT_HANDLE_OPS_ABI = [
    {
        type: 'function',
        name: 'handleOps',
        stateMutability: 'nonpayable',
        inputs: [
            {
                name: 'ops',
                type: 'tuple[]',
                components: [
                    { name: 'sender', type: 'address' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'initCode', type: 'bytes' },
                    { name: 'callData', type: 'bytes' },
                    { name: 'callGasLimit', type: 'uint256' },
                    { name: 'verificationGasLimit', type: 'uint256' },
                    { name: 'preVerificationGas', type: 'uint256' },
                    { name: 'maxFeePerGas', type: 'uint256' },
                    { name: 'maxPriorityFeePerGas', type: 'uint256' },
                    { name: 'paymasterAndData', type: 'bytes' },
                    { name: 'signature', type: 'bytes' },
                ],
            },
            { name: 'beneficiary', type: 'address' },
        ],
        outputs: [],
    },
] as const;

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

/**
 * Self-relaying ERC-4337 bundler execution on Arbitrum Sepolia.
 * Uses the server relayer account to sponsor gas and submit `EntryPoint.handleOps`
 * directly on Arbitrum Sepolia so UserOperations settle on-chain with a real txHash.
 */
async function relayUserOpOnArbitrumSepolia(userOp: any): Promise<{ txHash?: string; error?: string; isPolicyError?: boolean }> {
    const relayerPk = serverRelayerKey();
    if (!relayerPk) {
        return { error: 'Relayer signing key (DEPLOYER_PRIVATE_KEY) is not configured on the server.' };
    }
    if (!userOp?.sender) {
        return { error: 'Missing UserOperation sender address.' };
    }

    const rpcsToTry = Array.from(new Set([arbitrumSepoliaRpc(), PUBLIC_ARB_SEPOLIA_RPC]));
    const account = privateKeyToAccount(relayerPk);
    let lastErr = 'Arbitrum Sepolia relay failed.';

    for (const rpc of rpcsToTry) {
        const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(rpc) });
        const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(rpc) });

        try {
            let initCode = (userOp.initCode || '0x') as `0x${string}`;
            if (initCode !== '0x') {
                const existingCode = await publicClient.getBytecode({ address: userOp.sender as `0x${string}` });
                if (existingCode && existingCode !== '0x') {
                    initCode = '0x';
                }
            }

            const opTuple = {
                sender: userOp.sender as `0x${string}`,
                nonce: BigInt(userOp.nonce || 0),
                initCode,
                callData: (userOp.callData || '0x') as `0x${string}`,
                callGasLimit: BigInt(userOp.callGasLimit || 450_000),
                verificationGasLimit: BigInt(userOp.verificationGasLimit || 700_000),
                preVerificationGas: BigInt(userOp.preVerificationGas || 60_000),
                maxFeePerGas: BigInt(userOp.maxFeePerGas || 0),
                maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas || 0),
                paymasterAndData: (userOp.paymasterAndData || '0x') as `0x${string}`,
                signature: (userOp.signature || '0x') as `0x${string}`,
            };

            await publicClient.simulateContract({
                account,
                address: CANONICAL_ENTRYPOINT_CHECKSUM,
                abi: ENTRY_POINT_HANDLE_OPS_ABI,
                functionName: 'handleOps',
                args: [[opTuple], account.address],
            });

            const txHash = await walletClient.writeContract({
                address: CANONICAL_ENTRYPOINT_CHECKSUM,
                abi: ENTRY_POINT_HANDLE_OPS_ABI,
                functionName: 'handleOps',
                args: [[opTuple], account.address],
            });

            await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 25_000 }).catch(() => null);
            return { txHash };
        } catch (err: any) {
            const msg = String(err?.shortMessage || err?.message || 'EntryPoint handleOps failed');
            lastErr = msg;
            // On smart-contract revert or validation revert, don't retry on another RPC
            if (
                msg.includes('PerTxLimitExceeded') ||
                msg.includes('DailyLimitExceeded') ||
                msg.includes('TargetNotAllowed') ||
                msg.includes('SessionExpired')
            ) {
                return { error: `On-chain Agent Firewall blocked UserOp: ${msg}`, isPolicyError: true };
            }
            if (msg.includes('AA') || msg.includes('revert') || msg.includes('execution reverted')) {
                return { error: msg };
            }
            // Otherwise try fallback RPC (e.g. ENOTFOUND / timeout)
        }
    }

    return { error: lastErr };
}

async function handleArbitrumSepoliaBundler(method: string, body: any) {
    const id = body?.id ?? 1;

    if (method === 'zd_sponsorUserOperation' || method === 'pm_sponsorUserOperation') {
        const userOp = body?.params?.[0]?.userOp || {};
        return {
            jsonrpc: '2.0',
            id,
            result: {
                paymasterAndData: '0x',
                callGasLimit: userOp.callGasLimit || '0x6DDD0',
                verificationGasLimit: userOp.verificationGasLimit || '0xAAE60',
                preVerificationGas: userOp.preVerificationGas || '0xEA60',
                maxFeePerGas: '0x0',
                maxPriorityFeePerGas: '0x0',
            },
        };
    }

    if (method === 'eth_estimateUserOperationGas') {
        return {
            jsonrpc: '2.0',
            id,
            result: {
                callGasLimit: '0x6DDD0',
                verificationGasLimit: '0xAAE60',
                preVerificationGas: '0xEA60',
            },
        };
    }

    if (method === 'eth_supportedEntryPoints') {
        return {
            jsonrpc: '2.0',
            id,
            result: [CANONICAL_ENTRYPOINT_CHECKSUM],
        };
    }

    if (method === 'eth_chainId') {
        return {
            jsonrpc: '2.0',
            id,
            result: '0x66eee', // 421614
        };
    }

    if (method === 'eth_getUserOperationReceipt' || method === 'eth_getUserOperationByHash') {
        const hash = body?.params?.[0] as `0x${string}` | undefined;
        if (!hash) {
            return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing transaction / UserOp hash' } };
        }
        const client = createPublicClient({ chain: arbitrumSepolia, transport: http(PUBLIC_ARB_SEPOLIA_RPC) });
        const receipt = await client.getTransactionReceipt({ hash }).catch(() => null);
        return {
            jsonrpc: '2.0',
            id,
            result: receipt
                ? {
                      userOpHash: hash,
                      success: receipt.status === 'success',
                      receipt,
                  }
                : null,
        };
    }

    if (method === 'eth_sendUserOperation') {
        const userOp = body?.params?.[0] || {};
        const relayed = await relayUserOpOnArbitrumSepolia(userOp);
        if (relayed.txHash) {
            return { jsonrpc: '2.0', id, result: relayed.txHash };
        }
        return {
            jsonrpc: '2.0',
            id,
            error: {
                code: -32500,
                message: relayed.error || 'Arbitrum Sepolia EntryPoint.handleOps relay failed.',
            },
        };
    }

    return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unsupported bundler method: ${method}` },
    };
}

function resolveUpstreamBundlerUrl(chainId: number): string | null {
    const explicit = serverEnv('BUNDLER_RPC_URL');
    if (explicit) return explicit.includes('{chainId}') ? explicit.replace('{chainId}', String(chainId)) : explicit;
    const pimlicoKey = serverEnv('PIMLICO_API_KEY');
    if (pimlicoKey) return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${pimlicoKey}`;
    const projectId = serverEnv('ZERODEV_PROJECT_ID');
    if (projectId) return `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chainId}`;
    return null;
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

    // On Arbitrum Sepolia (421614), relay UserOperations directly via EntryPoint.handleOps.
    if (chainIdParam === 421614) {
        return NextResponse.json(await handleArbitrumSepoliaBundler(method, body), { status: 200 });
    }

    const upstreamUrl = resolveUpstreamBundlerUrl(chainIdParam);
    if (!upstreamUrl) {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: body?.id ?? null,
                error: {
                    code: -32000,
                    message: `No ERC-4337 bundler configured for chain ${chainIdParam}. Set BUNDLER_RPC_URL, PIMLICO_API_KEY, or ZERODEV_PROJECT_ID.`,
                },
            },
            { status: 503 }
        );
    }

    try {
        const upstreamResp = await fetch(upstreamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await upstreamResp.json();
        return NextResponse.json(data, { status: upstreamResp.ok ? 200 : upstreamResp.status });
    } catch (err: any) {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: body?.id ?? null,
                error: {
                    code: -32603,
                    message: err?.message || `Upstream ERC-4337 bundler unreachable for chain ${chainIdParam}.`,
                },
            },
            { status: 502 }
        );
    }
}
