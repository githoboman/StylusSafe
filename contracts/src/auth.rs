extern crate alloc;

use alloy_primitives::{Address, B256};
use stylus_sdk::{call::RawCall, prelude::Host};
use crate::WalletError;
use alloc::vec::Vec;

const BASE64URL: &[u8] =
    b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/// WebAuthn authenticator data flag bits (W3C WebAuthn §6.1)
const AUTH_DATA_FLAG_UP: u8 = 0x01; // User Present (bit 0)
const AUTH_DATA_FLAG_UV: u8 = 0x04; // User Verified (bit 2)

/// Encode a 32-byte digest as unpadded 43-character base64url.
pub fn base64url_encode_32(input: &[u8; 32]) -> [u8; 43] {
    let mut out = [0u8; 43];
    let mut o = 0usize;
    let mut i = 0usize;
    while i + 3 <= 30 {
        let b0 = input[i] as u32;
        let b1 = input[i + 1] as u32;
        let b2 = input[i + 2] as u32;
        out[o]     = BASE64URL[((b0 >> 2) & 0x3f) as usize];
        out[o + 1] = BASE64URL[(((b0 << 4) | (b1 >> 4)) & 0x3f) as usize];
        out[o + 2] = BASE64URL[(((b1 << 2) | (b2 >> 6)) & 0x3f) as usize];
        out[o + 3] = BASE64URL[(b2 & 0x3f) as usize];
        i += 3;
        o += 4;
    }
    let b0 = input[30] as u32;
    let b1 = input[31] as u32;
    out[40] = BASE64URL[((b0 >> 2) & 0x3f) as usize];
    out[41] = BASE64URL[(((b0 << 4) | (b1 >> 4)) & 0x3f) as usize];
    out[42] = BASE64URL[((b1 << 2) & 0x3f) as usize];
    out
}

/// Checks if an exact JSON key-value pair `"<key>":"<value>"` (with optional whitespace after `:`)
/// is present in `client_data_json` and properly delimited by quotes.
pub fn json_string_field_equals(json: &[u8], key: &[u8], expected_value: &[u8]) -> bool {
    // Match `"<key>":` followed by optional spaces and `"<expected_value>"`
    let mut pat = Vec::with_capacity(key.len() + 3);
    pat.push(b'"');
    pat.extend_from_slice(key);
    pat.extend_from_slice(b"\":");

    if json.len() < pat.len() + expected_value.len() + 2 {
        return false;
    }

    for start in 0..=(json.len() - pat.len()) {
        if &json[start..start + pat.len()] == pat.as_slice() {
            let mut idx = start + pat.len();
            while idx < json.len() && (json[idx] == b' ' || json[idx] == b'\t') {
                idx += 1;
            }
            if idx >= json.len() || json[idx] != b'"' {
                continue;
            }
            idx += 1; // skip opening quote of value
            if idx + expected_value.len() >= json.len() {
                continue;
            }
            if &json[idx..idx + expected_value.len()] == expected_value
                && json[idx + expected_value.len()] == b'"'
            {
                return true;
            }
        }
    }
    false
}

/// Checks if `"crossOrigin":true` or `"crossOrigin": true` is present in `client_data_json`.
pub fn is_cross_origin_true(json: &[u8]) -> bool {
    let key = b"\"crossOrigin\":";
    if json.len() < key.len() + 4 {
        return false;
    }
    for start in 0..=(json.len() - key.len()) {
        if &json[start..start + key.len()] == key {
            let mut idx = start + key.len();
            while idx < json.len() && (json[idx] == b' ' || json[idx] == b'\t') {
                idx += 1;
            }
            if idx + 4 <= json.len() && &json[idx..idx + 4] == b"true" {
                return true;
            }
        }
    }
    false
}

/// Verifies that the challenge in `clientDataJSON` matches either:
/// 1) Standard base64url(signature_payload) (43 chars), or
/// 2) Lowercase hex(signature_payload) (64 chars, used by PIN mode software authenticator)
/// AND is strictly delimited inside `"challenge":"..."`.
pub fn verify_challenge_field(client_data_json: &[u8], signature_payload: &[u8; 32]) -> bool {
    let b64_challenge = base64url_encode_32(signature_payload);
    if json_string_field_equals(client_data_json, b"challenge", &b64_challenge) {
        return true;
    }

    // Also allow exact 64-char hex challenge inside `"challenge":"..."` for PIN-mode software P-256 keys
    const HEX_CHARS: &[u8] = b"0123456789abcdef";
    let mut hex_challenge = [0u8; 64];
    for (i, &b) in signature_payload.iter().enumerate() {
        hex_challenge[i * 2] = HEX_CHARS[(b >> 4) as usize];
        hex_challenge[i * 2 + 1] = HEX_CHARS[(b & 0x0f) as usize];
    }
    json_string_field_equals(client_data_json, b"challenge", &hex_challenge)
}

