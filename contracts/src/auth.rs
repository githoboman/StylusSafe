extern crate alloc;

use alloy_primitives::{B256, Address};
use stylus_sdk::{call::RawCall, prelude::Host};
use crate::WalletError;
use alloc::vec::Vec;

const BASE64URL: &[u8] =
    b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

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

fn sha256<H: Host>(host: &H, data: &[u8]) -> Result<[u8; 32], WalletError> {
    let mut addr = [0u8; 20];
    addr[19] = 2; // SHA256 precompile
    let precompile = Address::from(addr);
    
    // unsafe block required for RawCall::call
    let result = unsafe {
        RawCall::new_static(host).call(precompile, data).map_err(|_| WalletError::CallFailed)?
    };
    if result.len() == 32 {
        let mut out = [0u8; 32];
        out.copy_from_slice(&result);
        Ok(out)
    } else {
        Err(WalletError::CallFailed)
    }
}

pub fn verify_webauthn<H: Host>(
    host: &H,
    signature_payload: &B256,
    public_key_bytes: &[u8; 65], // Uncompressed P-256 public key
    auth_data: &[u8],
    client_data_json: &[u8],
    signature_bytes: &[u8; 64], // Raw r || s signature
    rp_id: &str,
    expected_origin: &str,
) -> Result<(), WalletError> {
    
    if !challenge_is_present(client_data_json, &signature_payload.0) {
        return Err(WalletError::InvalidChallenge);
    }

    let client_data_hash = sha256(host, client_data_json)?;

    let mut message = Vec::with_capacity(auth_data.len() + 32);
    message.extend_from_slice(auth_data);
    message.extend_from_slice(&client_data_hash);
    let message_hash = sha256(host, &message)?;

    // Verify P-256 ECDSA using precompile 0x100
    // Input format: hash32 | r32 | s32 | x32 | y32 (160 bytes)
    let mut p256_input = [0u8; 160];
    p256_input[0..32].copy_from_slice(&message_hash);
    p256_input[32..96].copy_from_slice(signature_bytes); // r and s
    p256_input[96..160].copy_from_slice(&public_key_bytes[1..65]); // x and y

    let mut addr = [0u8; 20];
    addr[18] = 1; // 0x100 P256Verify precompile
    let precompile = Address::from(addr);
    
    let result = unsafe {
        RawCall::new_static(host).call(precompile, &p256_input)
            .map_err(|_| WalletError::SignatureVerificationFailed)?
    };
        
    // EIP-7212 returns 32 bytes containing 1 on success
    if result.len() != 32 || result[31] != 1 {
        return Err(WalletError::SignatureVerificationFailed);
    }

    let rp_id_hash = sha256(host, rp_id.as_bytes())?;
    
    if auth_data.len() < 32 {
        return Err(WalletError::RpIdMismatch);
    }
    let ad_prefix = &auth_data[0..32];
    if ad_prefix != rp_id_hash.as_slice() {
        return Err(WalletError::RpIdMismatch);
    }

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
