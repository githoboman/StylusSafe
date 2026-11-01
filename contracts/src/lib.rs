#![allow(unexpected_cfgs)]
extern crate alloc;

pub mod auth;

use alloy_primitives::{Address, B256, Bytes, U256};
use stylus_sdk::{
    call,
    prelude::*,
    storage::{StorageAddress, StorageBytes, StorageString, StorageU256},
};

#[derive(Debug, PartialEq)]
pub enum WalletError {
    InvalidChallenge,
    InvalidPublicKey,
    InvalidSignature,
    SignatureVerificationFailed,
    RpIdMismatch,
    OriginMismatch,
    NotEntryPoint,
    CallFailed,
    AlreadyInitialized,
    PolicyViolation,
    SessionExpired,
    TargetNotAllowed,
    DailyLimitExceeded,
    PerTxLimitExceeded,
}

impl From<WalletError> for Vec<u8> {
    fn from(err: WalletError) -> Vec<u8> {
        let msg = match err {
            WalletError::InvalidChallenge => "Invalid WebAuthn challenge",
            WalletError::InvalidPublicKey => "Invalid P-256 public key",
            WalletError::InvalidSignature => "Invalid signature format",
            WalletError::SignatureVerificationFailed => "Signature verification failed",
            WalletError::RpIdMismatch => "RP ID mismatch",
            WalletError::OriginMismatch => "Origin mismatch",
            WalletError::NotEntryPoint => "Caller is not the EntryPoint",
            WalletError::CallFailed => "Execution call failed",
            WalletError::AlreadyInitialized => "Already initialized",
            WalletError::PolicyViolation => "Agent policy violation",
            WalletError::SessionExpired => "Agent session key expired",
            WalletError::TargetNotAllowed => "Destination not in agent target allowlist",
            WalletError::DailyLimitExceeded => "Agent 24h spending limit exceeded",
            WalletError::PerTxLimitExceeded => "Agent per-tx spending cap exceeded",
        };
        msg.as_bytes().to_vec()
    }
}

/// Pure policy evaluation helper so unit tests can verify every agent firewall invariant
/// (expiry, target allowlist, per-tx cap, and rolling 24h window reset/accumulation).
pub fn evaluate_agent_policy(
    now_timestamp: U256,
    session_expiry: U256,
    max_per_tx: U256,
    daily_limit: U256,
    spent_today: U256,
    last_reset: U256,
    allowed_target: Address,
    target: Address,
    spend_value: U256,
) -> Result<(U256, U256), WalletError> {
    if session_expiry.is_zero() || now_timestamp >= session_expiry {
        return Err(WalletError::SessionExpired);
    }

    if !allowed_target.is_zero() && target != allowed_target {
        return Err(WalletError::TargetNotAllowed);
    }

    if !max_per_tx.is_zero() && spend_value > max_per_tx {
        return Err(WalletError::PerTxLimitExceeded);
    }

    let one_day = U256::from(86_400u64);
    let (current_spent, current_reset) = if now_timestamp >= last_reset.saturating_add(one_day) {
        (U256::ZERO, now_timestamp)
    } else {
        (spent_today, last_reset)
    };

    let new_spent = current_spent.saturating_add(spend_value);
    if !daily_limit.is_zero() && new_spent > daily_limit {
        return Err(WalletError::DailyLimitExceeded);
    }

    Ok((new_spent, current_reset))
}

/// Inspects inner `execute` or `executeBatch` calldata to extract `(target, effective_spend_value)`.
/// If the inner call is an ERC-20 `transfer(address,uint256)` (`0xa9059cbb`) or `approve(address,uint256)` (`0x095ea7b3`),
/// the ERC-20 token amount is included when `eth_value == 0`.
pub fn extract_execution_target_and_value(call_data: &[u8]) -> Option<(Address, U256)> {
    // Selector for execute(address,uint256,bytes) is 0xb61d27f6
    if call_data.len() >= 100 && &call_data[0..4] == &[0xb6, 0x1d, 0x27, 0xf6] {
        let dest = Address::from_slice(&call_data[16..36]);
        let mut val_bytes = [0u8; 32];
        val_bytes.copy_from_slice(&call_data[36..68]);
        let eth_val = U256::from_be_bytes(val_bytes);

        if !eth_val.is_zero() {
            return Some((dest, eth_val));
        }

        // Check if inner func bytes is ERC-20 transfer(address,uint256) or approve(address,uint256)
        let mut func_offset_bytes = [0u8; 32];
        func_offset_bytes.copy_from_slice(&call_data[68..100]);
        let func_offset: usize = U256::from_be_bytes(func_offset_bytes).try_into().unwrap_or(0);
        if call_data.len() >= 4 + func_offset + 32 {
            let mut func_len_bytes = [0u8; 32];
            func_len_bytes.copy_from_slice(&call_data[4 + func_offset..4 + func_offset + 32]);
            let func_len: usize = U256::from_be_bytes(func_len_bytes).try_into().unwrap_or(0);
            let func_start = 4 + func_offset + 32;
            if func_len >= 68 && call_data.len() >= func_start + 68 {
                let inner_sel = &call_data[func_start..func_start + 4];
                // 0xa9059cbb = transfer(address,uint256), 0x095ea7b3 = approve(address,uint256)
                if inner_sel == &[0xa9, 0x05, 0x9c, 0xbb] || inner_sel == &[0x09, 0x5e, 0xa7, 0xb3] {
                    let mut token_amt = [0u8; 32];
                    token_amt.copy_from_slice(&call_data[func_start + 36..func_start + 68]);
                    return Some((dest, U256::from_be_bytes(token_amt)));
                }
            }
        }
        return Some((dest, eth_val));
    }
    None
}

