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
    register: (username: string) => Promise<RegisterResult>;
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
     */
    signAuthEntry: (signaturePayload: Uint8Array) => Promise<WebAuthnSignature | null>;
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
    executeCrossChainSwap: (destChainId: number, tokenAddress: `0x${string}`, amount: bigint, recipient: `0x${string}`) => Promise<{
        userOpHash: string;
    } | null>;
    /** Creates a temporary session key in the browser for 1-click trading */
    createSessionKey: (durationHours: number) => Promise<{
        sessionKey: string;
    } | null>;
    /** Sets up an automated DCA schedule (Pull Payment) */
    setupDCA: (tokenIn: `0x${string}`, amount: bigint, frequencyDays: number) => Promise<boolean>;
    /** Executes a batch of intents atomically across chains */
    executeIntentBatch: (intents: any[]) => Promise<{
        userOpHash: string;
    } | null>;
};
export declare function useInvisibleWallet(config: WalletConfig): InvisibleWallet;
export {};
