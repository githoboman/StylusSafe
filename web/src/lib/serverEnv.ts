/**
 * Server-only configuration. Values come exclusively from environment variables
 * (web/.env.local in development, the hosting provider's env settings in production).
 * Nothing here is ever sent to the browser, and no secret is hard-coded in source.
 * Only import this from route handlers (src/app/api/**).
 */

export function serverEnv(name: string): string | undefined {
    const v = process.env[name];
    return v && v.trim() ? v.trim() : undefined;
}

/** Upstream Arbitrum Sepolia RPC. Prefers ARBITRUM_SEPOLIA_RPC_URL, else builds from ALCHEMY_API_KEY. */
export function arbitrumSepoliaRpc(): string {
    const explicit = serverEnv('ARBITRUM_SEPOLIA_RPC_URL');
    if (explicit) return explicit;
    const alchemy = serverEnv('ALCHEMY_API_KEY');
    if (alchemy) return `https://arb-sepolia.g.alchemy.com/v2/${alchemy}`;
    return 'https://sepolia-rollup.arbitrum.io/rpc';
}

export const PUBLIC_ARB_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
