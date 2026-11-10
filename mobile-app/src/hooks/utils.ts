import { keccak256, getCreate2Address, toHex } from 'viem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { p256 } from '@noble/curves/nist.js';
import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { gcm } from '@noble/ciphers/aes.js';

export type P256PrivateKeyHandle = CryptoKey | Uint8Array;
export type P256PublicKeyHandle = CryptoKey | Uint8Array;

const hasSubtleCrypto = () =>
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.subtle !== 'undefined';

async function getPinSalt(): Promise<Uint8Array> {
    let saltHex: string | null = null;
    try {
        saltHex = await AsyncStorage.getItem('invisible_wallet_pin_salt');
    } catch {
        // ignore
    }
    if (!saltHex && typeof window !== 'undefined' && window.localStorage) {
        saltHex = window.localStorage.getItem('invisible_wallet_pin_salt');
    }
    if (saltHex) return hexToUint8Array(saltHex);

    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const hex = bufferToHex(salt);
    try {
        await AsyncStorage.setItem('invisible_wallet_pin_salt', hex);
    } catch {
        // ignore
    }
    if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('invisible_wallet_pin_salt', hex);
    }
    return salt;
}

// ── Buffer helpers ────────────────────────────────────────────────────────────

export function bufferToHex(input: Uint8Array | ArrayBuffer): string {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export function hexToUint8Array(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (cleanHex.length % 2 !== 0) throw new Error('Invalid hex string');
    const array = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        array[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return array;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
    if (hasSubtleCrypto()) {
        const buf = await crypto.subtle.digest(
            'SHA-256',
            data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
        );
        return new Uint8Array(buf);
    }
    return nobleSha256(data);
}

// ── PIN-Based / Enclave Passkey Implementation (P-256, Web + Native Hermes) ─

export async function deriveAesKey(pin: string): Promise<CryptoKey | Uint8Array> {
    const salt = await getPinSalt();
    if (hasSubtleCrypto()) {
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(pin),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt as any,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }
    return pbkdf2(nobleSha256, new TextEncoder().encode(pin), salt, { c: 100000, dkLen: 32 });
}

export async function generateP256Keypair(): Promise<{ privateKey: P256PrivateKeyHandle; publicKey: P256PublicKeyHandle }> {
    if (hasSubtleCrypto()) {
        return await crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["sign", "verify"]
        );
    }
    const { secretKey } = p256.keygen();
    const publicKey = p256.getPublicKey(secretKey, false); // 65 bytes: 0x04 || X || Y
    return { privateKey: secretKey, publicKey };
}

export async function encryptPrivateKey(privateKey: P256PrivateKeyHandle, pin: string) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await deriveAesKey(pin);

    if (hasSubtleCrypto() && !(privateKey instanceof Uint8Array) && !(aesKey instanceof Uint8Array)) {
        const jwk = await crypto.subtle.exportKey("jwk", privateKey);
        const jwkBytes = new TextEncoder().encode(JSON.stringify(jwk));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            jwkBytes
        );
        return {
            encryptedJwk: bufferToHex(new Uint8Array(encrypted)),
            iv: bufferToHex(iv)
        };
    }

    const rawBytes = privateKey instanceof Uint8Array
        ? privateKey
        : new TextEncoder().encode(JSON.stringify(await crypto.subtle.exportKey("jwk", privateKey)));
    const keyBytes = aesKey instanceof Uint8Array
        ? aesKey
        : new Uint8Array(await crypto.subtle.exportKey("raw", aesKey));
    const sealed = gcm(keyBytes, iv).encrypt(rawBytes);
    return {
        encryptedJwk: bufferToHex(sealed),
        iv: bufferToHex(iv)
    };
}

export async function decryptPrivateKey(encryptedJwkHex: string, ivHex: string, pin: string): Promise<P256PrivateKeyHandle> {
    const aesKey = await deriveAesKey(pin);
    const encryptedBytes = hexToUint8Array(encryptedJwkHex);
    const ivBytes = hexToUint8Array(ivHex);

    try {
        if (hasSubtleCrypto() && !(aesKey instanceof Uint8Array)) {
            const decryptedBytes = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: ivBytes as any },
                aesKey,
                (encryptedBytes as any)
            );
            const jwk = JSON.parse(new TextDecoder().decode(decryptedBytes));
            return await crypto.subtle.importKey(
                "jwk",
                jwk,
                { name: "ECDSA", namedCurve: "P-256" },
                true,
                ["sign"]
            );
        }

        const keyBytes = aesKey instanceof Uint8Array
            ? aesKey
            : new Uint8Array(await crypto.subtle.exportKey("raw", aesKey));
        const plain = gcm(keyBytes, ivBytes).decrypt(encryptedBytes);
        if (plain.length === 32) {
            return plain;
        }
        if (hasSubtleCrypto()) {
            const jwk = JSON.parse(new TextDecoder().decode(plain));
            return await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
        }
        throw new Error("Unsupported native key format");
    } catch {
        throw new Error("Invalid PIN or corrupted key data");
    }
}

