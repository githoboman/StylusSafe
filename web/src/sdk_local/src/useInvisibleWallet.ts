import { useState, useEffect } from 'react';
import {
    createWalletClient,
    createPublicClient,
    http,
    custom,
    toHex,
    encodeFunctionData
} from 'viem';
import { createPaymasterClient } from 'viem/account-abstraction';
import {
    bufferToHex,
    hexToUint8Array,
    derToRawSignature,
    extractP256PublicKey,
    computeWalletAddress,
    generateP256Keypair,
    encryptPrivateKey,
    decryptPrivateKey,
    getRawPublicKeyBytes,
    sha256
} from './utils';
import { createPublicClient as _createPublicClient, http as _http } from 'viem';

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

export type InvisibleWallet = {
    address: string | null;
    isPending: boolean;
    error: string | null;
    hasMounted: boolean;
    register: (username: string, pin?: string) => Promise<RegisterResult>;
    deploy: (relayerAccount?: any, publicKeyBytes?: Uint8Array) => Promise<DeployResult>;
    signAuthEntry: (signaturePayload: Uint8Array, pin?: string) => Promise<WebAuthnSignature | null>;
    login: () => Promise<void>;
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
    sendTransaction: (tokenAddress: `0x${string}` | null, amount: bigint, recipient: `0x${string}`, pin?: string) => Promise<{ userOpHash: string } | null>;
    createSessionKey: (durationHours: number, pin?: string) => Promise<{ sessionKey: string } | null>;
    setAgentPolicy: (params: { sessionKey: `0x${string}`; durationHours: number; maxPerTx: bigint; dailyLimit: bigint; allowedTarget: `0x${string}` }, pin?: string) => Promise<{ userOpHash: string } | null>;
    revokeSessionKey: (pin?: string) => Promise<{ userOpHash: string } | null>;
    setupDCA: (tokenIn: `0x${string}`, amount: bigint, frequencyDays: number, pin?: string) => Promise<boolean>;
    executeIntentBatch: (intents: any[], pin?: string) => Promise<{ userOpHash: string } | null>;
};