/// Trait abstracting cryptographic precompiles so WebAuthn verification can be
/// unit-tested natively (`cargo test`) and executed via Arbitrum precompiles on-chain.
pub trait CryptoBackend {
    fn sha256(&self, data: &[u8]) -> Result<[u8; 32], WalletError>;
    fn p256_verify(
        &self,
        message_hash: &[u8; 32],
        r_s: &[u8; 64],
        pub_key_xy: &[u8; 64],
    ) -> Result<bool, WalletError>;
    fn ecrecover(
        &self,
        message_hash: &[u8; 32],
        v: u8,
        r: &[u8; 32],
        s: &[u8; 32],
    ) -> Result<Address, WalletError>;
}

pub struct StylusHostBackend<'a, H: Host>(pub &'a H);

impl<'a, H: Host> CryptoBackend for StylusHostBackend<'a, H> {
    fn sha256(&self, data: &[u8]) -> Result<[u8; 32], WalletError> {
        let mut addr = [0u8; 20];
        addr[19] = 2; // 0x02 SHA-256 precompile
        let precompile = Address::from(addr);

        let result = unsafe {
            RawCall::new_static(self.0)
                .call(precompile, data)
                .map_err(|_| WalletError::CallFailed)?
        };
        if result.len() == 32 {
            let mut out = [0u8; 32];
            out.copy_from_slice(&result);
            Ok(out)
        } else {
            Err(WalletError::CallFailed)
        }
    }

    fn p256_verify(
        &self,
        message_hash: &[u8; 32],
        r_s: &[u8; 64],
        pub_key_xy: &[u8; 64],
    ) -> Result<bool, WalletError> {
        // EIP-7212 / RIP-7212 P256VERIFY precompile at 0x0100
        // Input: hash32 | r32 | s32 | x32 | y32 (160 bytes)
        let mut p256_input = [0u8; 160];
        p256_input[0..32].copy_from_slice(message_hash);
        p256_input[32..96].copy_from_slice(r_s);
        p256_input[96..160].copy_from_slice(pub_key_xy);

        let mut addr = [0u8; 20];
        addr[18] = 1; // 0x0100
        let precompile = Address::from(addr);

        let result = unsafe {
            RawCall::new_static(self.0)
                .call(precompile, &p256_input)
                .map_err(|_| WalletError::SignatureVerificationFailed)?
        };
        Ok(result.len() == 32 && result[31] == 1)
    }

    fn ecrecover(
        &self,
        message_hash: &[u8; 32],
        v: u8,
        r: &[u8; 32],
        s: &[u8; 32],
    ) -> Result<Address, WalletError> {
        // EVM ecrecover precompile at 0x01
        // Input: hash32 | v32 | r32 | s32 (128 bytes)
        let mut input = [0u8; 128];
        input[0..32].copy_from_slice(message_hash);
        input[63] = if v < 27 { v + 27 } else { v };
        input[64..96].copy_from_slice(r);
        input[96..128].copy_from_slice(s);

        let mut addr = [0u8; 20];
        addr[19] = 1; // 0x01 ecrecover
        let precompile = Address::from(addr);

        let result = unsafe {
            RawCall::new_static(self.0)
                .call(precompile, &input)
                .map_err(|_| WalletError::SignatureVerificationFailed)?
        };
        if result.len() == 32 {
            let recovered = Address::from_slice(&result[12..32]);
            if recovered.is_zero() {
                return Err(WalletError::SignatureVerificationFailed);
            }
            Ok(recovered)
        } else {
            Err(WalletError::SignatureVerificationFailed)
        }
    }
}

