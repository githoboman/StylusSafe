extern crate alloc;

use alloy_primitives::B256;
use p256::ecdsa::{VerifyingKey, Signature, signature::hazmat::PrehashVerifier};
use sha2::{Sha256, Digest};
use crate::WalletError;

const BASE64URL: &[u8] =
    b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/// Base64url-encode exactly 32 bytes without padding.
fn base64url_encode_32(input: &[u8; 32]) -> [u8; 43] {
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

/// Verify that the base64url(signature_payload) string appears inside clientDataJSON.
fn challenge_is_present(client_data_json: &[u8], signature_payload: &[u8; 32]) -> bool {
    let needle = base64url_encode_32(signature_payload);
    let n_len = needle.len();
    let h_len = client_data_json.len();
    if h_len < n_len {
        return false;
    }
    'outer: for start in 0..=(h_len - n_len) {
        for j in 0..n_len {
            if client_data_json[start + j] != needle[j] {
                continue 'outer;
            }
        }
        return true;
    }
    false
}

/// Verify a full WebAuthn ES256 assertion against a payload hash (like userOpHash).
pub fn verify_webauthn(
    signature_payload: &B256,
    public_key_bytes: &[u8; 65], // Uncompressed P-256 public key
    auth_data: &[u8],
    client_data_json: &[u8],
    signature_bytes: &[u8; 64], // Raw r || s signature
    rp_id: &str,
    expected_origin: &str,
) -> Result<(), WalletError> {
    
    // 1. Verify the challenge in clientDataJSON is base64url(signature_payload)
    if !challenge_is_present(client_data_json, &signature_payload.0) {
        return Err(WalletError::InvalidChallenge);
    }

    // 2. SHA256(clientDataJSON)
    let client_data_hash: [u8; 32] = {
        let mut h = Sha256::new();
        h.update(client_data_json);
        h.finalize().into()
    };

    // 3. SHA256(authData || SHA256(clientDataJSON))
    let message_hash: [u8; 32] = {
        let mut h = Sha256::new();
        h.update(auth_data);
        h.update(client_data_hash);
        h.finalize().into()
    };

    // 4. Verify P-256 ECDSA signature over the message hash
    let verifying_key = VerifyingKey::from_sec1_bytes(public_key_bytes)
        .map_err(|_| WalletError::InvalidPublicKey)?;

    let sig_obj = Signature::from_bytes(signature_bytes.into())
        .map_err(|_| WalletError::InvalidSignature)?;

    verifying_key.verify_prehash(&message_hash, &sig_obj)
        .map_err(|_| WalletError::SignatureVerificationFailed)?;

    // 5. Verify rpIdHash
    let rp_id_hash = {
        let mut h = Sha256::new();
        h.update(rp_id.as_bytes());
        h.finalize()
    };
    
    if auth_data.len() < 32 {
        return Err(WalletError::RpIdMismatch);
    }
    let ad_prefix = &auth_data[0..32];
    if ad_prefix != rp_id_hash.as_slice() {
        return Err(WalletError::RpIdMismatch);
    }

    // 6. Verify origin in clientDataJSON
    let origin_bytes = expected_origin.as_bytes();
    let needle = b"\"origin\":\"";
    let n_len = needle.len();
    let origin_len = origin_bytes.len();
    let c_len = client_data_json.len();
    
    let mut found_origin = false;
    if c_len >= n_len + origin_len + 1 {
        let max_start = c_len - (n_len + origin_len + 1);
        for start in 0..=max_start {
            if &client_data_json[start..start + n_len] == needle {
                if &client_data_json[start + n_len..start + n_len + origin_len] == origin_bytes {
                    if client_data_json[start + n_len + origin_len] == b'"' {
                        found_origin = true;
                        break;
                    }
                }
            }
        }
    }
    
    if !found_origin {
        return Err(WalletError::OriginMismatch);
    }
    
    Ok(())
}
