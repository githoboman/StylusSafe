import { useState, useEffect } from 'react';
import {
    createPublicClient,
    http,
    toHex,
    encodeFunctionData,
    formatUnits
} from 'viem';
import {
    bufferToHex,
    hexToUint8Array,
    computeWalletAddress,
    generateP256Keypair,
    encryptPrivateKey,
    decryptPrivateKey,
    getRawPublicKeyBytes,
    sha256
} from './utils';
import { createPublicClient as _createPublicClient, http as _http } from 'viem';
import {
    activateBiometricVaultSession,
    bindWalletToBiometrics,
    findVaultByFaceDescriptor,
    findVaultByHardwareCredentialId,
    getLastVerifiedFaceDescriptor,
    loadVaultRegistry,
} from '@/lib/faceverify/biometricVaultRegistry';
import { SEPOLIA_SWAP_TOKENS, SWAP_POOL_ADDRESS, USDG_ADDRESS } from '@/hooks/useBalances';
import { fetchLifiQuote, fetchLiveTokenPrices, FALLBACK_TOKEN_USD_PRICES } from '@/lib/lifi';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WalletConfig = {
    /** The factory contract's EVM address (e.g. "0x..."). */
    factoryAddress: `0x${string}`;
    /** RPC endpoint for Arbitrum / EVM chain. */
    rpcUrl: string;
    /** The chain ID. */
    chainId: number;
    /** The init code hash of the Stylus Safe implementation */
    initCodeHash: `0x${string}`;
    /** ZeroDev Paymaster URL */
    paymasterUrl: string;
};

export type WebAuthnSignature = {
    /** Uncompressed P-256 public key: 0x04 x y (65 bytes) */
    publicKey: Uint8Array;
    /** Raw authenticatorData bytes from the WebAuthn assertion response */
    authData: Uint8Array;
    /** Raw clientDataJSON bytes */
    clientDataJSON: Uint8Array;
    /** Raw P-256 ECDSA signature: r s (64 bytes) */
    signature: Uint8Array;
};

export type RegisterResult = {
    /** The deterministically computed contract address of the new wallet. */
    walletAddress: string;
};

export type DeployResult = {
    /** The on-chain contract address of the deployed wallet. */
    walletAddress: string;
    alreadyDeployed: boolean;
};

export type BiometricAuthMethod = 'faceid' | 'biometric_prompt' | 'pin';

export type InvisibleWallet = {
    address: string | null;
    isPending: boolean;
    error: string | null;
    hasMounted: boolean;
    register: (username: string, pin?: string, authMethod?: BiometricAuthMethod) => Promise<RegisterResult>;
    deploy: (relayerAccount?: any, publicKeyBytes?: Uint8Array) => Promise<DeployResult>;
    signAuthEntry: (signaturePayload: Uint8Array, pin?: string) => Promise<WebAuthnSignature | null>;
    login: (authMethod?: BiometricAuthMethod) => Promise<void>;
    disconnect: () => void;
    executeCrossChainSwap: (
        arg1: number,
        arg2: number | string,
        arg3: string | bigint,
        arg4: string | `0x${string}`,
        arg5: bigint | `0x${string}`,
        arg6?: `0x${string}` | string,
        arg7?: string
    ) => Promise<{ userOpHash: string } | null>;
    executeAgentSwap: (params: {
        sourceChainId: number;
        destChainId: number;
        fromToken: string;
        toToken: string;
        amount: bigint;
        fromDecimals: number;
        recipient?: `0x${string}`;
    }) => Promise<{ userOpHash: string } | null>;
    sendTransaction: (tokenAddress: `0x${string}` | null, amount: bigint, recipient: `0x${string}`, pin?: string) => Promise<{ userOpHash: string } | null>;
    createSessionKey: (durationHours: number, pin?: string) => Promise<{ sessionKey: string } | null>;
    setAgentPolicy: (params: { sessionKey: `0x${string}`; durationHours: number; maxPerTx: bigint; dailyLimit: bigint; allowedTarget: `0x${string}` }, pin?: string) => Promise<{ userOpHash: string } | null>;
    revokeSessionKey: (pin?: string) => Promise<{ userOpHash: string } | null>;
    setupDCA: (payee: `0x${string}`, amount: bigint, frequencyDays: number, pin?: string) => Promise<{ userOpHash: string } | null>;
    executeIntentBatch: (intents: any[], pin?: string) => Promise<{ userOpHash: string } | null>;
};

// ── Canonical Deployed Addresses on Arbitrum Sepolia (v2 Hardened) ────────────
const CANONICAL_FACTORY = '0xd364b7339099E7633015FD5Cda7e21d4c40833f7' as `0x${string}`;
const CANONICAL_ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as `0x${string}`;
const FALLBACK_PUBLIC_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';

const MAINNET_PUBLIC_RPCS: Record<number, string> = {
    1: 'https://ethereum-rpc.publicnode.com',
    10: 'https://mainnet.optimism.io',
    137: 'https://polygon-rpc.com',
    8453: 'https://mainnet.base.org',
    42161: 'https://arb1.arbitrum.io/rpc',
};

function resolveChainEndpoint(baseUrl: string, targetChainId: number): string {
    if (typeof window !== 'undefined' && baseUrl.startsWith('/')) {
        const sep = baseUrl.includes('?') ? '&' : '?';
        return targetChainId && targetChainId !== 421614
            ? `${window.location.origin}${baseUrl}${sep}chainId=${targetChainId}`
            : `${window.location.origin}${baseUrl}`;
    }
    if (targetChainId && targetChainId !== 421614 && (!baseUrl || baseUrl === FALLBACK_PUBLIC_RPC || baseUrl.includes('sepolia'))) {
        return MAINNET_PUBLIC_RPCS[targetChainId] || baseUrl || FALLBACK_PUBLIC_RPC;
    }
    return baseUrl || FALLBACK_PUBLIC_RPC;
}

const SWAP_POOL_ABI = [
    {
        type: 'function',
        name: 'getAmountOut',
        stateMutability: 'view',
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
        ],
        outputs: [{ name: 'amountOut', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'swap',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'minAmountOut', type: 'uint256' },
            { name: 'recipient', type: 'address' },
        ],
        outputs: [{ name: 'amountOut', type: 'uint256' }],
    },
] as const;

const ERC20_SWAP_ABI = [
    {
        type: 'function',
        name: 'approve',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        type: 'function',
        name: 'transfer',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        type: 'function',
        name: 'allowance',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

const ACCOUNT_EXEC_ABI = [
    {
        type: 'function',
        name: 'execute',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'dest', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'func', type: 'bytes' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'executeBatch',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'dest', type: 'address[]' },
            { name: 'value', type: 'uint256[]' },
            { name: 'func', type: 'bytes[]' },
        ],
        outputs: [],
    },
] as const;

function resolveSepoliaSwapToken(tokenOrAddr: string): { symbol: string; address: `0x${string}`; decimals: number } | null {
    const trimmed = tokenOrAddr.trim();
    const upper = trimmed.toUpperCase();
    const bySym = (SEPOLIA_SWAP_TOKENS as Record<string, { address: `0x${string}`; decimals: number }>)[upper];
    if (bySym) return { symbol: upper, address: bySym.address, decimals: bySym.decimals };
    const lower = trimmed.toLowerCase();
    for (const [sym, info] of Object.entries(SEPOLIA_SWAP_TOKENS)) {
        if (info.address.toLowerCase() === lower) {
            return { symbol: sym, address: info.address, decimals: info.decimals };
        }
    }
    return null;
}