#[storage]
#[entrypoint]
pub struct StylusSafe {
    entry_point: StorageAddress,
    public_key: StorageBytes,
    rp_id: StorageString,
    origin: StorageString,
    sign_count: StorageU256,
    // Agent Spending Policy / Session Key Firewall state
    session_key: StorageAddress,
    session_expiry: StorageU256,
    session_max_per_tx: StorageU256,
    session_daily_limit: StorageU256,
    session_spent_today: StorageU256,
    session_last_reset: StorageU256,
    session_allowed_target: StorageAddress,
}

#[public]
impl StylusSafe {
    pub fn initialize(
        &mut self,
        entry_point: Address,
        public_key: Bytes,
        rp_id: String,
        origin: String,
    ) -> Result<(), Vec<u8>> {
        if !self.entry_point.get().is_zero() {
            return Err(WalletError::AlreadyInitialized.into());
        }
        if entry_point.is_zero() {
            return Err(WalletError::NotEntryPoint.into());
        }
        if public_key.len() != 65 || public_key[0] != 0x04 {
            return Err(WalletError::InvalidPublicKey.into());
        }
        self.entry_point.set(entry_point);
        self.public_key.set_bytes(&public_key);
        self.rp_id.set_str(&rp_id);
        self.origin.set_str(&origin);
        self.sign_count.set(U256::ZERO);
        Ok(())
    }

