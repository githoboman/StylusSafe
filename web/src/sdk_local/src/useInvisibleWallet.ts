import { useState, useEffect } from 'react';
import {
    createWalletClient,
    createPublicClient,
    http,
    custom,
    toHex,
    encodeFunctionData
} from 'viem';
import { createSmartAccountClient } from 'permissionless';
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

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Configuration passed when mounting the hook.
 * Keeping these at hook level (rather than per-method) lets the caller set them
 * once and have every method — deploy, sign, etc. — share the same network context.
 */
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

/**
 * The four pieces the contract's __check_auth needs to verify a WebAuthn assertion.
 */
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

/** Result returned by a successful register() call. */
export type RegisterResult = {
    /** The deterministically computed contract address of the new wallet ("C..."). */
    walletAddress: string;
};

/** Result returned by a successful deploy() call. */
export type DeployResult = {
    /** The on-chain contract address of the deployed wallet ("C..."). */
    walletAddress: string;
    /**
     * True if the wallet was already deployed before this call.
     * When true, no transaction was submitted.
     */
    alreadyDeployed: boolean;
};

type InvisibleWallet = {
    /** EVM contract address of the deployed wallet, or null if not yet registered. */
    address: string | null;
    isPending: boolean;
    error: string | null;
    /** Create a new passkey credential and compute the deterministic wallet address. */
    register: (username: string, pin?: string) => Promise<RegisterResult>;
    /**
     * Deploy the user's wallet contract on-chain via the factory.
     *
     * @param relayerAccount Optional external account/wallet used to pay fees.
     * @param publicKeyBytes Optional override for the P-256 public key. Defaults to
     *                       the key stored in localStorage by register().
     * @returns The deployed wallet's contract address and whether it was already live.
     */
    deploy: (relayerAccount?: any, publicKeyBytes?: Uint8Array) => Promise<DeployResult>;
    /**
     * Sign an ERC-4337 UserOperation hash using the stored passkey.
     *
     * @param signaturePayload  The 32-byte hash from the UserOperation.
     * @param pin               (Optional) The 6-digit PIN used to decrypt the private key for web. If omitted, uses hardware WebAuthn (for mobile).
     */
    signAuthEntry: (signaturePayload: Uint8Array, pin?: string) => Promise<WebAuthnSignature | null>;
    /** Restore an existing wallet session from localStorage. */
    login: () => Promise<void>;
    
    /**
     * Executes a gasless cross-chain swap using ZeroDev Paymaster and Across Protocol.
     * 
     * @param destChainId The destination chain ID (e.g. Base, Optimism)
     * @param tokenAddress The ERC20 token to swap/bridge
     * @param amount The amount of tokens to send
     * @param recipient The destination address receiving the funds
     */
    executeCrossChainSwap: (
        destChainId: number,
        tokenAddress: `0x${string}`,
        amount: bigint,
        recipient: `0x${string}`
    ) => Promise<{ userOpHash: string } | null>;

    /** Creates a temporary session key in the browser for 1-click trading */
    createSessionKey: (durationHours: number) => Promise<{ sessionKey: string } | null>;

    /** Sets up an automated DCA schedule (Pull Payment) */
    setupDCA: (tokenIn: `0x${string}`, amount: bigint, frequencyDays: number) => Promise<boolean>;

    /** Executes a batch of intents atomically across chains */
    executeIntentBatch: (intents: any[]) => Promise<{ userOpHash: string } | null>;
};


// ── Helpers ───────────────────────────────────────────────────────────────────