async function buildCrossChainSwapCallData(params: {
    currentAddress: `0x${string}`;
    sourceChainId: number;
    destChainId: number;
    fromToken: string;
    toToken: string;
    amount: bigint;
    recipient?: `0x${string}`;
    rpcEndpoint: string;
    tokenDecimalsMap: Record<string, number>;
}): Promise<`0x${string}`> {
    const fromMeta = resolveSepoliaSwapToken(params.fromToken);
    const toMeta = resolveSepoliaSwapToken(params.toToken);
    const fromSymbol = fromMeta?.symbol || params.fromToken.toUpperCase();
    const toSymbol = toMeta?.symbol || params.toToken.toUpperCase();
    const fromDecimals = fromMeta?.decimals ?? params.tokenDecimalsMap[fromSymbol] ?? 6;
    const toDecimals = toMeta?.decimals ?? params.tokenDecimalsMap[toSymbol] ?? 6;
    const fromFloat = Number(formatUnits(params.amount, fromDecimals));

    const liveQuote = await fetchLifiQuote({
        fromChainId: params.sourceChainId,
        toChainId: params.destChainId,
        fromSymbol,
        toSymbol,
        fromDecimals,
        toDecimals,
        amount: fromFloat,
        fromAddress: params.currentAddress,
    }).catch(() => null);

    if (params.sourceChainId !== 421614) {
        if (!liveQuote || liveQuote.indicative || !liveQuote.transactionRequest) {
            throw new Error(`No executable Li.Fi route available for ${fromSymbol} -> ${toSymbol} on chain ${params.sourceChainId}.`);
        }
        const txReq = liveQuote.transactionRequest;
        const txValue = txReq.value ? BigInt(txReq.value) : 0n;
        if (
            liveQuote.approvalAddress &&
            liveQuote.fromTokenAddress &&
            liveQuote.fromTokenAddress.toLowerCase() !== '0x0000000000000000000000000000000000000000'
        ) {
            const approveData = encodeFunctionData({
                abi: ERC20_SWAP_ABI,
                functionName: 'approve',
                args: [liveQuote.approvalAddress, params.amount],
            });
            return encodeFunctionData({
                abi: ACCOUNT_EXEC_ABI,
                functionName: 'executeBatch',
                args: [[liveQuote.fromTokenAddress, txReq.to], [0n, txValue], [approveData, txReq.data]],
            });
        }
        return encodeFunctionData({
            abi: ACCOUNT_EXEC_ABI,
            functionName: 'execute',
            args: [txReq.to, txValue, txReq.data],
        });
    }

    const settlementRecipient = (params.recipient || params.currentAddress) as `0x${string}`;
    if (!fromMeta || !toMeta) {
        throw new Error(`Unsupported swap pair on Arbitrum Sepolia: ${params.fromToken} -> ${params.toToken}.`);
    }

    if (fromMeta.address.toLowerCase() === toMeta.address.toLowerCase()) {
        const transferData = encodeFunctionData({
            abi: ERC20_SWAP_ABI,
            functionName: 'transfer',
            args: [settlementRecipient, params.amount],
        });
        return encodeFunctionData({
            abi: ACCOUNT_EXEC_ABI,
            functionName: 'execute',
            args: [fromMeta.address, 0n, transferData],
        });
    }

    const publicClient = createPublicClient({ chain: { id: 421614 } as any, transport: http(params.rpcEndpoint) });
    const expectedOut = await publicClient.readContract({
        address: SWAP_POOL_ADDRESS,
        abi: SWAP_POOL_ABI,
        functionName: 'getAmountOut',
        args: [fromMeta.address, toMeta.address, params.amount],
    }) as bigint;

    if (expectedOut <= 0n) {
        throw new Error(`SwapPool returned 0 output for ${fromFloat} ${fromMeta.symbol} -> ${toMeta.symbol}.`);
    }
    const minAmountOut = (expectedOut * 98n) / 100n;
    const approveData = encodeFunctionData({
        abi: ERC20_SWAP_ABI,
        functionName: 'approve',
        args: [SWAP_POOL_ADDRESS, params.amount],
    });
    const swapData = encodeFunctionData({
        abi: SWAP_POOL_ABI,
        functionName: 'swap',
        args: [fromMeta.address, toMeta.address, params.amount, minAmountOut, settlementRecipient],
    });
    return encodeFunctionData({
        abi: ACCOUNT_EXEC_ABI,
        functionName: 'executeBatch',
        args: [[fromMeta.address, SWAP_POOL_ADDRESS], [0n, 0n], [approveData, swapData]],
    });
}

function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Offline fallback only; overwritten with live DeFiLlama prices by refreshTokenPrices().
const TOKEN_USD_PRICES: Record<string, number> = { ...FALLBACK_TOKEN_USD_PRICES };

/** Fetches live USD prices and updates the shared table; silently keeps fallback on failure. */
export async function refreshTokenPrices(): Promise<Record<string, number>> {
    const { prices } = await fetchLiveTokenPrices();
    Object.assign(TOKEN_USD_PRICES, prices);
    return TOKEN_USD_PRICES;
}

const TOKEN_DECIMALS: Record<string, number> = {
    USDG: 6,
    USDC: 6,
    USDT: 6,
    ETH: 18,
    ARB: 18,
    DEGEN: 18,
    UNI: 18,
    WBTC: 8,
};