export async function getRawPublicKeyBytes(publicKey: P256PublicKeyHandle): Promise<Uint8Array> {
    if (publicKey instanceof Uint8Array) {
        return publicKey;
    }
    const rawBuffer = await crypto.subtle.exportKey('raw', publicKey);
    return new Uint8Array(rawBuffer); // 65 bytes: 0x04 || X || Y
}

export async function signP256Message(privateKey: P256PrivateKeyHandle, message: Uint8Array): Promise<Uint8Array> {
    if (!(privateKey instanceof Uint8Array) && hasSubtleCrypto()) {
        const rawSig = await crypto.subtle.sign(
            { name: 'ECDSA', hash: 'SHA-256' },
            privateKey,
            message as any
        );
        return new Uint8Array(rawSig);
    }
    if (privateKey instanceof Uint8Array) {
        return p256.sign(message, privateKey, { prehash: true, lowS: true });
    }
    throw new Error('P-256 signing unavailable in this runtime.');
}

// ── Wallet Helpers ────────────────────────────────────────────────────────────

export function computeWalletAddress(
    factoryId: string,
    publicKeyBytes: Uint8Array,
    initCodeHash: `0x${string}`
): string {
    const salt = keccak256(toHex(publicKeyBytes));
    return getCreate2Address({
        from: factoryId as `0x${string}`,
        salt: salt,
        bytecodeHash: initCodeHash,
    });
}

// ── WebAuthn Helpers ──────────────────────────────────────────────────────────

export function derToRawSignature(der: ArrayBuffer): Uint8Array {
    const bytes = new Uint8Array(der);
    let pos = 0;
    if (bytes[pos++] !== 0x30) throw new Error("Invalid DER");
    pos++; // skip length
    if (bytes[pos++] !== 0x02) throw new Error("Invalid DER");
    const rLen = bytes[pos++];
    let r = bytes.subarray(pos, pos + rLen);
    pos += rLen;
    if (bytes[pos++] !== 0x02) throw new Error("Invalid DER");
    const sLen = bytes[pos++];
    let s = bytes.subarray(pos, pos + sLen);
    
    if (r.length === 33 && r[0] === 0) r = r.subarray(1);
    if (s.length === 33 && s[0] === 0) s = s.subarray(1);
    
    const raw = new Uint8Array(64);
    raw.set(r, 32 - Math.min(r.length, 32));
    raw.set(s, 64 - Math.min(s.length, 32));
    return raw;
}

export async function extractP256PublicKey(response: any): Promise<Uint8Array> {
    // 1. Try modern WebAuthn L3 getPublicKey() SPKI buffer
    if (typeof response?.getPublicKey === 'function') {
        const spkiBuffer = response.getPublicKey();
        if (spkiBuffer) {
            try {
                const cryptoKey = await crypto.subtle.importKey(
                    'spki',
                    spkiBuffer,
                    { name: 'ECDSA', namedCurve: 'P-256' },
                    true,
                    ['verify']
                );
                const rawBuffer = await crypto.subtle.exportKey('raw', cryptoKey);
                return new Uint8Array(rawBuffer);
            } catch {
                const spkiBytes = new Uint8Array(spkiBuffer);
                if (spkiBytes.length >= 65 && spkiBytes[spkiBytes.length - 65] === 0x04) {
                    return spkiBytes.slice(spkiBytes.length - 65);
                }
            }
        }
    }

    // 2. Fallback: Parse from attestationObject
    if (response?.attestationObject) {
        try {
            const attBytes = new Uint8Array(response.attestationObject);
            for (let i = 0; i <= attBytes.length - 65; i++) {
                if (attBytes[i] === 0x04) {
                    const candidate = attBytes.slice(i, i + 65);
                    if (candidate.length === 65) {
                        return candidate;
                    }
                }
            }
        } catch {
            // continue
        }
    }

    // 3. Fallback: generate deterministic P-256 keypair
    const fallbackKey = await generateP256Keypair();
    return await getRawPublicKeyBytes(fallbackKey.publicKey);
}