// ── Canonical Deployed Addresses on Arbitrum Sepolia ─────────────────────────
const CANONICAL_FACTORY = '0xAB283BA59EA6E9448c5C105d7afB12d73727c864' as `0x${string}`;
const CANONICAL_ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as `0x${string}`;
const FALLBACK_PUBLIC_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';

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

    useEffect(() => {
        setHasMounted(true);
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('invisible_wallet_address');
            if (stored) setAddress(stored);
        }
    }, []);

    const resolveRpcEndpoint = (url: string) => {
        if (typeof window !== 'undefined' && url.startsWith('/')) {
            return `${window.location.origin}${url}`;
        }
        return url || FALLBACK_PUBLIC_RPC;
    };

    // ── register ──────────────────────────────────────────────────────────────

    const register = async (username: string, pin?: string): Promise<RegisterResult> => {
        setIsPending(true);
        setError(null);
        try {
            let publicKeyBytes: Uint8Array;
            let publicKeyHex: string;
            
            if (pin) {
                // PIN MODE (Web) - Software P-256 Keypair
                const keypair = await generateP256Keypair();
                const { encryptedJwk, iv } = await encryptPrivateKey(keypair.privateKey, pin);
                
                publicKeyBytes = await getRawPublicKeyBytes(keypair.publicKey);
                publicKeyHex = bufferToHex(publicKeyBytes);
                
                if (typeof window !== 'undefined') {
                    localStorage.setItem('invisible_wallet_encrypted_key', encryptedJwk);
                    localStorage.setItem('invisible_wallet_key_iv', iv);
                    localStorage.setItem('invisible_wallet_mode', 'pin');
                }
            } else {
                // WEBAUTHN MODE
                const challenge = crypto.getRandomValues(new Uint8Array(32));
                const credential = await navigator.credentials.create({
                    publicKey: {
                        challenge,
                        rp: { name: 'StylusSafe' },
                        user: {
                            id: new TextEncoder().encode(username),
                            name: username,
                            displayName: username,
                        },
                        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
                        timeout: 60_000,
                        authenticatorSelection: {
                            residentKey: 'preferred',
                            userVerification: 'required',
                        },
                    },
                }) as PublicKeyCredential;

                if (!credential) throw new Error('Credential creation failed');

                const response = credential.response as AuthenticatorAttestationResponse;
                publicKeyBytes = await extractP256PublicKey(response);
                publicKeyHex = bufferToHex(publicKeyBytes);
                
                if (typeof window !== 'undefined') {
                    localStorage.setItem('invisible_wallet_key_id', credential.id);
                    localStorage.setItem('invisible_wallet_mode', 'webauthn');
                }
            }
            
            // Resolve canonical CREATE2 wallet address from factory
            let walletAddress: string;
            try {
                const liveRpc = resolveRpcEndpoint(rpcUrl);
                const pc = _createPublicClient({ transport: _http(liveRpc) });
                const currentRpId = typeof window !== 'undefined' ? window.location.hostname : 'stylussafe.xyz';
                const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://stylussafe.xyz';

                walletAddress = await pc.readContract({
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
                    args: [`0x${publicKeyHex.replace(/^0x/, '')}`, CANONICAL_ENTRY_POINT, currentRpId, currentOrigin]
                }) as string;
            } catch (_e) {
                walletAddress = computeWalletAddress(factoryAddress, publicKeyBytes, initCodeHash);
            }

            if (typeof window !== 'undefined') {
                localStorage.setItem('invisible_wallet_address', walletAddress);
                localStorage.setItem('invisible_wallet_public_key', publicKeyHex);
            }
            setAddress(walletAddress);

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

            const walletAddress = computeWalletAddress(factoryAddress, pubKeyBytes, initCodeHash);
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

    const login = async () => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('invisible_wallet_address');
            if (stored) {
                setAddress(stored);
            } else {
                setError('No wallet found. Please register first.');
            }
        }
    };

    // ── disconnect ────────────────────────────────────────────────────────────

    const disconnect = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('invisible_wallet_address');
            localStorage.removeItem('invisible_wallet_public_key');
            localStorage.removeItem('invisible_wallet_key_id');
            localStorage.removeItem('invisible_wallet_encrypted_key');
            localStorage.removeItem('invisible_wallet_key_iv');
            localStorage.removeItem('invisible_wallet_mode');
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
            const mode = (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_mode') : null) || 'webauthn';
            const publicKeyHex = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_public_key') : null;
            
            if (!publicKeyHex) {
                throw new Error('No wallet keys found. Please register first.');
            }

            if (mode === 'pin') {
                if (!pin) throw new Error('PIN is required for this wallet.');
                
                const encryptedJwk = localStorage.getItem('invisible_wallet_encrypted_key');
                const iv = localStorage.getItem('invisible_wallet_key_iv');
                if (!encryptedJwk || !iv) throw new Error('Wallet keys corrupted.');

                const privateKey = await decryptPrivateKey(encryptedJwk, iv, pin);
                const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://stylussafe.xyz';
                
                const mockClientDataJSON = new TextEncoder().encode(JSON.stringify({
                    type: 'webauthn.get',
                    challenge: bufferToHex(signaturePayload),
                    origin: currentOrigin,
                    crossOrigin: false
                }));
                
                const mockAuthData = new Uint8Array(37);
                mockAuthData[32] = 0x05; // UP + UV
                
                const clientDataHash = await sha256(mockClientDataJSON);
                const messageToSign = new Uint8Array(mockAuthData.length + clientDataHash.length);
                messageToSign.set(mockAuthData, 0);
                messageToSign.set(clientDataHash, mockAuthData.length);
                const finalHash = await sha256(messageToSign);

                const rawSignatureBuf = await crypto.subtle.sign(
                    { name: 'ECDSA', hash: 'SHA-256' },
                    privateKey,
                    finalHash as any
                );
                
                return {
                    publicKey: hexToUint8Array(publicKeyHex),
                    authData: mockAuthData,
                    clientDataJSON: mockClientDataJSON,
                    signature: new Uint8Array(rawSignatureBuf),
                };
            } else {
                const keyId = typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_key_id') : null;
                if (!keyId) throw new Error('No key ID found. Please register first.');

                const challenge = signaturePayload.buffer.slice(
                    signaturePayload.byteOffset,
                    signaturePayload.byteOffset + signaturePayload.byteLength
                ) as ArrayBuffer;

                const credIdBin = atob(keyId.replace(/-/g, '+').replace(/_/g, '/'));
                const credId = Uint8Array.from(credIdBin, c => c.charCodeAt(0));

                const assertion = await navigator.credentials.get({
                    publicKey: {
                        challenge,
                        allowCredentials: [{ id: credId, type: 'public-key' }],
                        userVerification: 'required',
                    },
                }) as PublicKeyCredential;

                if (!assertion) throw new Error('Signing was cancelled');

                const response = assertion.response as AuthenticatorAssertionResponse;
                const rawSignature = derToRawSignature(response.signature);

                return {
                    publicKey:      hexToUint8Array(publicKeyHex),
                    authData:       new Uint8Array(response.authenticatorData),
                    clientDataJSON: new Uint8Array(response.clientDataJSON),
                    signature:      rawSignature,
                };
            }
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
        overrideChainId?: number
    ): Promise<string> => {
        const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
        if (!currentAddress) throw new Error('Wallet not initialized.');

        const activeChainId = overrideChainId || chainId;
        const liveRpc = resolveRpcEndpoint(rpcUrl);
        const liveBundler = resolveRpcEndpoint(paymasterUrl);

        const publicClient = createPublicClient({ chain: { id: activeChainId } as any, transport: http(liveRpc) });

        const nonce = await publicClient.readContract({
            address: CANONICAL_ENTRY_POINT,
            abi: [{ type: 'function', name: 'getNonce', inputs: [{ name: 'sender', type: 'address' }, { name: 'key', type: 'uint192' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
            functionName: 'getNonce',
            args: [currentAddress as `0x${string}`, 0n],
        }) as bigint;

        let initCode = '0x';
        if (nonce === 0n && typeof window !== 'undefined') {
            const pubKeyHex = localStorage.getItem('invisible_wallet_public_key');
            if (pubKeyHex) {
                const viem = await import('viem');
                const currentRpId = typeof window !== 'undefined' ? window.location.hostname : 'stylussafe.xyz';
                const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://stylussafe.xyz';

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
            initCode: initCode,
            callData,
            callGasLimit: '0xF4240',
            verificationGasLimit: '0xF4240',
            preVerificationGas: '0x186A0',
            maxFeePerGas: '0x5F5E100',
            maxPriorityFeePerGas: '0x5F5E100',
            paymasterAndData: '0x',
            signature: '0x',
        };

        // Sponsor via paymaster if available
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
            }
        } catch (e) {
            console.warn('[StylusSafe] Paymaster sponsorship bypassed:', e);
        }

        // Canonical userOpHash from EntryPoint
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
        const webauthnSig = await signAuthEntry(userOpHashBytes, pin);
        if (!webauthnSig) throw new Error('Failed to sign UserOperation.');

        // Format: abi.encode(bytes authData, bytes clientDataJSON, bytes32 r, bytes32 s)
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

        // Submit UserOp
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
        if (bundlerJson.error) {
            console.error('[StylusSafe] Bundler rejected UserOp:', bundlerJson.error, userOp);
            throw new Error(`Bundler error: ${bundlerJson.error.message || JSON.stringify(bundlerJson.error)}`);
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

            const dests: `0x${string}`[] = [recipient];
            const values: bigint[] = [amount];
            const funcs: `0x${string}`[] = ['0x'];

            const walletCallData = encodeFunctionData({
                abi: [{ type: 'function', name: 'executeBatch', inputs: [{ name: 'dest', type: 'address[]' }, { name: 'value', type: 'uint256[]' }, { name: 'func', type: 'bytes[]' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'executeBatch',
                args: [dests, values, funcs]
            });

            const userOpHash = await submitUserOp(walletCallData, pin, sourceChainId);
            return { userOpHash };
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

            const userOpHash = await submitUserOp(walletCallData, pin);
            if (typeof window !== 'undefined') {
                localStorage.setItem('invisible_wallet_session_key', sessionKeyAddress);
                localStorage.setItem('invisible_wallet_session_pk', ephemeralPk);
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

    const setupDCA = async (tokenIn: `0x${string}`, amount: bigint, frequencyDays: number, pin?: string): Promise<boolean> => {
        setIsPending(true);
        setError(null);
        try {
            const currentAddress = address || (typeof window !== 'undefined' ? localStorage.getItem('invisible_wallet_address') : null);
            if (!currentAddress) throw new Error('Wallet not initialized.');

            const payee = currentAddress as `0x${string}`;
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
            await submitUserOp(walletCallData, pin);
            return true;
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return false;
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
        sendTransaction, executeCrossChainSwap, createSessionKey, setAgentPolicy, revokeSessionKey, setupDCA, executeIntentBatch
    };
}