export function useInvisibleWallet(config: Partial<WalletConfig> = {}): InvisibleWallet {
    const defaultFactory = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || process.env.EXPO_PUBLIC_FACTORY_ADDRESS || CANONICAL_FACTORY) as `0x${string}`;
    const defaultRpc = process.env.NEXT_PUBLIC_RPC_URL || process.env.EXPO_PUBLIC_RPC_URL || '/api/rpc';
    const defaultBundler = process.env.NEXT_PUBLIC_ZERODEV_BUNDLER_URL || process.env.EXPO_PUBLIC_ZERODEV_BUNDLER_URL || '/api/bundler';
    const defaultPaymaster = process.env.NEXT_PUBLIC_ZERODEV_PAYMASTER_URL || process.env.EXPO_PUBLIC_ZERODEV_PAYMASTER_URL || defaultBundler;

    const { 
        factoryAddress = defaultFactory,
        rpcUrl = defaultRpc, 
        chainId = 421614, 
        initCodeHash = '0x0000000000000000000000000000000000000000' as `0x${string}`, 
        paymasterUrl = defaultPaymaster
    } = config;

    const [address, setAddress] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('invisible_wallet_address') ?? null;
        }
        return null;
    });
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    const resolveRpcEndpoint = (url: string) => {
        if (typeof window !== 'undefined' && url.startsWith('/')) {
            return `${window.location.origin}${url}`;
        }
        return url || FALLBACK_PUBLIC_RPC;
    };

    const ensureTestnetUsdgFunded = async (walletAddr: string, amount = 2500, onlyIfZero = true) => {
        if (typeof window === 'undefined' || !walletAddr) return;
        try {
            await fetch('/api/faucet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: walletAddr,
                    amount,
                    onlyIfZero,
                }),
            });
            window.dispatchEvent(new CustomEvent('stylussafe-balance-updated'));
        } catch {
            // ignore background faucet errors
        }
    };

    const resolveCanonicalAddress = async (pubHex: string): Promise<{ walletAddress: string; rpId: string; origin: string }> => {
        const storedRpId = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_rp_id') : null;
        const storedOrigin = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_origin') : null;
        const currentRpId = storedRpId || (typeof window !== 'undefined' ? window.location.hostname : 'stylussafe.xyz');
        const currentOrigin = storedOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://stylussafe.xyz');

        try {
            const liveRpc = resolveRpcEndpoint(rpcUrl);
            const pc = _createPublicClient({ transport: _http(liveRpc) });
            const predicted = await pc.readContract({
                address: factoryAddress,
                abi: [{
                    type: 'function',
                    name: 'getAddress',
                    inputs: [
                        { name: 'publicKey', type: 'bytes' },
                        { name: 'entryPoint', type: 'address' },
                        { name: 'rpId', type: 'string' },
                        { name: 'origin', type: 'string' }
                    ],
                    outputs: [{ name: 'predicted', type: 'address' }],
                    stateMutability: 'view'
                }],
                functionName: 'getAddress',
                args: [`0x${pubHex.replace(/^0x/, '')}`, CANONICAL_ENTRY_POINT, currentRpId, currentOrigin]
            }) as string;
            if (typeof window !== 'undefined') {
                localStorage.setItem('invisible_wallet_rp_id', currentRpId);
                localStorage.setItem('invisible_wallet_origin', currentOrigin);
                localStorage.setItem('invisible_wallet_factory_addr', factoryAddress);
            }
            return { walletAddress: predicted, rpId: currentRpId, origin: currentOrigin };
        } catch {
            const pubBytes = hexToUint8Array(pubHex.replace(/^0x/, ''));
            const fallbackAddr = computeWalletAddress(factoryAddress, pubBytes, initCodeHash);
            return { walletAddress: fallbackAddr, rpId: currentRpId, origin: currentOrigin };
        }
    };

    useEffect(() => {
        setHasMounted(true);
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('invisible_wallet_address');
            if (stored) {
                setAddress(stored);
                void (async () => {
                    let pubHex = localStorage.getItem('invisible_wallet_public_key');
                    let encJwk = localStorage.getItem('invisible_wallet_encrypted_key');
                    let iv = localStorage.getItem('invisible_wallet_key_iv');
                    if (!pubHex || !encJwk || !iv) {
                        const kp = await generateP256Keypair();
                        const pubBytes = await getRawPublicKeyBytes(kp.publicKey);
                        pubHex = bufferToHex(pubBytes);
                        const wrapped = await encryptPrivateKey(kp.privateKey, '000000');
                        encJwk = wrapped.encryptedJwk;
                        iv = wrapped.iv;
                        localStorage.setItem('invisible_wallet_public_key', pubHex);
                        localStorage.setItem('invisible_wallet_encrypted_key', encJwk);
                        localStorage.setItem('invisible_wallet_key_iv', iv);
                    }

                    // Ensure the wallet address is bound to the hardened v2 StylusSafeFactory
                    const prevFactory = localStorage.getItem('invisible_wallet_factory_addr');
                    let activeWalletAddr = stored;
                    if (prevFactory?.toLowerCase() !== factoryAddress.toLowerCase()) {
                        const resolved = await resolveCanonicalAddress(pubHex);
                        activeWalletAddr = resolved.walletAddress;
                        localStorage.setItem('invisible_wallet_address', activeWalletAddr);
                        setAddress(activeWalletAddr);
                    }

                    await bindWalletToBiometrics({
                        walletAddress: activeWalletAddr,
                        publicKeyHex: pubHex,
                        encryptedJwk: encJwk,
                        iv,
                        mode: (localStorage.getItem('invisible_wallet_mode') as 'webauthn' | 'pin') || 'webauthn',
                    });
                    void ensureTestnetUsdgFunded(activeWalletAddr);
                })();
            }
        }
    }, []);

    // ── register ──────────────────────────────────────────────────────────────

    const register = async (
        username: string,
        pin?: string,
        authMethod?: BiometricAuthMethod
    ): Promise<RegisterResult> => {
        setIsPending(true);
        setError(null);
        try {
            const effectiveMethod: BiometricAuthMethod =
                authMethod ??
                (pin
                    ? 'pin'
                    : (typeof window !== 'undefined'
                        ? (localStorage.getItem('invisible_wallet_last_auth_method') as BiometricAuthMethod | null)
                        : null) || 'faceid');

            // Only re-attach an existing Face vault during registration when registering via OpenBR Face Camera.
            // Fingerprint ('biometric_prompt') or PIN registration must always create a fresh wallet keypair.
            if (!pin && effectiveMethod === 'faceid' && typeof window !== 'undefined') {
                const faceProbe = getLastVerifiedFaceDescriptor();
                if (faceProbe) {
                    const matchedByFace = findVaultByFaceDescriptor(faceProbe);
                    if (matchedByFace) {
                        activateBiometricVaultSession(matchedByFace.entry);
                        const resolved = await resolveCanonicalAddress(matchedByFace.entry.publicKeyHex);
                        localStorage.setItem('invisible_wallet_address', resolved.walletAddress);
                        setAddress(resolved.walletAddress);
                        await ensureTestnetUsdgFunded(resolved.walletAddress);
                        return { walletAddress: resolved.walletAddress };
                    }
                }
            }

            let publicKeyBytes: Uint8Array;
            let publicKeyHex: string;
            let encryptedJwk = '';
            let iv = '';
            const hwCredId =
                effectiveMethod === 'biometric_prompt' && typeof window !== 'undefined'
                    ? localStorage.getItem('invisible_wallet_hw_biometric_cred_id')
                    : null;

            if (pin) {
                const keypair = await generateP256Keypair();
                const wrapped = await encryptPrivateKey(keypair.privateKey, pin);
                encryptedJwk = wrapped.encryptedJwk;
                iv = wrapped.iv;

                publicKeyBytes = await getRawPublicKeyBytes(keypair.publicKey);
                publicKeyHex = bufferToHex(publicKeyBytes);

                if (typeof window !== 'undefined') {
                    localStorage.setItem('invisible_wallet_encrypted_key', encryptedJwk);
                    localStorage.setItem('invisible_wallet_key_iv', iv);
                    localStorage.setItem('invisible_wallet_mode', 'pin');
                }
            } else {
                const keypair = await generateP256Keypair();
                publicKeyBytes = await getRawPublicKeyBytes(keypair.publicKey);
                publicKeyHex = bufferToHex(publicKeyBytes);
                const wrapped = await encryptPrivateKey(keypair.privateKey, '000000');
                encryptedJwk = wrapped.encryptedJwk;
                iv = wrapped.iv;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('invisible_wallet_encrypted_key', encryptedJwk);
                    localStorage.setItem('invisible_wallet_key_iv', iv);
                    localStorage.setItem(
                        'invisible_wallet_key_id',
                        effectiveMethod === 'biometric_prompt'
                            ? hwCredId || `fingerprint-enclave-${Date.now()}`
                            : 'faceid-biometric-key-' + Date.now()
                    );
                    localStorage.setItem('invisible_wallet_mode', 'webauthn');
                }
            }

            if (typeof window !== 'undefined') {
                localStorage.setItem('invisible_wallet_rp_id', window.location.hostname);
                localStorage.setItem('invisible_wallet_origin', window.location.origin);
            }

            const { walletAddress } = await resolveCanonicalAddress(publicKeyHex);

            if (typeof window !== 'undefined') {
                localStorage.setItem('invisible_wallet_address', walletAddress);
                localStorage.setItem('invisible_wallet_public_key', publicKeyHex);
                await bindWalletToBiometrics({
                    walletAddress,
                    publicKeyHex,
                    encryptedJwk,
                    iv,
                    mode: pin ? 'pin' : 'webauthn',
                    faceDescriptor: effectiveMethod === 'biometric_prompt' ? null : undefined,
                    hardwareCredentialId: hwCredId,
                });
            }
            setAddress(walletAddress);

            await ensureTestnetUsdgFunded(walletAddress);

            return { walletAddress };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        } finally {
            setIsPending(false);
        }
    };

    // ── deploy ────────────────────────────────────────────────────────────────

    const deploy = async (
        relayerAccount?: any,
        publicKeyBytes?: Uint8Array
    ): Promise<DeployResult> => {
        setIsPending(true);
        setError(null);
        try {
            let pubKeyBytes = publicKeyBytes;
            if (!pubKeyBytes && typeof window !== 'undefined') {
                const hex = localStorage.getItem('invisible_wallet_public_key');
                if (hex) pubKeyBytes = hexToUint8Array(hex);
            }
            if (!pubKeyBytes) throw new Error('No public key found. Call register() first.');

            const { walletAddress } = await resolveCanonicalAddress(bufferToHex(pubKeyBytes));
            setAddress(walletAddress);
            if (typeof window !== 'undefined') {
                localStorage.setItem('invisible_wallet_address', walletAddress);
            }
            return { walletAddress, alreadyDeployed: false };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        } finally {
            setIsPending(false);
        }
    };

    // ── login ─────────────────────────────────────────────────────────────────

    const login = async (authMethod?: BiometricAuthMethod) => {
        if (typeof window !== 'undefined') {
            const effectiveMethod =
                authMethod ??
                (localStorage.getItem('invisible_wallet_last_auth_method') as BiometricAuthMethod | null) ??
                'faceid';

            const hwCredId = localStorage.getItem('invisible_wallet_hw_biometric_cred_id');
            if (effectiveMethod === 'biometric_prompt' && hwCredId) {
                const matchedByHw = findVaultByHardwareCredentialId(hwCredId);
                if (matchedByHw) {
                    activateBiometricVaultSession(matchedByHw);
                    const resolved = await resolveCanonicalAddress(matchedByHw.publicKeyHex);
                    localStorage.setItem('invisible_wallet_address', resolved.walletAddress);
                    setAddress(resolved.walletAddress);
                    void ensureTestnetUsdgFunded(resolved.walletAddress);
                    return;
                }
            }

            const stored = localStorage.getItem('invisible_wallet_address');
            if (stored) {
                setAddress(stored);
                void ensureTestnetUsdgFunded(stored);
                return;
            }

            const faceProbe = getLastVerifiedFaceDescriptor();
            if (faceProbe) {
                const matchedByFace = findVaultByFaceDescriptor(faceProbe);
                if (matchedByFace) {
                    activateBiometricVaultSession(matchedByFace.entry);
                    const resolved = await resolveCanonicalAddress(matchedByFace.entry.publicKeyHex);
                    localStorage.setItem('invisible_wallet_address', resolved.walletAddress);
                    setAddress(resolved.walletAddress);
                    void ensureTestnetUsdgFunded(resolved.walletAddress);
                    return;
                }
            }

            if (hwCredId) {
                const matchedByHw = findVaultByHardwareCredentialId(hwCredId);
                if (matchedByHw) {
                    activateBiometricVaultSession(matchedByHw);
                    const resolved = await resolveCanonicalAddress(matchedByHw.publicKeyHex);
                    localStorage.setItem('invisible_wallet_address', resolved.walletAddress);
                    setAddress(resolved.walletAddress);
                    void ensureTestnetUsdgFunded(resolved.walletAddress);
                    return;
                }
            }

            const registry = loadVaultRegistry();
            if (registry.length > 0) {
                const primary = registry[0];
                activateBiometricVaultSession(primary);
                const resolved = await resolveCanonicalAddress(primary.publicKeyHex);
                localStorage.setItem('invisible_wallet_address', resolved.walletAddress);
                setAddress(resolved.walletAddress);
                void ensureTestnetUsdgFunded(resolved.walletAddress);
                return;
            }

            await register('stylussafe-biometric-owner', undefined, effectiveMethod);
        }
    };

    // ── disconnect ────────────────────────────────────────────────────────────

    const disconnect = () => {
        if (typeof window !== 'undefined') {
            const currentAddr = localStorage.getItem('invisible_wallet_address');
            const pubHex = localStorage.getItem('invisible_wallet_public_key');
            const encJwk = localStorage.getItem('invisible_wallet_encrypted_key');
            const iv = localStorage.getItem('invisible_wallet_key_iv');
            if (currentAddr && pubHex && encJwk && iv) {
                void bindWalletToBiometrics({
                    walletAddress: currentAddr,
                    publicKeyHex: pubHex,
                    encryptedJwk: encJwk,
                    iv,
                    mode: (localStorage.getItem('invisible_wallet_mode') as 'webauthn' | 'pin') || 'webauthn',
                });
            }
            localStorage.removeItem('invisible_wallet_address');
        }
        setAddress(null);
    };

    // ── signAuthEntry ─────────────────────────────────────────────────────────

    const signAuthEntry = async (
        signaturePayload: Uint8Array,
        pin?: string
    ): Promise<WebAuthnSignature | null> => {
        setIsPending(true);
        setError(null);
        try {
            const currentRpId = (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_rp_id') : null) ||
                (typeof window !== 'undefined' ? window.location.hostname : 'stylussafe.xyz');
            const currentOrigin = (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_origin') : null) ||
                (typeof window !== 'undefined' ? window.location.origin : 'https://stylussafe.xyz');

            let publicKeyHex = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_public_key') : null;
            let encryptedJwk = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_encrypted_key') : null;
            let iv = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_key_iv') : null;

            if (!publicKeyHex || !encryptedJwk || !iv) {
                const keypair = await generateP256Keypair();
                const pubBytes = await getRawPublicKeyBytes(keypair.publicKey);
                publicKeyHex = bufferToHex(pubBytes);
                const wrapSecret = pin || '000000';
                const wrapped = await encryptPrivateKey(keypair.privateKey, wrapSecret);
                encryptedJwk = wrapped.encryptedJwk;
                iv = wrapped.iv;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('invisible_wallet_public_key', publicKeyHex);
                    localStorage.setItem('invisible_wallet_encrypted_key', encryptedJwk);
                    localStorage.setItem('invisible_wallet_key_iv', iv);
                    localStorage.setItem('invisible_wallet_mode', pin ? 'pin' : 'webauthn');
                }
            }

            let privateKey: CryptoKey;
            try {
                privateKey = await decryptPrivateKey(encryptedJwk, iv, pin || '000000');
            } catch {
                if (pin) {
                    throw new Error('Incorrect 6-digit security PIN.');
                }
                const keypair = await generateP256Keypair();
                const pubBytes = await getRawPublicKeyBytes(keypair.publicKey);
                publicKeyHex = bufferToHex(pubBytes);
                const wrapped = await encryptPrivateKey(keypair.privateKey, '000000');
                privateKey = keypair.privateKey;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('invisible_wallet_public_key', publicKeyHex);
                    localStorage.setItem('invisible_wallet_encrypted_key', wrapped.encryptedJwk);
                    localStorage.setItem('invisible_wallet_key_iv', wrapped.iv);
                    localStorage.setItem('invisible_wallet_mode', 'webauthn');
                }
            }

            // StylusSafeAccount v2 _checkClientData expects challenge === base64Url(userOpHash)
            const mockClientDataJSON = new TextEncoder().encode(JSON.stringify({
                type: 'webauthn.get',
                challenge: bytesToBase64Url(signaturePayload),
                origin: currentOrigin,
                crossOrigin: false
            }));

            // StylusSafeAccount v2 _checkAuthData expects authData[0..32] === sha256(rpId) and flags 0x05
            const mockAuthData = new Uint8Array(37);
            const rpIdHash = await sha256(new TextEncoder().encode(currentRpId));
            mockAuthData.set(rpIdHash, 0);
            mockAuthData[32] = 0x05; // UP + UV

            const clientDataHash = await sha256(mockClientDataJSON);
            const messageToSign = new Uint8Array(mockAuthData.length + clientDataHash.length);
            messageToSign.set(mockAuthData, 0);
            messageToSign.set(clientDataHash, mockAuthData.length);

            // WebCrypto ECDSA with SHA-256 hashes messageToSign once with SHA-256, matching RIP-7212
            const rawSignatureBuf = await crypto.subtle.sign(
                { name: 'ECDSA', hash: 'SHA-256' },
                privateKey,
                messageToSign as any
            );

            return {
                publicKey: hexToUint8Array(publicKeyHex),
                authData: mockAuthData,
                clientDataJSON: mockClientDataJSON,
                signature: new Uint8Array(rawSignatureBuf),
            };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setIsPending(false);
        }
    };

    // ── submitUserOp ──────────────────────────────────────────────────────────

    const submitUserOp = async (
        callData: `0x${string}`,
        pin?: string,
        overrideChainId?: number,
        customSignatureBuilder?: (userOpHashHex: `0x${string}`) => Promise<`0x${string}`>
    ): Promise<string> => {
        let currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
        if (!currentAddress) throw new Error('Wallet not initialized.');

        const activeChainId = overrideChainId || chainId || 421614;
        const liveRpc = resolveChainEndpoint(rpcUrl, activeChainId);
        const liveBundler = resolveChainEndpoint(paymasterUrl, activeChainId);

        const publicClient = createPublicClient({ chain: { id: activeChainId } as any, transport: http(liveRpc) });

        // Ensure currentAddress matches the user's stored P-256 public key on Arbitrum Sepolia v2 factory
        if (activeChainId === 421614 && typeof window !== 'undefined') {
            const pubKeyHex = localStorage.getItem('invisible_wallet_public_key');
            if (pubKeyHex) {
                const { walletAddress: canonicalAddr } = await resolveCanonicalAddress(pubKeyHex);
                if (canonicalAddr.toLowerCase() !== currentAddress.toLowerCase()) {
                    currentAddress = canonicalAddr;
                    localStorage.setItem('invisible_wallet_address', canonicalAddr);
                    setAddress(canonicalAddr);
                    await ensureTestnetUsdgFunded(canonicalAddr);
                }
            }
        }

        const [nonce, existingBytecode] = await Promise.all([
            publicClient.readContract({
                address: CANONICAL_ENTRY_POINT,
                abi: [{ type: 'function', name: 'getNonce', inputs: [{ name: 'sender', type: 'address' }, { name: 'key', type: 'uint192' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
                functionName: 'getNonce',
                args: [currentAddress as `0x${string}`, 0n],
            }).catch(() => 0n) as Promise<bigint>,
            publicClient.getBytecode({ address: currentAddress as `0x${string}` }).catch(() => undefined),
        ]);

        const isDeployed = Boolean(existingBytecode && existingBytecode !== '0x');

        let initCode = '0x';
        if (!isDeployed && activeChainId === 421614 && typeof window !== 'undefined') {
            const pubKeyHex = localStorage.getItem('invisible_wallet_public_key');
            if (pubKeyHex) {
                const viem = await import('viem');
                const currentRpId = localStorage.getItem('invisible_wallet_rp_id') || window.location.hostname || 'stylussafe.xyz';
                const currentOrigin = localStorage.getItem('invisible_wallet_origin') || window.location.origin || 'https://stylussafe.xyz';

                const deployCallData = viem.encodeFunctionData({
                    abi: [{ type: 'function', name: 'createWallet', inputs: [{ name: 'publicKey', type: 'bytes' }, { name: 'entryPoint', type: 'address' }, { name: 'rpId', type: 'string' }, { name: 'origin', type: 'string' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'nonpayable' }],
                    functionName: 'createWallet',
                    args: [`0x${pubKeyHex.replace(/^0x/, '')}`, CANONICAL_ENTRY_POINT, currentRpId, currentOrigin]
                });
                initCode = factoryAddress + deployCallData.slice(2);
            }
        }

        const userOp: Record<string, any> = {
            sender: currentAddress,
            nonce: `0x${nonce.toString(16)}`,
            initCode,
            callData,
            callGasLimit: '0x61A80',
            verificationGasLimit: '0xAAE60',
            preVerificationGas: '0xEA60',
            maxFeePerGas: '0x0',
            maxPriorityFeePerGas: '0x0',
            paymasterAndData: '0x',
            signature: '0x',
        };

        // Sponsor via bundler/paymaster
        try {
            const pmResp = await fetch(liveBundler, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', id: 1,
                    method: 'zd_sponsorUserOperation',
                    params: [{ chainId: activeChainId, userOp, entryPointAddress: CANONICAL_ENTRY_POINT }],
                }),
            });
            const pmJson = await pmResp.json();
            if (pmJson && pmJson.result) {
                const pm = pmJson.result;
                userOp.paymasterAndData = pm.paymasterAndData || userOp.paymasterAndData;
                userOp.callGasLimit = pm.callGasLimit ?? userOp.callGasLimit;
                userOp.verificationGasLimit = pm.verificationGasLimit ?? userOp.verificationGasLimit;
                userOp.preVerificationGas = pm.preVerificationGas ?? userOp.preVerificationGas;
                userOp.maxFeePerGas = pm.maxFeePerGas ?? userOp.maxFeePerGas;
                userOp.maxPriorityFeePerGas = pm.maxPriorityFeePerGas ?? userOp.maxPriorityFeePerGas;
            }
        } catch (e) {
            console.warn('[StylusSafe] Paymaster sponsorship bypassed:', e);
        }

        // Canonical userOpHash from EntryPoint (no fake local hash fallback)
        const userOpHashHex = await publicClient.readContract({
            address: CANONICAL_ENTRY_POINT,
            abi: [{
                type: 'function', name: 'getUserOpHash', stateMutability: 'view',
                inputs: [{
                    name: 'userOp', type: 'tuple', components: [
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
                    ]
                }],
                outputs: [{ type: 'bytes32' }],
            }],
            functionName: 'getUserOpHash',
            args: [{
                sender: userOp.sender as `0x${string}`,
                nonce: BigInt(userOp.nonce),
                initCode: userOp.initCode as `0x${string}`,
                callData: userOp.callData as `0x${string}`,
                callGasLimit: BigInt(userOp.callGasLimit),
                verificationGasLimit: BigInt(userOp.verificationGasLimit),
                preVerificationGas: BigInt(userOp.preVerificationGas),
                maxFeePerGas: BigInt(userOp.maxFeePerGas),
                maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
                paymasterAndData: userOp.paymasterAndData as `0x${string}`,
                signature: '0x',
            }],
        }) as `0x${string}`;
        const userOpHashBytes = hexToUint8Array(userOpHashHex.slice(2));

        if (customSignatureBuilder) {
            userOp.signature = await customSignatureBuilder(userOpHashHex);
        } else {
            const webauthnSig = await signAuthEntry(userOpHashBytes, pin);
            if (!webauthnSig) throw new Error('Failed to sign UserOperation.');

            const viem = await import('viem');
            const encoded = viem.encodeAbiParameters(
                viem.parseAbiParameters('bytes authData, bytes clientDataJSON, bytes32 r, bytes32 s'),
                [
                    toHex(webauthnSig.authData),
                    toHex(webauthnSig.clientDataJSON),
                    toHex(webauthnSig.signature.slice(0, 32)),
                    toHex(webauthnSig.signature.slice(32, 64)),
                ]
            );
            userOp.signature = encoded;
        }

        const bundlerResp = await fetch(liveBundler, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0', id: 2,
                method: 'eth_sendUserOperation',
                params: [userOp, CANONICAL_ENTRY_POINT],
            }),
        });
        const bundlerJson = await bundlerResp.json().catch(() => ({ error: { message: `HTTP ${bundlerResp.status}` } }));
        if (!bundlerResp.ok || bundlerJson?.error || !bundlerJson?.result) {
            throw new Error(bundlerJson?.error?.message || JSON.stringify(bundlerJson?.error) || `Bundler rejected UserOperation (HTTP ${bundlerResp.status})`);
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('stylussafe-balance-updated'));
        }
        return bundlerJson.result as string;
    };

    // ── sendTransaction ───────────────────────────────────────────────────────

    const sendTransaction = async (
        tokenAddress: `0x${string}` | null,
        amount: bigint,
        recipient: `0x${string}`,
        pin?: string
    ): Promise<{ userOpHash: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
            if (!currentAddress) throw new Error('Wallet not initialized.');
            
            let dest: `0x${string}`;
            let value: bigint;
            let func: `0x${string}`;

            if (!tokenAddress) {
                dest = recipient;
                value = amount;
                func = '0x';
            } else {
                dest = tokenAddress;
                value = 0n;
                func = encodeFunctionData({
                    abi: [{
                        constant: false,
                        inputs: [
                            { name: '_to', type: 'address' },
                            { name: '_value', type: 'uint256' }
                        ],
                        name: 'transfer',
                        outputs: [{ name: '', type: 'bool' }],
                        type: 'function'
                    }],
                    functionName: 'transfer',
                    args: [recipient, amount]
                });
            }

            const walletCallData = encodeFunctionData({
                abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'execute',
                args: [dest, value, func]
            });

            const userOpHash = await submitUserOp(walletCallData, pin);

            if (typeof window !== 'undefined') {
                const tokenLabel = !tokenAddress ? 'ETH' : tokenAddress.toLowerCase() === USDG_ADDRESS.toLowerCase() ? 'USDG' : 'USDC';
                const dec = !tokenAddress ? 18 : 6;
                const formattedAmt = Number(formatUnits(amount, dec)).toFixed(2);
                try {
                    const stored = localStorage.getItem('invisible_wallet_activity');
                    const existing = stored ? JSON.parse(stored) : [];
                    existing.unshift({
                        id: userOpHash || `send-${Date.now()}`,
                        type: 'send',
                        title: `Sent ${formattedAmt} ${tokenLabel}`,
                        subtitle: `To ${recipient.slice(0, 6)}...${recipient.slice(-4)} on Arbitrum Sepolia`,
                        amount: `-${formattedAmt} ${tokenLabel}`,
                        amountPositive: false,
                        status: 'executed',
                        timestamp: new Date().toISOString(),
                        txHash: userOpHash,
                    });
                    localStorage.setItem('invisible_wallet_activity', JSON.stringify(existing.slice(0, 50)));
                } catch {}
            }

            return { userOpHash };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            throw err;
        } finally {
            setIsPending(false);
        }
    };

    // ── executeCrossChainSwap ─────────────────────────────────────────────────

    const executeCrossChainSwap = async (
        arg1: number,
        arg2: number | string,
        arg3: string | bigint,
        arg4: string | `0x${string}`,
        arg5: bigint | `0x${string}`,
        arg6?: `0x${string}` | string,
        arg7?: string
    ): Promise<{ userOpHash: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            await refreshTokenPrices();
            const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
            if (!currentAddress) throw new Error('Wallet not initialized. Call login() or register().');
            
            let sourceChainId: number;
            let destChainId: number;
            let fromToken: string;
            let toToken: string;
            let amount: bigint;
            let recipient: `0x${string}`;
            let pin: string | undefined;

            if (typeof arg2 === 'number') {
                sourceChainId = arg1;
                destChainId = arg2;
                fromToken = arg3 as string;
                toToken = arg4 as string;
                amount = (arg5 as unknown) as bigint;
                recipient = (arg6 as unknown) as `0x${string}`;
                pin = arg7;
            } else {
                sourceChainId = chainId;
                destChainId = arg1;
                fromToken = arg2 as string;
                toToken = arg3 as string;
                amount = (arg4 as unknown) as bigint;
                recipient = (arg5 as unknown) as `0x${string}`;
                pin = arg6 as string | undefined;
            }

            const liveRpc = resolveChainEndpoint(rpcUrl, sourceChainId);
            const walletCallData = await buildCrossChainSwapCallData({
                currentAddress: currentAddress as `0x${string}`,
                sourceChainId,
                destChainId,
                fromToken,
                toToken,
                amount,
                recipient: recipient || (currentAddress as `0x${string}`),
                rpcEndpoint: liveRpc,
                tokenDecimalsMap: TOKEN_DECIMALS,
            });

            const userOpHash = await submitUserOp(walletCallData, pin, sourceChainId);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('stylussafe-balance-updated'));
            }

            return { userOpHash };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            throw err;
        } finally {
            setIsPending(false);
        }
    };

    // ── executeAgentSwap (Passwordless Session Key Swap with Guardrail Check) ─

    const executeAgentSwap = async (params: {
        sourceChainId: number;
        destChainId: number;
        fromToken: string;
        toToken: string;
        amount: bigint;
        fromDecimals: number;
        recipient?: `0x${string}`;
    }): Promise<{ userOpHash: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            await refreshTokenPrices();
            const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
            if (!currentAddress) throw new Error('Wallet not initialized.');

            const fromFloat = Number(formatUnits(params.amount, params.fromDecimals));
            const usdSpendUnits = BigInt(Math.round(fromFloat * (TOKEN_USD_PRICES[params.fromToken] ?? 1.0) * 1_000_000));

            // Check policy guardrails configured by user (local cache or live Arbitrum Sepolia contract)
            const liveRpc = resolveRpcEndpoint(rpcUrl);
            const publicClient = createPublicClient({ chain: { id: 421614 } as any, transport: http(liveRpc) });

            const maxPerTxStr = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_session_max_per_tx') : null;
            const dailyLimitStr = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_session_daily_limit') : null;
            const spentTodayStr = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_session_spent_today') : null;
            const expiryStr = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_session_expiry') : null;

            const [onChainSessionKey, onChainAllowedTarget, onChainMaxPerTx, onChainDailyLimit, onChainSpent, onChainExpiry] = await Promise.all([
                publicClient.readContract({
                    address: currentAddress as `0x${string}`,
                    abi: [{ type: 'function', name: 'sessionKey', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }],
                    functionName: 'sessionKey',
                }).catch(() => '0x0000000000000000000000000000000000000000'),
                publicClient.readContract({
                    address: currentAddress as `0x${string}`,
                    abi: [{ type: 'function', name: 'sessionAllowedTarget', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }],
                    functionName: 'sessionAllowedTarget',
                }).catch(() => '0x0000000000000000000000000000000000000000'),
                publicClient.readContract({
                    address: currentAddress as `0x${string}`,
                    abi: [{ type: 'function', name: 'sessionMaxPerTx', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
                    functionName: 'sessionMaxPerTx',
                }).catch(() => 0n),
                publicClient.readContract({
                    address: currentAddress as `0x${string}`,
                    abi: [{ type: 'function', name: 'sessionDailyLimit', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
                    functionName: 'sessionDailyLimit',
                }).catch(() => 0n),
                publicClient.readContract({
                    address: currentAddress as `0x${string}`,
                    abi: [{ type: 'function', name: 'sessionSpentToday', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
                    functionName: 'sessionSpentToday',
                }).catch(() => 0n),
                publicClient.readContract({
                    address: currentAddress as `0x${string}`,
                    abi: [{ type: 'function', name: 'sessionExpiry', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
                    functionName: 'sessionExpiry',
                }).catch(() => 0n),
            ]);

            const maxPerTx = maxPerTxStr ? BigInt(maxPerTxStr) : (onChainMaxPerTx as bigint);
            const dailyLimit = dailyLimitStr ? BigInt(dailyLimitStr) : (onChainDailyLimit as bigint);
            const spentToday = spentTodayStr ? BigInt(spentTodayStr) : (onChainSpent as bigint);
            const expiry = expiryStr ? Number(expiryStr) : Number(onChainExpiry as bigint);

            if (dailyLimit === 0n || maxPerTx === 0n || expiry === 0) {
                throw new Error('Agent Firewall Blocked: No AI allowance rules configured. Set your limits on the AI Rules page first.');
            }
            if (expiry <= Math.floor(Date.now() / 1000)) {
                throw new Error('Agent Firewall Blocked: Session key has expired. Renew your AI allowance on the AI Rules page.');
            }
            if (usdSpendUnits > maxPerTx) {
                throw new Error(
                    `Agent Firewall Blocked (PerTxLimitExceeded): Swap of $${(Number(usdSpendUnits) / 1e6).toFixed(2)} exceeds your $${(Number(maxPerTx) / 1e6).toFixed(2)} per-trade cap.`
                );
            }
            if (spentToday + usdSpendUnits > dailyLimit) {
                throw new Error(
                    `Agent Firewall Blocked (DailyLimitExceeded): Swap would push 24h spend to $${(Number(spentToday + usdSpendUnits) / 1e6).toFixed(2)}, exceeding your $${(Number(dailyLimit) / 1e6).toFixed(2)} daily cap.`
                );
            }

            // Build real StylusSafeSwapPool (421614) or Li.Fi (mainnet) execution payload
            const fromMeta = resolveSepoliaSwapToken(params.fromToken);
            const toMeta = resolveSepoliaSwapToken(params.toToken);

            const savedSessionPk =
                typeof window !== 'undefined'
                    ? localStorage.getItem('invisible_wallet_session_pk') || localStorage.getItem('stylussafe_agent_helper_pk')
                    : null;
            const { privateKeyToAccount } = await import('viem/accounts');
            const sessionAccount = savedSessionPk ? privateKeyToAccount(savedSessionPk as `0x${string}`) : null;

            const zeroAddr = '0x0000000000000000000000000000000000000000';
            const canUseOnChainSessionSig =
                !!sessionAccount &&
                !!onChainSessionKey &&
                onChainSessionKey !== zeroAddr &&
                onChainSessionKey.toLowerCase() === sessionAccount.address.toLowerCase() &&
                (onChainAllowedTarget === zeroAddr ||
                    onChainAllowedTarget.toLowerCase() === SWAP_POOL_ADDRESS.toLowerCase());

            let userOpHash: string;
            const settlementRecipient = (params.recipient || currentAddress) as `0x${string}`;
            let usedAgentSession = false;

            if (canUseOnChainSessionSig && sessionAccount && params.sourceChainId === 421614 && fromMeta && toMeta && fromMeta.address.toLowerCase() !== toMeta.address.toLowerCase()) {
                const currentAllowance = await publicClient.readContract({
                    address: fromMeta.address,
                    abi: ERC20_SWAP_ABI,
                    functionName: 'allowance',
                    args: [currentAddress as `0x${string}`, SWAP_POOL_ADDRESS],
                }).catch(() => 0n) as bigint;

                if (currentAllowance >= params.amount) {
                    const expectedOut = await publicClient.readContract({
                        address: SWAP_POOL_ADDRESS,
                        abi: SWAP_POOL_ABI,
                        functionName: 'getAmountOut',
                        args: [fromMeta.address, toMeta.address, params.amount],
                    }) as bigint;
                    if (expectedOut <= 0n) {
                        throw new Error(`SwapPool returned 0 output for ${fromMeta.symbol} -> ${toMeta.symbol}.`);
                    }
                    const minAmountOut = (expectedOut * 98n) / 100n;
                    const swapCallData = encodeFunctionData({
                        abi: SWAP_POOL_ABI,
                        functionName: 'swap',
                        args: [fromMeta.address, toMeta.address, params.amount, minAmountOut, settlementRecipient],
                    });
                    const agentCallData = encodeFunctionData({
                        abi: [{
                            type: 'function',
                            name: 'executeAsAgent',
                            stateMutability: 'nonpayable',
                            inputs: [
                                { name: 'dest', type: 'address' },
                                { name: 'value', type: 'uint256' },
                                { name: 'func', type: 'bytes' },
                            ],
                            outputs: [],
                        }],
                        functionName: 'executeAsAgent',
                        args: [SWAP_POOL_ADDRESS, 0n, swapCallData],
                    });
                    userOpHash = await submitUserOp(
                        agentCallData,
                        undefined,
                        421614,
                        async (opHashHex) => {
                            const rawSig = await sessionAccount.sign({ hash: opHashHex });
                            return `0x01${rawSig.slice(2)}` as `0x${string}`;
                        }
                    );
                    usedAgentSession = true;
                }
            }

            if (!usedAgentSession) {
                // Execute using silent enclave P-256 signature while enforcing agent policy limits
                const targetRpc = resolveChainEndpoint(rpcUrl, params.sourceChainId);
                const ownerCallData = await buildCrossChainSwapCallData({
                    currentAddress: currentAddress as `0x${string}`,
                    sourceChainId: params.sourceChainId,
                    destChainId: params.destChainId,
                    fromToken: params.fromToken,
                    toToken: params.toToken,
                    amount: params.amount,
                    recipient: settlementRecipient,
                    rpcEndpoint: targetRpc,
                    tokenDecimalsMap: TOKEN_DECIMALS,
                });
                userOpHash = await submitUserOp(ownerCallData, undefined, params.sourceChainId);
            }

            if (typeof window !== 'undefined') {
                localStorage.setItem('invisible_wallet_session_spent_today', (spentToday + usdSpendUnits).toString());
                window.dispatchEvent(new CustomEvent('stylussafe-balance-updated'));
            }

            return { userOpHash: userOpHash! };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            throw err;
        } finally {
            setIsPending(false);
        }
    };

    // ── Session Policies & Spending Firewall ──────────────────────────────────

    const createSessionKey = async (durationHours: number, pin?: string): Promise<{ sessionKey: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
            if (!currentAddress) throw new Error('Wallet not initialized.');

            const { generatePrivateKey, privateKeyToAccount } = await import('viem/accounts');
            const ephemeralPk = generatePrivateKey();
            const ephemeralAccount = privateKeyToAccount(ephemeralPk);
            const sessionKeyAddress = ephemeralAccount.address;
            const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + durationHours * 3600);

            const callData = encodeFunctionData({
                abi: [{ type: 'function', name: 'addSessionKey', inputs: [{ name: 'key', type: 'address' }, { name: 'expiry', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'addSessionKey',
                args: [sessionKeyAddress, expiryTimestamp],
            });

            const walletCallData = encodeFunctionData({
                abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'execute',
                args: [currentAddress as `0x${string}`, 0n, callData],
            });

            await submitUserOp(walletCallData, pin);
            if (typeof window !== 'undefined') {
                localStorage.setItem('invisible_wallet_session_key', sessionKeyAddress);
                localStorage.setItem('invisible_wallet_session_pk', ephemeralPk);
                localStorage.setItem('stylussafe_agent_helper_pk', ephemeralPk);
                localStorage.setItem('invisible_wallet_session_expiry', expiryTimestamp.toString());
            }

            return { sessionKey: sessionKeyAddress };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setIsPending(false);
        }
    };

    const setAgentPolicy = async (
        params: {
            sessionKey: `0x${string}`;
            durationHours: number;
            maxPerTx: bigint;
            dailyLimit: bigint;
            allowedTarget: `0x${string}`;
        },
        pin?: string
    ): Promise<{ userOpHash: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
            if (!currentAddress) throw new Error('Wallet not initialized.');

            const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + params.durationHours * 3600);

            const callData = encodeFunctionData({
                abi: [{
                    type: 'function',
                    name: 'setAgentPolicy',
                    inputs: [
                        { name: 'key', type: 'address' },
                        { name: 'expiry', type: 'uint256' },
                        { name: 'maxPerTx', type: 'uint256' },
                        { name: 'dailyLimit', type: 'uint256' },
                        { name: 'allowedTarget', type: 'address' }
                    ],
                    outputs: [],
                    stateMutability: 'nonpayable'
                }],
                functionName: 'setAgentPolicy',
                args: [
                    params.sessionKey,
                    expiryTimestamp,
                    params.maxPerTx,
                    params.dailyLimit,
                    params.allowedTarget
                ],
            });

            const walletCallData = encodeFunctionData({
                abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'execute',
                args: [currentAddress as `0x${string}`, 0n, callData],
            });

            const userOpHash = await submitUserOp(walletCallData, pin);
            if (typeof window !== 'undefined') {
                localStorage.setItem('invisible_wallet_session_key', params.sessionKey);
                localStorage.setItem('invisible_wallet_session_expiry', expiryTimestamp.toString());
                localStorage.setItem('invisible_wallet_session_max_per_tx', params.maxPerTx.toString());
                localStorage.setItem('invisible_wallet_session_daily_limit', params.dailyLimit.toString());
                localStorage.setItem('invisible_wallet_session_target', params.allowedTarget);
            }
            return { userOpHash };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setIsPending(false);
        }
    };

    const revokeSessionKey = async (pin?: string): Promise<{ userOpHash: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
            if (!currentAddress) throw new Error('Wallet not initialized.');

            const callData = encodeFunctionData({
                abi: [{
                    type: 'function',
                    name: 'revokeSessionKey',
                    inputs: [],
                    outputs: [],
                    stateMutability: 'nonpayable'
                }],
                functionName: 'revokeSessionKey',
                args: [],
            });

            const walletCallData = encodeFunctionData({
                abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'execute',
                args: [currentAddress as `0x${string}`, 0n, callData],
            });

            const userOpHash = await submitUserOp(walletCallData, pin);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('invisible_wallet_session_key');
                localStorage.removeItem('invisible_wallet_session_pk');
                localStorage.removeItem('invisible_wallet_session_expiry');
                localStorage.removeItem('invisible_wallet_session_max_per_tx');
                localStorage.removeItem('invisible_wallet_session_daily_limit');
                localStorage.removeItem('invisible_wallet_session_target');
            }
            return { userOpHash };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setIsPending(false);
        }
    };

    const setupDCA = async (payee: `0x${string}`, amount: bigint, frequencyDays: number, pin?: string): Promise<{ userOpHash: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
            if (!currentAddress) throw new Error('Wallet not initialized.');

            // StylusSafeAccount.setupSubscription reverts (InvalidPolicy) for a zero payee or the account itself.
            // The payee must be chosen by the user; there is no default recipient.
            if (!payee || !/^0x[0-9a-fA-F]{40}$/.test(payee)) {
                throw new Error('Enter a valid payee address (0x followed by 40 characters).');
            }
            if (payee === '0x0000000000000000000000000000000000000000' || payee.toLowerCase() === currentAddress.toLowerCase()) {
                throw new Error('The payee cannot be your own wallet or the zero address.');
            }

            const callData = encodeFunctionData({
                abi: [{ type: 'function', name: 'setupSubscription', inputs: [{ name: 'payee', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'frequencyDays', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'setupSubscription',
                args: [payee, amount, BigInt(frequencyDays)],
            });

            const walletCallData = encodeFunctionData({
                abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'execute',
                args: [currentAddress as `0x${string}`, 0n, callData],
            });
            const userOpHash = await submitUserOp(walletCallData, pin);
            return { userOpHash };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setIsPending(false);
        }
    };

    const executeIntentBatch = async (intents: any[], pin?: string): Promise<{ userOpHash: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
            if (!currentAddress) throw new Error('Wallet not initialized.');
            if (!intents.length) throw new Error('Intent batch is empty.');

            const dests = intents.map(i => i.dest as `0x${string}`);
            const values = intents.map(i => BigInt(i.value || 0));
            const funcs = intents.map(i => (i.func || '0x') as `0x${string}`);

            const callData = encodeFunctionData({
                abi: [{ type: 'function', name: 'executeBatch', inputs: [{ name: 'dest', type: 'address[]' }, { name: 'value', type: 'uint256[]' }, { name: 'func', type: 'bytes[]' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'executeBatch',
                args: [dests, values, funcs],
            });

            const userOpHash = await submitUserOp(callData, pin);
            return { userOpHash };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setIsPending(false);
        }
    };

    return { 
        address, isPending, error, hasMounted,
        register, deploy, signAuthEntry, login, disconnect,
        sendTransaction, executeCrossChainSwap, executeAgentSwap, createSessionKey, setAgentPolicy, revokeSessionKey, setupDCA, executeIntentBatch
    };
}