    /// ERC-4337 v0.6 account validation entrypoint.
    /// Supports:
    /// 1) Owner WebAuthn P-256 passkey signatures (unrestricted owner authority)
    /// 2) Agent Session Key ECDSA signatures (65 bytes raw `r||s||v` or `0x01 || r||s||v` 66 bytes),
    ///    strictly enforcing on-chain spending limits (`max_per_tx`, `daily_limit`, `expiry`, `allowed_target`).
    #[payable]
    pub fn validate_user_op(
        &mut self,
        user_op: (
            Address,
            U256,
            Bytes,
            Bytes,
            U256,
            U256,
            U256,
            U256,
            U256,
            Bytes,
            Bytes,
        ),
        user_op_hash: B256,
        missing_account_funds: U256,
    ) -> Result<U256, Vec<u8>> {
        let ep = self.entry_point.get();
        if self.vm().msg_sender() != ep {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }

        let sig_data: &[u8] = user_op.10.as_ref();
        let call_data: &[u8] = user_op.3.as_ref();

        // Check if this is an Agent Session Key ECDSA signature (65 bytes or 66 bytes prefixed with 0x01)
        let is_session_sig = sig_data.len() == 65 || (sig_data.len() == 66 && sig_data[0] == 0x01);

        if is_session_sig {
            let mut sig65 = [0u8; 65];
            if sig_data.len() == 65 {
                sig65.copy_from_slice(sig_data);
            } else {
                sig65.copy_from_slice(&sig_data[1..66]);
            }

            let active_session_key = self.session_key.get();
            let backend = auth::StylusHostBackend(self.vm());
            if auth::verify_session_key_ecdsa(&backend, &user_op_hash, &sig65, active_session_key).is_err() {
                return Ok(U256::from(1)); // SIG_VALIDATION_FAILED
            }

            // Enforce Agent Spending Firewall Policy on the UserOp callData
            let (target, spend_value) = match extract_execution_target_and_value(call_data) {
                Some(pair) => pair,
                None => return Ok(U256::from(1)), // Session keys may only invoke single `execute` calls
            };

            // Prevent session key from calling self (privilege escalation / modifying policy)
            if target == self.vm().contract_address() {
                return Ok(U256::from(1));
            }

            let now = U256::from(self.vm().block_timestamp());
            let expiry = self.session_expiry.get();
            let max_per_tx = self.session_max_per_tx.get();
            let daily_limit = self.session_daily_limit.get();
            let spent_today = self.session_spent_today.get();
            let last_reset = self.session_last_reset.get();
            let allowed_target = self.session_allowed_target.get();

            match evaluate_agent_policy(
                now,
                expiry,
                max_per_tx,
                daily_limit,
                spent_today,
                last_reset,
                allowed_target,
                target,
                spend_value,
            ) {
                Ok((new_spent, new_reset)) => {
                    self.session_spent_today.set(new_spent);
                    self.session_last_reset.set(new_reset);
                }
                Err(_) => {
                    return Ok(U256::from(1));
                }
            }
        } else {
            // Owner WebAuthn P-256 Signature Verification
            if sig_data.len() < 96 {
                return Ok(U256::from(1));
            }

            let mut offset_auth_data = [0u8; 32];
            offset_auth_data.copy_from_slice(&sig_data[0..32]);
            let offset1: usize = U256::from_be_bytes(offset_auth_data).try_into().unwrap_or(0);

            let mut offset_client_data = [0u8; 32];
            offset_client_data.copy_from_slice(&sig_data[32..64]);
            let offset2: usize = U256::from_be_bytes(offset_client_data).try_into().unwrap_or(0);

            let mut offset_raw_sig = [0u8; 32];
            offset_raw_sig.copy_from_slice(&sig_data[64..96]);
            let offset3: usize = U256::from_be_bytes(offset_raw_sig).try_into().unwrap_or(0);

            if sig_data.len() < offset1.saturating_add(32) {
                return Ok(U256::from(1));
            }
            let mut len_bytes = [0u8; 32];
            len_bytes.copy_from_slice(&sig_data[offset1..offset1 + 32]);
            let len1: usize = U256::from_be_bytes(len_bytes).try_into().unwrap_or(0);
            if sig_data.len() < offset1.saturating_add(32).saturating_add(len1) {
                return Ok(U256::from(1));
            }
            let auth_data = &sig_data[offset1 + 32..offset1 + 32 + len1];

            if sig_data.len() < offset2.saturating_add(32) {
                return Ok(U256::from(1));
            }
            len_bytes.copy_from_slice(&sig_data[offset2..offset2 + 32]);
            let len2: usize = U256::from_be_bytes(len_bytes).try_into().unwrap_or(0);
            if sig_data.len() < offset2.saturating_add(32).saturating_add(len2) {
                return Ok(U256::from(1));
            }
            let client_data_bytes = &sig_data[offset2 + 32..offset2 + 32 + len2];

            if sig_data.len() < offset3.saturating_add(32) {
                return Ok(U256::from(1));
            }
            len_bytes.copy_from_slice(&sig_data[offset3..offset3 + 32]);
            let len3: usize = U256::from_be_bytes(len_bytes).try_into().unwrap_or(0);
            if sig_data.len() < offset3.saturating_add(32).saturating_add(len3) || len3 < 64 {
                return Ok(U256::from(1));
            }
            let sig_bytes = &sig_data[offset3 + 32..offset3 + 32 + len3];

            let mut raw_sig = [0u8; 64];
            raw_sig.copy_from_slice(&sig_bytes[0..64]);

            let pub_key_vec = self.public_key.get_bytes();
            let pub_key_bytes: &[u8; 65] = match pub_key_vec.as_slice().try_into() {
                Ok(arr) => arr,
                Err(_) => return Ok(U256::from(1)),
            };
            let rp_id_str = self.rp_id.get_string();
            let origin_str = self.origin.get_string();
            let last_count: u32 = self.sign_count.get().try_into().unwrap_or(0u32);

            let new_count = match auth::verify_webauthn(
                self.vm(),
                &user_op_hash,
                pub_key_bytes,
                auth_data,
                client_data_bytes,
                &raw_sig,
                &rp_id_str,
                &origin_str,
                last_count,
            ) {
                Ok(c) => c,
                Err(_) => return Ok(U256::from(1)),
            };

            if new_count > last_count {
                self.sign_count.set(U256::from(new_count));
            }
        }

        // Audit H6: Pay missing_account_funds to EntryPoint when non-zero
        if !missing_account_funds.is_zero() {
            let ctx = Call::new_payable(self, missing_account_funds);
            let _ = call::call(self.vm(), ctx, ep, &[]);
        }

        Ok(U256::ZERO)
    }

