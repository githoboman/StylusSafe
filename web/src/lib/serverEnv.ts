import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Server-only configuration. Values come exclusively from environment variables
 * (web/.env.local or git-ignored repo-root secret.txt in development, and the
 * hosting provider's env settings in production).
 * Nothing here is ever sent to the browser, and no secret is hard-coded in source.
 * Only import this from route handlers (src/app/api/**).
 */

let cachedLocalSecrets: Record<string, string> | null = null;

function loadLocalSecretFile(): Record<string, string> {
    if (cachedLocalSecrets) return cachedLocalSecrets;
    cachedLocalSecrets = {};
    try {
        const cwd = process.cwd();
        const repoRoot = resolve(cwd, '..');
        const candidates = [
            join(cwd, '.env.local'),
            join(repoRoot, '.env.local'),
            join(repoRoot, 'secret.txt'),
            join(repoRoot, 'secrets.txt'),
        ];

        for (const filePath of candidates) {
            if (!existsSync(filePath)) continue;
            const raw = readFileSync(filePath, 'utf8');
            for (const line of raw.split(/\r?\n/)) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx === -1) continue;
                const key = trimmed.slice(0, eqIdx).trim();
                const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
                if (key && val && !(key in cachedLocalSecrets)) {
                    cachedLocalSecrets[key] = val;
                }
            }
        }
    } catch {
        // Ignore fs read errors in serverless environments
    }
    return cachedLocalSecrets;
}

export function serverEnv(name: string, fallbackNames: string[] = []): string | undefined {
    const names = [name, ...fallbackNames];
    for (const k of names) {
        const v = process.env[k];
        if (v && v.trim()) return v.trim();
    }
    const local = loadLocalSecretFile();
    for (const k of names) {
        const v = local[k];
        if (v && v.trim()) return v.trim();
    }
    return undefined;
}

/** Upstream Arbitrum Sepolia RPC. Prefers ARBITRUM_SEPOLIA_RPC_URL, else builds from ALCHEMY_API_KEY. */
export function arbitrumSepoliaRpc(): string {
    const explicit = serverEnv('ARBITRUM_SEPOLIA_RPC_URL');
    if (explicit) return explicit;
    const alchemy = serverEnv('ALCHEMY_API_KEY');
    if (alchemy) return `https://arb-sepolia.g.alchemy.com/v2/${alchemy}`;
    return 'https://sepolia-rollup.arbitrum.io/rpc';
}

/** Server relayer private key for testnet USDG faucet & counterfactual wallet sponsorship */
export function serverRelayerKey(): `0x${string}` | undefined {
    const raw = serverEnv('DEPLOYER_PRIVATE_KEY', ['PRIVATE_KEY', 'STYLUS_DEPLOYER_PRIVATE_KEY']);
    if (!raw) return undefined;
    const hex = raw.startsWith('0x') ? raw : `0x${raw}`;
    return /^0x[0-9a-fA-F]{64}$/.test(hex) ? (hex as `0x${string}`) : undefined;
}

export const PUBLIC_ARB_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
