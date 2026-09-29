import { keccak256, getCreate2Address, toHex } from 'viem';

// ── Buffer helpers ────────────────────────────────────────────────────────────

export function bufferToHex(input: Uint8Array | ArrayBuffer): string {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export function hexToUint8Array(hex: string): Uint8Array {
    let cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (cleanHex.length % 2 !== 0) throw new Error('Invalid hex string');
    const array = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        array[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return array;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
    const buf = await crypto.subtle.digest(
        'SHA-256',
        data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    );
    return new Uint8Array(buf);
}

// ── PIN-Based Software Passkey Implementation (P-256) ─────────────────────────

export async function deriveAesKey(pin: string): Promise<CryptoKey> {
    let saltHex = localStorage.getItem('invisible_wallet_pin_salt');
    let salt: Uint8Array;
    if (saltHex) {
        salt = hexToUint8Array(saltHex);
    } else {
        salt = crypto.getRandomValues(new Uint8Array(16));
        localStorage.setItem('invisible_wallet_pin_salt', bufferToHex(salt));
    }

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
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function generateP256Keypair() {
    return await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
    );
}

export async function encryptPrivateKey(privateKey: CryptoKey, pin: string) {
    const jwk = await crypto.subtle.exportKey("jwk", privateKey);
    const jwkString = JSON.stringify(jwk);
    const jwkBytes = new TextEncoder().encode(jwkString);
    
    const aesKey = await deriveAesKey(pin);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
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

export async function decryptPrivateKey(encryptedJwkHex: string, ivHex: string, pin: string): Promise<CryptoKey> {
    const aesKey = await deriveAesKey(pin);
    const encryptedBytes = hexToUint8Array(encryptedJwkHex);
    const ivBytes = hexToUint8Array(ivHex);
    
    try {
        const decryptedBytes = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBytes },
            aesKey,
            encryptedBytes
        );
        const jwkString = new TextDecoder().decode(decryptedBytes);
        const jwk = JSON.parse(jwkString);
        
        return await crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["sign"]
        );
    } catch (e) {
        throw new Error("Invalid PIN or corrupted key data");
    }
}

export async function getRawPublicKeyBytes(publicKey: CryptoKey): Promise<Uint8Array> {
    const rawBuffer = await crypto.subtle.exportKey('raw', publicKey);
    return new Uint8Array(rawBuffer); // 65 bytes: 0x04 || X || Y
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
    // Stub for WebAuthn public key extraction (CBOR parsing is omitted here since we default to PIN mode for the web app UI)
    console.warn("extractP256PublicKey invoked. Returning dummy key. Ensure you are using PIN mode.");
    return new Uint8Array(65);
}