    pub fn execute(&mut self, dest: Address, value: U256, func: Bytes) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }

        let ctx = Call::new_payable(self, value);
        call::call(self.vm(), ctx, dest, &func).map_err(|_| Vec::from(WalletError::CallFailed))?;

        Ok(())
    }

    pub fn execute_batch(
        &mut self,
        dest: Vec<Address>,
        value: Vec<U256>,
        func: Vec<Bytes>,
    ) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }

        if dest.len() != value.len() || dest.len() != func.len() {
            return Err("Mismatched batch array lengths".as_bytes().to_vec());
        }

        for i in 0..dest.len() {
            let ctx = Call::new_payable(self, value[i]);
            call::call(self.vm(), ctx, dest[i], &func[i])
                .map_err(|_| Vec::from(WalletError::CallFailed))?;
        }

        Ok(())
    }

    /// Registers a basic session key with default conservative policy limits (1 ETH per tx, 5 ETH/day)
    pub fn add_session_key(&mut self, key: Address, expiry: U256) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }
        let default_per_tx = U256::from(1_000_000_000_000_000_000u128); // 1e18
        let default_daily = U256::from(5_000_000_000_000_000_000u128); // 5e18
        self.session_key.set(key);
        self.session_expiry.set(expiry);
        self.session_max_per_tx.set(default_per_tx);
        self.session_daily_limit.set(default_daily);
        self.session_spent_today.set(U256::ZERO);
        self.session_last_reset
            .set(U256::from(self.vm().block_timestamp()));
        self.session_allowed_target.set(Address::ZERO);
        Ok(())
    }

    /// Configures a full on-chain Agent Spending Policy Firewall (Step 3).
    pub fn set_agent_policy(
        &mut self,
        key: Address,
        expiry: U256,
        max_per_tx: U256,
        daily_limit: U256,
        allowed_target: Address,
    ) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }
        self.session_key.set(key);
        self.session_expiry.set(expiry);
        self.session_max_per_tx.set(max_per_tx);
        self.session_daily_limit.set(daily_limit);
        self.session_spent_today.set(U256::ZERO);
        self.session_last_reset
            .set(U256::from(self.vm().block_timestamp()));
        self.session_allowed_target.set(allowed_target);
        Ok(())
    }

    /// Immediately revokes the active agent session key.
    pub fn revoke_session_key(&mut self) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }
        self.session_key.set(Address::ZERO);
        self.session_expiry.set(U256::ZERO);
        self.session_max_per_tx.set(U256::ZERO);
        self.session_daily_limit.set(U256::ZERO);
        self.session_spent_today.set(U256::ZERO);
        self.session_allowed_target.set(Address::ZERO);
        Ok(())
    }

    /// Executes an agent-initiated transaction directly when called by the authorized `session_key`,
    /// enforcing all on-chain policy constraints (`expiry`, `allowed_target`, `max_per_tx`, `daily_limit`).
    pub fn execute_with_policy(
        &mut self,
        dest: Address,
        value: U256,
        func: Bytes,
    ) -> Result<(), Vec<u8>> {
        let caller = self.vm().msg_sender();
        let active_key = self.session_key.get();
        if active_key.is_zero() || caller != active_key {
            return Err(Vec::from(WalletError::PolicyViolation));
        }
        if dest == self.vm().contract_address() {
            return Err(Vec::from(WalletError::TargetNotAllowed));
        }

        // Determine effective spend value (native ETH value or ERC-20 transfer/approve amount)
        let mut spend_value = value;
        if spend_value.is_zero() && func.len() >= 68 {
            let sel = &func[0..4];
            if sel == &[0xa9, 0x05, 0x9c, 0xbb] || sel == &[0x09, 0x5e, 0xa7, 0xb3] {
                let mut amt = [0u8; 32];
                amt.copy_from_slice(&func[36..68]);
                spend_value = U256::from_be_bytes(amt);
            }
        }

        let now = U256::from(self.vm().block_timestamp());
        let (new_spent, new_reset) = evaluate_agent_policy(
            now,
            self.session_expiry.get(),
            self.session_max_per_tx.get(),
            self.session_daily_limit.get(),
            self.session_spent_today.get(),
            self.session_last_reset.get(),
            self.session_allowed_target.get(),
            dest,
            spend_value,
        )?;

        self.session_spent_today.set(new_spent);
        self.session_last_reset.set(new_reset);

        let ctx = Call::new_payable(self, value);
        call::call(self.vm(), ctx, dest, &func).map_err(|_| Vec::from(WalletError::CallFailed))?;
        Ok(())
    }

    pub fn setup_subscription(
        &mut self,
        payee: Address,
        amount: U256,
        frequency_days: U256,
    ) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }
        // Configure recurring pull-payment / DCA allowance under the policy engine
        let duration_secs = frequency_days
            .saturating_mul(U256::from(86_400u64))
            .saturating_mul(U256::from(12u64));
        let now = U256::from(self.vm().block_timestamp());
        self.session_allowed_target.set(payee);
        self.session_max_per_tx.set(amount);
        self.session_daily_limit.set(amount);
        if self.session_expiry.get() < now.saturating_add(duration_secs) {
            self.session_expiry.set(now.saturating_add(duration_secs));
        }
        Ok(())
    }

    pub fn session_key(&self) -> Address {
        self.session_key.get()
    }

    pub fn session_expiry(&self) -> U256 {
        self.session_expiry.get()
    }

    pub fn session_max_per_tx(&self) -> U256 {
        self.session_max_per_tx.get()
    }

    pub fn session_daily_limit(&self) -> U256 {
        self.session_daily_limit.get()
    }

    pub fn session_spent_today(&self) -> U256 {
        self.session_spent_today.get()
    }

    pub fn session_allowed_target(&self) -> Address {
        self.session_allowed_target.get()
    }

    pub fn sign_count(&self) -> U256 {
        self.sign_count.get()
    }

    pub fn entry_point(&self) -> Address {
        self.entry_point.get()
    }

    #[receive]
    pub fn receive(&mut self) -> Result<(), Vec<u8>> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::{
        base64url_encode_32, verify_session_key_ecdsa, verify_webauthn_with_backend,
        CryptoBackend,
    };
    use alloy_primitives::{address, b256, keccak256};

    // Provide no-op C-ABI stubs for Stylus VM host imports when linking native `cargo test` binaries
    #[no_mangle]
    pub extern "C" fn storage_load_bytes32(_key: *const u8, _dest: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn storage_cache_bytes32(_key: *const u8, _bytes: *const u8) {}
    #[no_mangle]
    pub extern "C" fn storage_flush_cache(_clear: bool) {}
    #[no_mangle]
    pub extern "C" fn msg_sender(_sender: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn msg_value(_value: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn msg_reentrant() -> u32 {
        0
    }
    #[no_mangle]
    pub extern "C" fn contract_address(_addr: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn block_timestamp() -> u64 {
        1_700_000_000
    }
    #[no_mangle]
    pub extern "C" fn read_args(_dest: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn write_result(_data: *const u8, _len: usize) {}
    #[no_mangle]
    pub extern "C" fn return_data_size() -> usize {
        0
    }
    #[no_mangle]
    pub extern "C" fn read_return_data(_dest: *mut u8, _offset: usize, _size: usize) -> usize {
        0
    }
    #[no_mangle]
    pub extern "C" fn call_contract(
        _contract: *const u8,
        _calldata: *const u8,
        _calldata_len: usize,
        _value: *const u8,
        _gas: u64,
        _return_data_len: *mut usize,
    ) -> u8 {
        0
    }
    #[no_mangle]
    pub extern "C" fn static_call_contract(
        _contract: *const u8,
        _calldata: *const u8,
        _calldata_len: usize,
        _gas: u64,
        _return_data_len: *mut usize,
    ) -> u8 {
        0
    }
    #[no_mangle]
    pub extern "C" fn delegate_call_contract(
        _contract: *const u8,
        _calldata: *const u8,
        _calldata_len: usize,
        _gas: u64,
        _return_data_len: *mut usize,
    ) -> u8 {
        0
    }
    #[no_mangle]
    pub extern "C" fn native_keccak256(_bytes: *const u8, _len: usize, _output: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn pay_for_memory_grow(_pages: u16) {}
    #[no_mangle]
    pub extern "C" fn block_number() -> u64 {
        0
    }
    #[no_mangle]
    pub extern "C" fn block_basefee(_basefee: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn block_coinbase(_coinbase: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn block_gas_limit() -> u64 {
        30_000_000
    }
    #[no_mangle]
    pub extern "C" fn chainid() -> u64 {
        421614
    }
    #[no_mangle]
    pub extern "C" fn emit_log(_data: *const u8, _len: usize, _topics: usize) {}
    #[no_mangle]
    pub extern "C" fn account_code(
        _address: *const u8,
        _offset: usize,
        _size: usize,
        _dest: *mut u8,
    ) -> usize {
        0
    }
    #[no_mangle]
    pub extern "C" fn account_balance(_address: *const u8, _dest: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn account_codehash(_address: *const u8, _dest: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn account_code_size(_address: *const u8) -> usize {
        0
    }
    #[no_mangle]
    pub extern "C" fn tx_origin(_origin: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn evm_gas_left() -> u64 {
        10_000_000
    }
    #[no_mangle]
    pub extern "C" fn evm_ink_left() -> u64 {
        100_000_000_000
    }
    #[no_mangle]
    pub extern "C" fn tx_gas_price(_gas_price: *mut u8) {}
    #[no_mangle]
    pub extern "C" fn tx_ink_price() -> u32 {
        1
    }
    #[no_mangle]
    pub extern "C" fn create1(
        _code: *const u8,
        _code_len: usize,
        _endowment: *const u8,
        _contract: *mut u8,
        _revert_data_len: *mut usize,
    ) {
    }
    #[no_mangle]
    pub extern "C" fn create2(
        _code: *const u8,
        _code_len: usize,
        _endowment: *const u8,
        _salt: *const u8,
        _contract: *mut u8,
        _revert_data_len: *mut usize,
    ) {
    }

    /// Deterministic mock crypto backend for pure unit testing of all WebAuthn & ECDSA paths
    struct MockCryptoBackend {
        pub p256_valid: bool,
        pub recovered_signer: Address,
    }

    impl CryptoBackend for MockCryptoBackend {
        fn sha256(&self, data: &[u8]) -> Result<[u8; 32], WalletError> {
            // Use keccak256 as a deterministic 32-byte collision-resistant hash in unit tests
            Ok(keccak256(data).0)
        }

        fn p256_verify(
            &self,
            _message_hash: &[u8; 32],
            _r_s: &[u8; 64],
            _pub_key_xy: &[u8; 64],
        ) -> Result<bool, WalletError> {
            Ok(self.p256_valid)
        }

        fn ecrecover(
            &self,
            _message_hash: &[u8; 32],
            _v: u8,
            _r: &[u8; 32],
            _s: &[u8; 32],
        ) -> Result<Address, WalletError> {
            if self.recovered_signer.is_zero() {
                Err(WalletError::SignatureVerificationFailed)
            } else {
                Ok(self.recovered_signer)
            }
        }
    }

    fn build_valid_webauthn_fixture(
        backend: &MockCryptoBackend,
        challenge: &B256,
        rp_id: &str,
        origin: &str,
        flags: u8,
        sign_count: u32,
    ) -> ([u8; 65], Vec<u8>, Vec<u8>, [u8; 64]) {
        let mut pub_key = [0x11u8; 65];
        pub_key[0] = 0x04; // uncompressed P-256 point marker

        let rp_hash = backend.sha256(rp_id.as_bytes()).unwrap();
        let mut auth_data = Vec::with_capacity(37);
        auth_data.extend_from_slice(&rp_hash);
        auth_data.push(flags);
        auth_data.extend_from_slice(&sign_count.to_be_bytes());

        let b64_chall = base64url_encode_32(&challenge.0);
        let b64_str = core::str::from_utf8(&b64_chall).unwrap();
        let client_json = alloc::format!(
            r#"{{"type":"webauthn.get","challenge":"{}","origin":"{}","crossOrigin":false}}"#,
            b64_str,
            origin
        );

        let raw_sig = [0x22u8; 64];
        (pub_key, auth_data, client_json.into_bytes(), raw_sig)
    }

    #[test]
    fn test_webauthn_valid_assertion_passes() {
        let backend = MockCryptoBackend {
            p256_valid: true,
            recovered_signer: Address::ZERO,
        };
        let challenge = b256!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let (pub_key, auth_data, client_json, sig) = build_valid_webauthn_fixture(
            &backend,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x05, // UP (0x01) | UV (0x04)
            1,
        );

        let res = verify_webauthn_with_backend(
            &backend,
            &challenge,
            &pub_key,
            &auth_data,
            &client_json,
            &sig,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0,
        );
        assert_eq!(res, Ok(1));
    }

    #[test]
    fn test_webauthn_rejects_invalid_public_key_prefix() {
        let backend = MockCryptoBackend {
            p256_valid: true,
            recovered_signer: Address::ZERO,
        };
        let challenge = b256!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let (mut pub_key, auth_data, client_json, sig) = build_valid_webauthn_fixture(
            &backend,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x05,
            1,
        );
        pub_key[0] = 0x02; // compressed key prefix must be rejected

        let res = verify_webauthn_with_backend(
            &backend,
            &challenge,
            &pub_key,
            &auth_data,
            &client_json,
            &sig,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0,
        );
        assert_eq!(res, Err(WalletError::InvalidPublicKey));
    }

    #[test]
    fn test_webauthn_rejects_short_auth_data() {
        let backend = MockCryptoBackend {
            p256_valid: true,
            recovered_signer: Address::ZERO,
        };
        let challenge = b256!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let (pub_key, auth_data, client_json, sig) = build_valid_webauthn_fixture(
            &backend,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x05,
            1,
        );

        // Truncate authData to 36 bytes (< 37 minimum)
        let res = verify_webauthn_with_backend(
            &backend,
            &challenge,
            &pub_key,
            &auth_data[0..36],
            &client_json,
            &sig,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0,
        );
        assert_eq!(res, Err(WalletError::InvalidSignature));
    }

    #[test]
    fn test_webauthn_rejects_missing_up_or_uv_flags() {
        let backend = MockCryptoBackend {
            p256_valid: true,
            recovered_signer: Address::ZERO,
        };
        let challenge = b256!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

        // Missing UV flag (only UP = 0x01)
        let (pub_key, auth_data_no_uv, client_json, sig) = build_valid_webauthn_fixture(
            &backend,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x01,
            1,
        );
        assert_eq!(
            verify_webauthn_with_backend(
                &backend,
                &challenge,
                &pub_key,
                &auth_data_no_uv,
                &client_json,
                &sig,
                "stylussafe.xyz",
                "https://stylussafe.xyz",
                0,
            ),
            Err(WalletError::InvalidSignature)
        );

        // Missing UP flag (only UV = 0x04)
        let (_, auth_data_no_up, _, _) = build_valid_webauthn_fixture(
            &backend,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x04,
            1,
        );
        assert_eq!(
            verify_webauthn_with_backend(
                &backend,
                &challenge,
                &pub_key,
                &auth_data_no_up,
                &client_json,
                &sig,
                "stylussafe.xyz",
                "https://stylussafe.xyz",
                0,
            ),
            Err(WalletError::InvalidSignature)
        );
    }

    #[test]
    fn test_webauthn_rejects_replayed_or_decreasing_sign_count() {
        let backend = MockCryptoBackend {
            p256_valid: true,
            recovered_signer: Address::ZERO,
        };
        let challenge = b256!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let (pub_key, auth_data, client_json, sig) = build_valid_webauthn_fixture(
            &backend,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x05,
            5,
        );

        // Equal signCount (5 <= 5) must fail
        assert_eq!(
            verify_webauthn_with_backend(
                &backend,
                &challenge,
                &pub_key,
                &auth_data,
                &client_json,
                &sig,
                "stylussafe.xyz",
                "https://stylussafe.xyz",
                5,
            ),
            Err(WalletError::SignatureVerificationFailed)
        );

        // Lower signCount (5 <= 6) must fail
        assert_eq!(
            verify_webauthn_with_backend(
                &backend,
                &challenge,
                &pub_key,
                &auth_data,
                &client_json,
                &sig,
                "stylussafe.xyz",
                "https://stylussafe.xyz",
                6,
            ),
            Err(WalletError::SignatureVerificationFailed)
        );
    }

    #[test]
    fn test_webauthn_rejects_webauthn_create_type() {
        let backend = MockCryptoBackend {
            p256_valid: true,
            recovered_signer: Address::ZERO,
        };
        let challenge = b256!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let (pub_key, auth_data, _, sig) = build_valid_webauthn_fixture(
            &backend,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x05,
            1,
        );
        let b64_chall = base64url_encode_32(&challenge.0);
        let b64_str = core::str::from_utf8(&b64_chall).unwrap();
        // Attestation type "webauthn.create" instead of "webauthn.get"
        let bad_json = alloc::format!(
            r#"{{"type":"webauthn.create","challenge":"{}","origin":"https://stylussafe.xyz"}}"#,
            b64_str
        );

        assert_eq!(
            verify_webauthn_with_backend(
                &backend,
                &challenge,
                &pub_key,
                &auth_data,
                bad_json.as_bytes(),
                &sig,
                "stylussafe.xyz",
                "https://stylussafe.xyz",
                0,
            ),
            Err(WalletError::InvalidSignature)
        );
    }

    #[test]
    fn test_webauthn_rejects_challenge_in_wrong_json_field() {
        let backend = MockCryptoBackend {
            p256_valid: true,
            recovered_signer: Address::ZERO,
        };
        let challenge = b256!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let (pub_key, auth_data, _, sig) = build_valid_webauthn_fixture(
            &backend,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x05,
            1,
        );
        let b64_chall = base64url_encode_32(&challenge.0);
        let b64_str = core::str::from_utf8(&b64_chall).unwrap();
        // Challenge injected into another field while actual challenge is different
        let bad_json = alloc::format!(
            r#"{{"type":"webauthn.get","challenge":"AAAA","extra":"{}","origin":"https://stylussafe.xyz"}}"#,
            b64_str
        );

        assert_eq!(
            verify_webauthn_with_backend(
                &backend,
                &challenge,
                &pub_key,
                &auth_data,
                bad_json.as_bytes(),
                &sig,
                "stylussafe.xyz",
                "https://stylussafe.xyz",
                0,
            ),
            Err(WalletError::InvalidChallenge)
        );
    }

    #[test]
    fn test_webauthn_rejects_cross_origin_true() {
        let backend = MockCryptoBackend {
            p256_valid: true,
            recovered_signer: Address::ZERO,
        };
        let challenge = b256!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let (pub_key, auth_data, _, sig) = build_valid_webauthn_fixture(
            &backend,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x05,
            1,
        );
        let b64_chall = base64url_encode_32(&challenge.0);
        let b64_str = core::str::from_utf8(&b64_chall).unwrap();
        let cross_origin_json = alloc::format!(
            r#"{{"type":"webauthn.get","challenge":"{}","origin":"https://stylussafe.xyz","crossOrigin":true}}"#,
            b64_str
        );

        assert_eq!(
            verify_webauthn_with_backend(
                &backend,
                &challenge,
                &pub_key,
                &auth_data,
                cross_origin_json.as_bytes(),
                &sig,
                "stylussafe.xyz",
                "https://stylussafe.xyz",
                0,
            ),
            Err(WalletError::OriginMismatch)
        );
    }

    #[test]
    fn test_webauthn_rejects_rp_id_mismatch_and_bad_p256_sig() {
        let backend_valid = MockCryptoBackend {
            p256_valid: true,
            recovered_signer: Address::ZERO,
        };
        let challenge = b256!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let (pub_key, auth_data, client_json, sig) = build_valid_webauthn_fixture(
            &backend_valid,
            &challenge,
            "stylussafe.xyz",
            "https://stylussafe.xyz",
            0x05,
            1,
        );

        // Wrong rp_id expected
        assert_eq!(
            verify_webauthn_with_backend(
                &backend_valid,
                &challenge,
                &pub_key,
                &auth_data,
                &client_json,
                &sig,
                "evil.xyz",
                "https://stylussafe.xyz",
                0,
            ),
            Err(WalletError::RpIdMismatch)
        );

        // Invalid P-256 signature
        let backend_bad_sig = MockCryptoBackend {
            p256_valid: false,
            recovered_signer: Address::ZERO,
        };
        assert_eq!(
            verify_webauthn_with_backend(
                &backend_bad_sig,
                &challenge,
                &pub_key,
                &auth_data,
                &client_json,
                &sig,
                "stylussafe.xyz",
                "https://stylussafe.xyz",
                0,
            ),
            Err(WalletError::SignatureVerificationFailed)
        );
    }

    #[test]
    fn test_agent_policy_enforcement_all_invariants() {
        let now = U256::from(1_700_000_000u64);
        let expiry = now + U256::from(3600u64);
        let max_per_tx = U256::from(100u64);
        let daily_limit = U256::from(250u64);
        let allowed_target = address!("1111111111111111111111111111111111111111");
        let wrong_target = address!("2222222222222222222222222222222222222222");

        // 1. Valid agent spend within per-tx and daily limit
        let (spent1, reset1) = evaluate_agent_policy(
            now,
            expiry,
            max_per_tx,
            daily_limit,
            U256::ZERO,
            now,
            allowed_target,
            allowed_target,
            U256::from(80u64),
        )
        .unwrap();
        assert_eq!(spent1, U256::from(80u64));
        assert_eq!(reset1, now);

        // 2. Exceeding per-tx cap (120 > 100) reverts with PerTxLimitExceeded
        assert_eq!(
            evaluate_agent_policy(
                now,
                expiry,
                max_per_tx,
                daily_limit,
                spent1,
                reset1,
                allowed_target,
                allowed_target,
                U256::from(120u64),
            ),
            Err(WalletError::PerTxLimitExceeded)
        );

        // 3. Unauthorized target reverts with TargetNotAllowed
        assert_eq!(
            evaluate_agent_policy(
                now,
                expiry,
                max_per_tx,
                daily_limit,
                spent1,
                reset1,
                allowed_target,
                wrong_target,
                U256::from(50u64),
            ),
            Err(WalletError::TargetNotAllowed)
        );

        // 4. Accumulating up to 24h cap (80 + 100 + 80 = 260 > 250) reverts with DailyLimitExceeded
        let (spent2, reset2) = evaluate_agent_policy(
            now + U256::from(60u64),
            expiry,
            max_per_tx,
            daily_limit,
            spent1,
            reset1,
            allowed_target,
            allowed_target,
            U256::from(100u64),
        )
        .unwrap();
        assert_eq!(spent2, U256::from(180u64));

        assert_eq!(
            evaluate_agent_policy(
                now + U256::from(120u64),
                expiry,
                max_per_tx,
                daily_limit,
                spent2,
                reset2,
                allowed_target,
                allowed_target,
                U256::from(80u64),
            ),
            Err(WalletError::DailyLimitExceeded)
        );

        // 5. Rolling 24h window reset after 86,400 seconds allows spending again
        let next_day = now + U256::from(86_401u64);
        let long_expiry = next_day + U256::from(3600u64);
        let (spent_after_reset, reset_after) = evaluate_agent_policy(
            next_day,
            long_expiry,
            max_per_tx,
            daily_limit,
            spent2,
            reset2,
            allowed_target,
            allowed_target,
            U256::from(90u64),
        )
        .unwrap();
        assert_eq!(spent_after_reset, U256::from(90u64));
        assert_eq!(reset_after, next_day);

        // 6. Expired session key reverts with SessionExpired
        assert_eq!(
            evaluate_agent_policy(
                long_expiry + U256::from(1u64),
                long_expiry,
                max_per_tx,
                daily_limit,
                U256::ZERO,
                next_day,
                allowed_target,
                allowed_target,
                U256::from(10u64),
            ),
            Err(WalletError::SessionExpired)
        );
    }

    #[test]
    fn test_session_key_ecdsa_verification() {
        let session_addr = address!("9999999999999999999999999999999999999999");
        let wrong_addr = address!("8888888888888888888888888888888888888888");
        let backend = MockCryptoBackend {
            p256_valid: false,
            recovered_signer: session_addr,
        };
        let hash = b256!("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
        let sig = [0x33u8; 65];

        assert!(verify_session_key_ecdsa(&backend, &hash, &sig, session_addr).is_ok());
        assert_eq!(
            verify_session_key_ecdsa(&backend, &hash, &sig, wrong_addr),
            Err(WalletError::SignatureVerificationFailed)
        );
        assert_eq!(
            verify_session_key_ecdsa(&backend, &hash, &sig, Address::ZERO),
            Err(WalletError::SignatureVerificationFailed)
        );
    }

    #[test]
    fn test_extract_execution_target_and_erc20_value() {
        let token = address!("75faf114eafb1BDbe2F0316DF893fd58CE46AA4d");
        let recipient = address!("3333333333333333333333333333333333333333");

        // Build execute(token, 0, transfer(recipient, 500_000_000)) calldata
        let mut call_data = Vec::new();
        call_data.extend_from_slice(&[0xb6, 0x1d, 0x27, 0xf6]); // execute selector
        let mut word = [0u8; 32];
        word[12..32].copy_from_slice(token.as_slice());
        call_data.extend_from_slice(&word); // dest = token
        call_data.extend_from_slice(&[0u8; 32]); // value = 0
        let mut offset = [0u8; 32];
        offset[31] = 0x60; // 96
        call_data.extend_from_slice(&offset);

        // inner func: 68 bytes = 0xa9059cbb + recipient(32) + amount(32)
        let mut func_len = [0u8; 32];
        func_len[31] = 68;
        call_data.extend_from_slice(&func_len);
        call_data.extend_from_slice(&[0xa9, 0x05, 0x9c, 0xbb]);
        let mut rec_word = [0u8; 32];
        rec_word[12..32].copy_from_slice(recipient.as_slice());
        call_data.extend_from_slice(&rec_word);
        let amt = U256::from(500_000_000u64);
        call_data.extend_from_slice(&amt.to_be_bytes::<32>());

        let extracted = extract_execution_target_and_value(&call_data);
        assert_eq!(extracted, Some((token, amt)));
    }
}