/// Core WebAuthn P-256 verification logic (Audit H1 hardened).
///
/// Validates:
/// 1. Uncompressed P-256 public key format (`0x04 || X || Y`, 65 bytes)
/// 2. `authData` minimum length (>= 37 bytes: 32B rpIdHash + 1B flags + 4B signCount)
/// 3. `authData[0..32] == SHA256(rp_id)`
/// 4. `authData` flags: User Present (`UP = 0x01`) AND User Verified (`UV = 0x04`)
/// 5. `clientDataJSON` `"type":"webauthn.get"`
/// 6. `clientDataJSON` `"challenge":"<base64url(userOpHash)>"`
/// 7. `clientDataJSON` `"origin":"<expected_origin>"`
/// 8. `clientDataJSON` `"crossOrigin"` is not `true`
/// 9. P-256 ECDSA signature over `SHA256(authData || SHA256(clientDataJSON))`
/// 10. Returns the 32-bit `signCount` from `authData[33..37]` for replay protection.
pub fn verify_webauthn_with_backend<B: CryptoBackend>(
    backend: &B,
    signature_payload: &B256,
    public_key_bytes: &[u8; 65],
    auth_data: &[u8],
    client_data_json: &[u8],
    signature_bytes: &[u8; 64],
    rp_id: &str,
    expected_origin: &str,
    last_sign_count: u32,
) -> Result<u32, WalletError> {
    // 1. Validate uncompressed P-256 key prefix (0x04)
    if public_key_bytes[0] != 0x04 {
        return Err(WalletError::InvalidPublicKey);
    }

    // 2. Validate minimum authenticatorData length (32B rpIdHash + 1B flags + 4B signCount)
    if auth_data.len() < 37 {
        return Err(WalletError::InvalidSignature);
    }

    // 3. Verify RP ID hash matches authData[0..32]
    let rp_id_hash = backend.sha256(rp_id.as_bytes())?;
    if &auth_data[0..32] != rp_id_hash.as_slice() {
        return Err(WalletError::RpIdMismatch);
    }

    // 4. Verify User Present (UP = 0x01) and User Verified (UV = 0x04) flags
    let flags = auth_data[32];
    if (flags & AUTH_DATA_FLAG_UP) == 0 || (flags & AUTH_DATA_FLAG_UV) == 0 {
        return Err(WalletError::InvalidSignature);
    }

    // 5. Parse big-endian u32 signCount from authData[33..37] and enforce monotonic progression
    // Per W3C WebAuthn §6.1: if either stored or new signCount is non-zero, new must be > stored.
    let sign_count = u32::from_be_bytes([
        auth_data[33],
        auth_data[34],
        auth_data[35],
        auth_data[36],
    ]);
    if (last_sign_count > 0 || sign_count > 0) && sign_count <= last_sign_count {
        return Err(WalletError::SignatureVerificationFailed);
    }

    // 6. Verify `"type":"webauthn.get"`
    if !json_string_field_equals(client_data_json, b"type", b"webauthn.get") {
        return Err(WalletError::InvalidSignature);
    }

    // 7. Verify `"challenge":"<base64url(signature_payload)>"`
    if !verify_challenge_field(client_data_json, &signature_payload.0) {
        return Err(WalletError::InvalidChallenge);
    }

    // 8. Verify `"origin":"<expected_origin>"`
    if !json_string_field_equals(client_data_json, b"origin", expected_origin.as_bytes()) {
        return Err(WalletError::OriginMismatch);
    }

    // 9. Reject cross-origin assertions (`"crossOrigin":true`)
    if is_cross_origin_true(client_data_json) {
        return Err(WalletError::OriginMismatch);
    }

    // 10. Compute SHA256(authData || SHA256(clientDataJSON)) and verify P-256 signature
    let client_data_hash = backend.sha256(client_data_json)?;
    let mut message = Vec::with_capacity(auth_data.len() + 32);
    message.extend_from_slice(auth_data);
    message.extend_from_slice(&client_data_hash);
    let message_hash = backend.sha256(&message)?;

    let mut pub_key_xy = [0u8; 64];
    pub_key_xy.copy_from_slice(&public_key_bytes[1..65]);

    let verified = backend.p256_verify(&message_hash, signature_bytes, &pub_key_xy)?;
    if !verified {
        return Err(WalletError::SignatureVerificationFailed);
    }

    Ok(sign_count)
}

/// Host wrapper for Stylus contract execution
pub fn verify_webauthn<H: Host>(
    host: &H,
    signature_payload: &B256,
    public_key_bytes: &[u8; 65],
    auth_data: &[u8],
    client_data_json: &[u8],
    signature_bytes: &[u8; 64],
    rp_id: &str,
    expected_origin: &str,
    last_sign_count: u32,
) -> Result<u32, WalletError> {
    let backend = StylusHostBackend(host);
    verify_webauthn_with_backend(
        &backend,
        signature_payload,
        public_key_bytes,
        auth_data,
        client_data_json,
        signature_bytes,
        rp_id,
        expected_origin,
        last_sign_count,
    )
}

/// Verify an ECDSA secp256k1 session key signature (65 bytes: r[32] || s[32] || v[1])
/// over either raw `user_op_hash` or EIP-191 personal_sign hash.
pub fn verify_session_key_ecdsa<B: CryptoBackend>(
    backend: &B,
    user_op_hash: &B256,
    sig65: &[u8; 65],
    expected_session_key: Address,
) -> Result<(), WalletError> {
    if expected_session_key.is_zero() {
        return Err(WalletError::SignatureVerificationFailed);
    }
    let mut r = [0u8; 32];
    let mut s = [0u8; 32];
    r.copy_from_slice(&sig65[0..32]);
    s.copy_from_slice(&sig65[32..64]);
    let v = sig65[64];

    // Check raw digest recovery first
    if let Ok(recovered) = backend.ecrecover(&user_op_hash.0, v, &r, &s) {
        if recovered == expected_session_key {
            return Ok(());
        }
    }

    // Also support EIP-191 eth_sign digest (`\x19Ethereum Signed Message:\n32` || user_op_hash)
    let mut eth_signed = [0u8; 60];
    eth_signed[0..28].copy_from_slice(b"\x19Ethereum Signed Message:\n32");
    eth_signed[28..60].copy_from_slice(&user_op_hash.0);
    let digest = alloy_primitives::keccak256(eth_signed);
    let recovered = backend.ecrecover(&digest.0, v, &r, &s)?;
    if recovered == expected_session_key {
        Ok(())
    } else {
        Err(WalletError::SignatureVerificationFailed)
    }
}
