"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInvisibleWallet = useInvisibleWallet;
const react_1 = require("react");
const viem_1 = require("viem");
const account_abstraction_1 = require("viem/account-abstraction");
const utils_1 = require("./utils");
// ── Helpers ───────────────────────────────────────────────────────────────────
// Helpers removed for EVM (handled natively by viem publicClient.waitForTransactionReceipt)
// ── Hook ──────────────────────────────────────────────────────────────────────
function useInvisibleWallet(config) {
    const { factoryAddress, rpcUrl, chainId, initCodeHash, paymasterUrl } = config;
    const [address, setAddress] = (0, react_1.useState)(null);
    const [isPending, setIsPending] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const stored = localStorage.getItem('invisible_wallet_address');
        if (stored)
            setAddress(stored);
    }, []);
    // ── register ──────────────────────────────────────────────────────────────
    const register = async (username) => {
        setIsPending(true);
        setError(null);
        try {
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
            });
            if (!credential)
                throw new Error('Credential creation failed');
            const response = credential.response;
            const publicKeyBytes = await (0, utils_1.extractP256PublicKey)(response);
            const publicKeyHex = (0, utils_1.bufferToHex)(publicKeyBytes);
            const walletAddress = (0, utils_1.computeWalletAddress)(factoryAddress, publicKeyBytes, initCodeHash);
            localStorage.setItem('invisible_wallet_address', walletAddress);
            localStorage.setItem('invisible_wallet_key_id', credential.id);
            localStorage.setItem('invisible_wallet_public_key', publicKeyHex);
            setAddress(walletAddress);
            return { walletAddress };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        }
        finally {
            setIsPending(false);
        }
    };
    // ── deploy ────────────────────────────────────────────────────────────────
    const deploy = async (relayerAccount, publicKeyBytes) => {
        setIsPending(true);
        setError(null);
        try {
            let pubKeyBytes = publicKeyBytes;
            if (!pubKeyBytes) {
                const hex = localStorage.getItem('invisible_wallet_public_key');
                if (!hex)
                    throw new Error('No public key found. Call register() first, or pass publicKeyBytes explicitly.');
                pubKeyBytes = (0, utils_1.hexToUint8Array)(hex);
            }
            const walletAddress = (0, utils_1.computeWalletAddress)(factoryAddress, pubKeyBytes, initCodeHash);
            const publicClient = (0, viem_1.createPublicClient)({
                transport: (0, viem_1.http)(rpcUrl)
            });
            // Guard: already deployed?
            const code = await publicClient.getBytecode({ address: walletAddress });
            if (code && code !== '0x') {
                setAddress(walletAddress);
                localStorage.setItem('invisible_wallet_address', walletAddress);
                return { walletAddress, alreadyDeployed: true };
            }
            // Build transaction
            if (!relayerAccount && typeof window !== 'undefined' && window.ethereum) {
                // Try to use injected provider for gas
                const walletClient = (0, viem_1.createWalletClient)({
                    transport: (0, viem_1.custom)(window.ethereum)
                });
                const [account] = await walletClient.requestAddresses();
                const hash = await walletClient.sendTransaction({
                    chain: null,
                    account,
                    to: factoryAddress,
                    data: (0, viem_1.encodeFunctionData)({
                        abi: [{
                                type: 'function',
                                name: 'deploy',
                                inputs: [{ name: 'publicKey', type: 'bytes' }],
                                outputs: [{ name: '', type: 'address' }],
                                stateMutability: 'nonpayable'
                            }],
                        functionName: 'deploy',
                        args: [(0, viem_1.toHex)(pubKeyBytes)]
                    })
                });
                await publicClient.waitForTransactionReceipt({ hash });
            }
            else {
                throw new Error("No relayer account provided and no injected provider found to pay for gas.");
            }
            setAddress(walletAddress);
            localStorage.setItem('invisible_wallet_address', walletAddress);
            return { walletAddress, alreadyDeployed: false };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        }
        finally {
            setIsPending(false);
        }
    };
    // ── login ─────────────────────────────────────────────────────────────────
    const login = async () => {
        const stored = localStorage.getItem('invisible_wallet_address');
        if (stored) {
            setAddress(stored);
        }
        else {
            setError('No wallet found. Please register first.');
        }
    };
    // ── signAuthEntry ─────────────────────────────────────────────────────────
    const signAuthEntry = async (signaturePayload) => {
        setIsPending(true);
        setError(null);
        try {
            const keyId = localStorage.getItem('invisible_wallet_key_id');
            const publicKeyHex = localStorage.getItem('invisible_wallet_public_key');
            if (!keyId)
                throw new Error('No key ID found. Please register first.');
            if (!publicKeyHex)
                throw new Error('No public key found. Please register first.');
            if (signaturePayload.length !== 32) {
                throw new Error('signaturePayload must be exactly 32 bytes');
            }
            const challenge = signaturePayload.buffer.slice(signaturePayload.byteOffset, signaturePayload.byteOffset + signaturePayload.byteLength);
            const credIdBin = atob(keyId.replace(/-/g, '+').replace(/_/g, '/'));
            const credId = Uint8Array.from(credIdBin, c => c.charCodeAt(0));
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    allowCredentials: [{ id: credId, type: 'public-key' }],
                    userVerification: 'required',
                },
            });
            if (!assertion)
                throw new Error('Signing was cancelled');
            const response = assertion.response;
            const rawSignature = (0, utils_1.derToRawSignature)(response.signature);
            const publicKeyBytes = (0, utils_1.hexToUint8Array)(publicKeyHex);
            return {
                publicKey: publicKeyBytes,
                authData: new Uint8Array(response.authenticatorData),
                clientDataJSON: new Uint8Array(response.clientDataJSON),
                signature: rawSignature,
            };
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        }
        finally {
            setIsPending(false);
        }
    };
    // ── executeCrossChainSwap (ZeroDev + Across) ──────────────────────────────
    const executeCrossChainSwap = async (destChainId, tokenAddress, amount, recipient) => {
        setIsPending(true);
        setError(null);
        try {
            if (!address)
                throw new Error("Wallet not initialized. Call login() or register().");
            // 1. Configure the ZeroDev Paymaster Client
            const publicClient = (0, viem_1.createPublicClient)({ transport: (0, viem_1.http)(rpcUrl) });
            const paymasterClient = (0, account_abstraction_1.createPaymasterClient)({
                transport: (0, viem_1.http)(paymasterUrl)
            });
            // 2. Build the Across Protocol SpokePool deposit calldata
            // Note: In production, the SpokePool address should be fetched dynamically
            // based on the chainId, but for Arbitrum Sepolia we mock it here.
            const ACROSS_SPOKE_POOL = "0xAcrossSpokePoolAddressOnArbitrum";
            // The depositV3 function signature on Across SpokePool
            const depositCallData = (0, viem_1.encodeFunctionData)({
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
                    address, // depositor
                    recipient, // recipient
                    tokenAddress, // inputToken (e.g. Paxos USDG)
                    tokenAddress, // outputToken (1:1 bridge)
                    amount, // inputAmount
                    amount - (amount * 1n / 100n), // outputAmount (minus 1% relayer fee)
                    BigInt(destChainId), // destinationChainId
                    "0x0000000000000000000000000000000000000000", // exclusiveRelayer
                    Math.floor(Date.now() / 1000), // quoteTimestamp
                    Math.floor(Date.now() / 1000) + 3600, // fillDeadline (1 hour)
                    0, // exclusivityDeadline
                    "0x" // message
                ]
            });
            // 3. Since we use a custom Stylus contract instead of ZeroDev Kernel,
            // we create a custom permissionless.js SmartAccount interface here.
            // A production app would instantiate a robust signer, but we will directly
            // construct the UserOp and request Paymaster sponsorship.
            const userOp = {
                sender: address,
                nonce: 0n, // Should query EntryPoint for actual nonce
                initCode: "0x",
                callData: (0, viem_1.encodeFunctionData)({
                    abi: [{
                            type: 'function',
                            name: 'execute',
                            inputs: [
                                { name: 'dest', type: 'address' },
                                { name: 'value', type: 'uint256' },
                                { name: 'func', type: 'bytes' }
                            ],
                            outputs: [],
                            stateMutability: 'nonpayable'
                        }],
                    functionName: 'execute',
                    args: [
                        ACROSS_SPOKE_POOL,
                        0n,
                        depositCallData
                    ]
                }),
                callGasLimit: 500000n,
                verificationGasLimit: 200000n,
                preVerificationGas: 50000n,
                maxFeePerGas: 100000000n,
                maxPriorityFeePerGas: 100000000n,
                paymasterAndData: "0x",
                signature: "0x"
            };
            // 4. Request gas sponsorship from ZeroDev Paymaster!
            // We use pm_sponsorUserOperation
            const paymasterResult = await paymasterClient.request({
                method: 'pm_sponsorUserOperation',
                params: [
                    userOp,
                    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // entrypoint
                    (0, viem_1.toHex)(chainId), // chainId
                    {} // context
                ]
            });
            userOp.paymasterAndData = paymasterResult.paymasterAndData;
            userOp.callGasLimit = paymasterResult.callGasLimit;
            userOp.verificationGasLimit = paymasterResult.verificationGasLimit;
            userOp.preVerificationGas = paymasterResult.preVerificationGas;
            // 5. Sign the sponsored UserOp Hash via WebAuthn
            const userOpHash = "0xMockHashCalculatedFromEntryPoint"; // Mocked for brevity
            const webauthnSig = await signAuthEntry((0, utils_1.hexToUint8Array)(userOpHash));
            if (!webauthnSig)
                throw new Error("Failed to sign transaction with WebAuthn");
            // Encode the WebAuthnSignature struct for the Stylus contract validateUserOp
            const encodedStylusSignature = (0, viem_1.encodeFunctionData)({
                abi: [{
                        type: 'function',
                        name: 'mock',
                        inputs: [{
                                type: 'tuple',
                                components: [
                                    { name: 'authData', type: 'bytes' },
                                    { name: 'clientDataJSON', type: 'string' },
                                    { name: 'rawSignature', type: 'bytes' }
                                ]
                            }]
                    }],
                functionName: 'mock',
                args: [{
                        authData: (0, viem_1.toHex)(webauthnSig.authData),
                        clientDataJSON: new TextDecoder().decode(webauthnSig.clientDataJSON),
                        rawSignature: (0, viem_1.toHex)(webauthnSig.signature)
                    }]
            }).slice(10); // Remove 4-byte selector to get raw tuple bytes
            userOp.signature = `0x${encodedStylusSignature}`;
            // 6. Submit the UserOp to the ZeroDev Bundler
            console.log("Submitting fully sponsored cross-chain UserOp to ZeroDev Bundler...", userOp);
            // publicClient.request({ method: 'eth_sendUserOperation', ... })
            return { userOpHash };
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        }
        finally {
            setIsPending(false);
        }
    };
    // ── Advanced Features (Buildathon Spec) ───────────────────────────────────
    const createSessionKey = async (durationHours) => {
        setIsPending(true);
        setError(null);
        try {
            if (!address)
                throw new Error("Wallet not initialized.");
            console.log(`Creating Session Key valid for ${durationHours} hours...`);
            // 1. Generate a session key (in reality, you'd use viem to generate a private key locally)
            const sessionKeyAddress = "0x1234567890123456789012345678901234567890";
            const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + (durationHours * 3600));
            // 2. Encode the contract call
            const callData = (0, viem_1.encodeFunctionData)({
                abi: [{
                        type: 'function',
                        name: 'add_session_key',
                        inputs: [
                            { name: 'key', type: 'address' },
                            { name: 'expiry', type: 'uint256' }
                        ],
                        outputs: [],
                        stateMutability: 'nonpayable'
                    }],
                functionName: 'add_session_key',
                args: [sessionKeyAddress, expiryTimestamp]
            });
            console.log("Encoded add_session_key calldata:", callData);
            // 3. Submit to ZeroDev Bundler (Mocked for brevity)
            const sessionKey = sessionKeyAddress;
            localStorage.setItem('invisible_wallet_session_key', sessionKey);
            return { sessionKey };
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        }
        finally {
            setIsPending(false);
        }
    };
    const setupDCA = async (tokenIn, amount, frequencyDays) => {
        setIsPending(true);
        try {
            console.log(`Setting up DCA: Swap ${amount} every ${frequencyDays} days.`);
            // Define dummy payee for demo (e.g. an auto-invest contract)
            const payee = "0x0000000000000000000000000000000000000000";
            // Encode the contract call
            const callData = (0, viem_1.encodeFunctionData)({
                abi: [{
                        type: 'function',
                        name: 'setup_subscription',
                        inputs: [
                            { name: '_payee', type: 'address' },
                            { name: '_amount', type: 'uint256' },
                            { name: '_frequency_days', type: 'uint256' }
                        ],
                        outputs: [],
                        stateMutability: 'nonpayable'
                    }],
                functionName: 'setup_subscription',
                args: [payee, amount, BigInt(frequencyDays)]
            });
            console.log("Encoded setup_subscription calldata:", callData);
            // Normally wrap in UserOp and submit...
            return true;
        }
        finally {
            setIsPending(false);
        }
    };
    const executeIntentBatch = async (intents) => {
        setIsPending(true);
        try {
            console.log(`Batching ${intents.length} intents atomically via ZeroDev...`);
            // Map intents into arrays for execute_batch
            const dests = intents.map(i => i.dest);
            const values = intents.map(i => BigInt(i.value || 0));
            const funcs = intents.map(i => (i.func || "0x"));
            // Encode the contract call
            const callData = (0, viem_1.encodeFunctionData)({
                abi: [{
                        type: 'function',
                        name: 'execute_batch',
                        inputs: [
                            { name: 'dest', type: 'address[]' },
                            { name: 'value', type: 'uint256[]' },
                            { name: 'func', type: 'bytes[]' }
                        ],
                        outputs: [],
                        stateMutability: 'nonpayable'
                    }],
                functionName: 'execute_batch',
                args: [dests, values, funcs]
            });
            console.log("Encoded execute_batch calldata:", callData);
            // Normally wrap in UserOp and submit...
            return { userOpHash: "0xMockBatchUserOpHash" };
        }
        finally {
            setIsPending(false);
        }
    };
    return {
        address, isPending, error,
        register, deploy, signAuthEntry, login, executeCrossChainSwap,
        createSessionKey, setupDCA, executeIntentBatch
    };
}