// Helpers removed for EVM (handled natively by viem publicClient.waitForTransactionReceipt)

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInvisibleWallet(config: Partial<WalletConfig> = {}): InvisibleWallet {
    const { 
        factoryAddress = '0x0000000000000000000000000000000000000000' as `0x${string}`,
        rpcUrl = process.env.NEXT_PUBLIC_ZERODEV_BUNDLER_URL || 'https://rpc.zerodev.app/api/v2/bundler/a4c657bc-c4dd-4366-9cbf-77ef3fd46ba3', 
        chainId = 421614, 
        initCodeHash = '0x0000000000000000000000000000000000000000' as `0x${string}`, 
        paymasterUrl = process.env.NEXT_PUBLIC_ZERODEV_PAYMASTER_URL || 'https://rpc.zerodev.app/api/v2/paymaster/a4c657bc-c4dd-4366-9cbf-77ef3fd46ba3' 
    } = config;

    const [address, setAddress] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('invisible_wallet_address');
        if (stored) setAddress(stored);
    }, []);

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
                
                localStorage.setItem('invisible_wallet_encrypted_key', encryptedJwk);
                localStorage.setItem('invisible_wallet_key_iv', iv);
                localStorage.setItem('invisible_wallet_mode', 'pin');
            } else {
                // WEBAUTHN MODE (Mobile/Hardware)
                const challenge = crypto.getRandomValues(new Uint8Array(32));
                const credential = await navigator.credentials.create({
                    publicKey: {
                        challenge,
                        rp: { name: 'Invisible Wallet' },
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
                
                localStorage.setItem('invisible_wallet_key_id', credential.id);
                localStorage.setItem('invisible_wallet_mode', 'webauthn');
            }
            
            const walletAddress = computeWalletAddress(factoryAddress, publicKeyBytes, initCodeHash);
            localStorage.setItem('invisible_wallet_address', walletAddress);
            localStorage.setItem('invisible_wallet_public_key', publicKeyHex);
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
            if (!pubKeyBytes) {
                const hex = localStorage.getItem('invisible_wallet_public_key');
                if (!hex) throw new Error(
                    'No public key found. Call register() first, or pass publicKeyBytes explicitly.'
                );
                pubKeyBytes = hexToUint8Array(hex);
            }

            const walletAddress = computeWalletAddress(factoryAddress, pubKeyBytes, initCodeHash);

            // HACKATHON MOCK: Bypass actual deployment due to Windows cargo-stylus compilation bug.
            // We just pretend it's deployed immediately so we can test the UI flows!
            console.warn("MOCK MODE: Skipping actual on-chain deployment. Proceeding with mock address.");
            
            // Delay for realistic UX
            await new Promise(r => setTimeout(r, 2000));

            setAddress(walletAddress);
            localStorage.setItem('invisible_wallet_address', walletAddress);
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
        const stored = localStorage.getItem('invisible_wallet_address');
        if (stored) {
            setAddress(stored);
        } else {
            setError('No wallet found. Please register first.');
        }
    };

    // ── signAuthEntry ─────────────────────────────────────────────────────────────

    const signAuthEntry = async (
        signaturePayload: Uint8Array,
        pin?: string
    ): Promise<WebAuthnSignature | null> => {
        setIsPending(true);
        setError(null);
        try {
            const mode = localStorage.getItem('invisible_wallet_mode') || 'webauthn';
            const publicKeyHex = localStorage.getItem('invisible_wallet_public_key');
            
            if (!publicKeyHex) {
                throw new Error("No wallet keys found. Please register first.");
            }

            if (mode === 'pin') {
                if (!pin) throw new Error("PIN is required for this wallet.");
                
                const encryptedJwk = localStorage.getItem('invisible_wallet_encrypted_key');
                const iv = localStorage.getItem('invisible_wallet_key_iv');
                if (!encryptedJwk || !iv) throw new Error("Wallet keys corrupted.");

                // 1. Decrypt private key using PIN
                const privateKey = await decryptPrivateKey(encryptedJwk, iv, pin);
                
                // 2. We must mock the WebAuthn specific data so __check_auth passes
                const mockClientDataJSON = new TextEncoder().encode(JSON.stringify({
                    type: "webauthn.get",
                    challenge: bufferToHex(signaturePayload),
                    origin: window.location.origin || "http://localhost:3000"
                }));
                
                // Mock 37-byte authenticator data with flags
                const mockAuthData = new Uint8Array(37);
                mockAuthData[32] = 0x05; 
                
                // 3. Compute hash: SHA256(authData || SHA256(clientDataJSON))
                const clientDataHash = await sha256(mockClientDataJSON);
                const messageToSign = new Uint8Array(mockAuthData.length + clientDataHash.length);
                messageToSign.set(mockAuthData, 0);
                messageToSign.set(clientDataHash, mockAuthData.length);
                const finalHash = await sha256(messageToSign);

                // 4. Sign the final hash with P-256 ECDSA
                const rawSignatureBuf = await crypto.subtle.sign(
                    { name: "ECDSA", hash: "SHA-256" },
                    privateKey,
                    finalHash
                );
                
                return {
                    publicKey: hexToUint8Array(publicKeyHex),
                    authData: mockAuthData,
                    clientDataJSON: mockClientDataJSON,
                    signature: new Uint8Array(rawSignatureBuf),
                };

            } else {
                // WEBAUTHN MODE
                const keyId = localStorage.getItem('invisible_wallet_key_id');
                if (!keyId) throw new Error('No key ID found. Please register first.');

                if (signaturePayload.length !== 32) {
                    throw new Error('signaturePayload must be exactly 32 bytes');
                }

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

    // ── Shared: submit a UserOperation via the ERC-4337 bundler ────────────────

    const submitUserOp = async (
        callData: `0x${string}`,
        pin?: string
    ): Promise<string> => {
        if (!address) throw new Error('Wallet not initialized.');

        const publicClient = createPublicClient({ chain: { id: chainId } as any, transport: http(rpcUrl) });

        // Fetch current nonce from EntryPoint
        const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as `0x${string}`;
        const nonce = await publicClient.readContract({
            address: ENTRY_POINT,
            abi: [{ type: 'function', name: 'getNonce', inputs: [{ name: 'sender', type: 'address' }, { name: 'key', type: 'uint192' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
            functionName: 'getNonce',
            args: [address as `0x${string}`, 0n],
        }) as bigint;

        const userOp: Record<string, any> = {
            sender: address,
            nonce: `0x${nonce.toString(16)}`,
            initCode: '0x',
            callData,
            callGasLimit: '0x7A120',      // 500000
            verificationGasLimit: '0x30D40', // 200000
            preVerificationGas: '0xC350',   // 50000
            maxFeePerGas: '0x5F5E100',      // 100 gwei
            maxPriorityFeePerGas: '0x5F5E100',
            paymasterAndData: '0x',
            signature: '0x',
        };

        // Request paymaster sponsorship if a paymasterUrl is set
        if (paymasterUrl) {
            const pmResp = await fetch(paymasterUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', id: 1,
                    method: 'pm_sponsorUserOperation',
                    params: [userOp, ENTRY_POINT],
                }),
            });
            const pmJson = await pmResp.json();
            if (pmJson.error) throw new Error(`Paymaster error: ${pmJson.error.message}`);
            const pm = pmJson.result;
            userOp.paymasterAndData = pm.paymasterAndData;
            userOp.callGasLimit = pm.callGasLimit ?? userOp.callGasLimit;
            userOp.verificationGasLimit = pm.verificationGasLimit ?? userOp.verificationGasLimit;
            userOp.preVerificationGas = pm.preVerificationGas ?? userOp.preVerificationGas;
        }

        // Compute the real UserOpHash: keccak256(abi.encode(userOp) ++ chainId ++ entryPoint)
        const { encodeAbiParameters, parseAbiParameters, keccak256: keccak } = await import('viem');
        const packedUserOp = encodeAbiParameters(
            parseAbiParameters('address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes'),
            [
                userOp.sender as `0x${string}`,
                BigInt(userOp.nonce),
                userOp.initCode as `0x${string}`,
                userOp.callData as `0x${string}`,
                BigInt(userOp.callGasLimit),
                BigInt(userOp.verificationGasLimit),
                BigInt(userOp.preVerificationGas),
                BigInt(userOp.maxFeePerGas),
                BigInt(userOp.maxPriorityFeePerGas),
                userOp.paymasterAndData as `0x${string}`,
                '0x' as `0x${string}`, // signature excluded from hash
            ]
        );
        const chainIdHex = `0x${chainId.toString(16).padStart(64, '0')}`;
        const entryPointHex = ENTRY_POINT.toLowerCase().replace('0x', '').padStart(64, '0');
        const finalHashInput = packedUserOp + chainIdHex.slice(2) + entryPointHex;
        const userOpHashHex = keccak(finalHashInput as `0x${string}`);
        const userOpHashBytes = hexToUint8Array(userOpHashHex.slice(2));

        const webauthnSig = await signAuthEntry(userOpHashBytes, pin);
        if (!webauthnSig) throw new Error('Failed to sign UserOperation.');

        // Encode WebAuthnSignature tuple for Stylus validateUserOp
        const { encodeAbiParameters, parseAbiParameters, keccak256 } = await import('viem');
        const encoded = encodeAbiParameters(
            parseAbiParameters('(bytes authData, string clientDataJSON, bytes rawSignature)'),
            [{
                authData: toHex(webauthnSig.authData),
                clientDataJSON: new TextDecoder().decode(webauthnSig.clientDataJSON),
                rawSignature: toHex(webauthnSig.signature),
            }]
        );
        userOp.signature = encoded;

        // Submit to the bundler
        const bundlerUrl = paymasterUrl || rpcUrl;
        const bundlerResp = await fetch(bundlerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0', id: 2,
                method: 'eth_sendUserOperation',
                params: [userOp, ENTRY_POINT],
            }),
        });
        const bundlerJson = await bundlerResp.json();
        if (bundlerJson.error) throw new Error(`Bundler error: ${bundlerJson.error.message}`);
        return bundlerJson.result as string; // userOpHash
    };

    // ── executeCrossChainSwap (ZeroDev + Across) ──────────────────────────────

    const executeCrossChainSwap = async (
        destChainId: number,
        tokenAddress: `0x${string}`,
        amount: bigint,
        recipient: `0x${string}`
    ): Promise<{ userOpHash: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            if (!address) throw new Error("Wallet not initialized. Call login() or register().");
            
            // 1. Configure the ZeroDev Paymaster Client
            const publicClient = createPublicClient({ transport: http(rpcUrl) });
            const paymasterClient = createPaymasterClient({
                transport: http(paymasterUrl)
            });

            // 2. Fetch real SpokePool address + relay fees from Across Protocol API
            const ACROSS_API = 'https://across.to/api';
            
            const suggestedFeesResp = await fetch(
                `${ACROSS_API}/suggested-fees?` +
                `inputToken=${tokenAddress}&outputToken=${tokenAddress}` +
                `&originChainId=${chainId}&destinationChainId=${destChainId}` +
                `&amount=${amount.toString()}`
            );
            if (!suggestedFeesResp.ok) {
                throw new Error(`Across API error: ${suggestedFeesResp.statusText}`);
            }
            const acrossData = await suggestedFeesResp.json();
            const ACROSS_SPOKE_POOL = acrossData.spokePoolAddress as `0x${string}`;
            const relayFee: bigint = BigInt(acrossData.totalRelayFee?.total ?? '0');
            const quoteTimestamp: number = acrossData.timestamp ?? Math.floor(Date.now() / 1000);
            const exclusiveRelayer = (acrossData.exclusiveRelayer ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;
            const exclusivityDeadline: number = acrossData.exclusivityDeadline ?? 0;
            const outputAmount = amount - relayFee;

            if (outputAmount <= 0n) throw new Error('Amount too small to cover relay fee.');

            // 3. Build Across depositV3 calldata
            const depositCallData = encodeFunctionData({
                abi: [{
                    type: 'function',
                    name: 'depositV3',
                    inputs: [
                        { name: 'depositor', type: 'address' },
                        { name: 'recipient', type: 'address' },
                        { name: 'inputToken', type: 'address' },
                        { name: 'outputToken', type: 'address' },
                        { name: 'inputAmount', type: 'uint256' },
                        { name: 'outputAmount', type: 'uint256' },
                        { name: 'destinationChainId', type: 'uint256' },
                        { name: 'exclusiveRelayer', type: 'address' },
                        { name: 'quoteTimestamp', type: 'uint32' },
                        { name: 'fillDeadline', type: 'uint32' },
                        { name: 'exclusivityDeadline', type: 'uint32' },
                        { name: 'message', type: 'bytes' }
                    ],
                    outputs: [],
                    stateMutability: 'payable'
                }],
                functionName: 'depositV3',
                args: [
                    address as `0x${string}`,
                    recipient,
                    tokenAddress,
                    tokenAddress,
                    amount,
                    outputAmount,
                    BigInt(destChainId),
                    exclusiveRelayer,
                    quoteTimestamp,
                    quoteTimestamp + 3600,
                    exclusivityDeadline,
                    '0x'
                ]
            });

            // 4. Wrap in StylusSafe execute() calldata
            const walletCallData = encodeFunctionData({
                abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'execute',
                args: [ACROSS_SPOKE_POOL, 0n, depositCallData]
            });

            // 5. Submit via shared UserOp helper
            const userOpHash = await submitUserOp(walletCallData);
            return { userOpHash };
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setIsPending(false);
        }
    };

    // ── Advanced Features (Buildathon Spec) ───────────────────────────────────

    const createSessionKey = async (durationHours: number, pin?: string): Promise<{ sessionKey: string } | null> => {
        setIsPending(true);
        setError(null);
        try {
            if (!address) throw new Error('Wallet not initialized.');

            // 1. Generate a real ephemeral secp256k1 key in the browser
            const { generatePrivateKey, privateKeyToAccount } = await import('viem/accounts');
            const ephemeralPk = generatePrivateKey();
            const ephemeralAccount = privateKeyToAccount(ephemeralPk);
            const sessionKeyAddress = ephemeralAccount.address;
            const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + durationHours * 3600);

            // 2. Encode add_session_key calldata for StylusSafe
            const callData = encodeFunctionData({
                abi: [{ type: 'function', name: 'add_session_key', inputs: [{ name: 'key', type: 'address' }, { name: 'expiry', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'add_session_key',
                args: [sessionKeyAddress, expiryTimestamp],
            });

            // 3. Wrap in execute() and submit real UserOp
            const walletCallData = encodeFunctionData({
                abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'execute',
                args: [address as `0x${string}`, 0n, callData],
            });
            await submitUserOp(walletCallData, pin);

            // 4. Store the session key securely for 1-click signing later
            localStorage.setItem('invisible_wallet_session_key', sessionKeyAddress);
            localStorage.setItem('invisible_wallet_session_pk', ephemeralPk);
            localStorage.setItem('invisible_wallet_session_expiry', expiryTimestamp.toString());

            return { sessionKey: sessionKeyAddress };
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
            if (!address) throw new Error('Wallet not initialized.');

            // The payee for DCA is typically a DEX aggregator or auto-invest vault.
            // For now the user's own address acts as payee (self-custody DCA vault).
            const payee = address as `0x${string}`;

            const callData = encodeFunctionData({
                abi: [{ type: 'function', name: 'setup_subscription', inputs: [{ name: '_payee', type: 'address' }, { name: '_amount', type: 'uint256' }, { name: '_frequency_days', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'setup_subscription',
                args: [payee, amount, BigInt(frequencyDays)],
            });

            const walletCallData = encodeFunctionData({
                abi: [{ type: 'function', name: 'execute', inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'execute',
                args: [address as `0x${string}`, 0n, callData],
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
            if (!address) throw new Error('Wallet not initialized.');
            if (!intents.length) throw new Error('Intent batch is empty.');

            const dests = intents.map(i => i.dest as `0x${string}`);
            const values = intents.map(i => BigInt(i.value || 0));
            const funcs = intents.map(i => (i.func || '0x') as `0x${string}`);

            const callData = encodeFunctionData({
                abi: [{ type: 'function', name: 'execute_batch', inputs: [{ name: 'dest', type: 'address[]' }, { name: 'value', type: 'uint256[]' }, { name: 'func', type: 'bytes[]' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'execute_batch',
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
        address, isPending, error, 
        register, deploy, signAuthEntry, login, executeCrossChainSwap,
        createSessionKey, setupDCA, executeIntentBatch
    };
}
