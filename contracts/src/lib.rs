extern crate alloc;

pub mod auth;

use alloy_primitives::{Address, B256, U256, Bytes};

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
        };
        msg.as_bytes().to_vec()
    }
}

#[storage]
#[entrypoint]
pub struct StylusSafe {
    entry_point: StorageAddress,
    public_key: StorageBytes,
    rp_id: StorageString,
    origin: StorageString,
    session_key: StorageAddress,
    session_expiry: StorageU256,
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
        self.entry_point.set(entry_point);
        self.public_key.set_bytes(&public_key);
        self.rp_id.set_str(&rp_id);
        self.origin.set_str(&origin);
        Ok(())
    }

    pub fn validate_user_op(
        &self,
        user_op: (Address, U256, Bytes, Bytes, U256, U256, U256, U256, U256, Bytes, Bytes),
        user_op_hash: B256,
        _missing_account_funds: U256,
    ) -> Result<U256, Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }

        // Manual ABI decoding of WebAuthnSignature (tuple of 3 dynamic types: bytes, string, bytes)
        let data: &[u8] = user_op.10.as_ref();
        if data.len() < 96 {
            return Ok(U256::from(1)); // SIG_VALIDATION_FAILED
        }

        let mut offset_auth_data = [0u8; 32];
        offset_auth_data.copy_from_slice(&data[0..32]);
        let offset1: usize = U256::from_be_bytes(offset_auth_data).try_into().unwrap_or(0);

        let mut offset_client_data = [0u8; 32];
        offset_client_data.copy_from_slice(&data[32..64]);
        let offset2: usize = U256::from_be_bytes(offset_client_data).try_into().unwrap_or(0);

        let mut offset_raw_sig = [0u8; 32];
        offset_raw_sig.copy_from_slice(&data[64..96]);
        let offset3: usize = U256::from_be_bytes(offset_raw_sig).try_into().unwrap_or(0);

        let auth_len_offset = offset1;
        if data.len() < auth_len_offset + 32 { return Ok(U256::from(1)); }
        let mut len_bytes = [0u8; 32];
        len_bytes.copy_from_slice(&data[auth_len_offset..auth_len_offset+32]);
        let len1: usize = U256::from_be_bytes(len_bytes).try_into().unwrap_or(0);
        let auth_data = &data[auth_len_offset+32..auth_len_offset+32+len1];

        let client_len_offset = offset2;
        if data.len() < client_len_offset + 32 { return Ok(U256::from(1)); }
        len_bytes.copy_from_slice(&data[client_len_offset..client_len_offset+32]);
        let len2: usize = U256::from_be_bytes(len_bytes).try_into().unwrap_or(0);
        let client_data_json = match core::str::from_utf8(&data[client_len_offset+32..client_len_offset+32+len2]) {
            Ok(s) => s.to_string(),
            Err(_) => return Ok(U256::from(1)),
        };

        let sig_len_offset = offset3;
        if data.len() < sig_len_offset + 32 { return Ok(U256::from(1)); }
        len_bytes.copy_from_slice(&data[sig_len_offset..sig_len_offset+32]);
        let len3: usize = U256::from_be_bytes(len_bytes).try_into().unwrap_or(0);
        let sig_bytes = &data[sig_len_offset+32..sig_len_offset+32+len3];

        if sig_bytes.len() < 64 {
            return Ok(U256::from(1));
        }

        let mut raw_sig = [0u8; 64];
        raw_sig.copy_from_slice(&sig_bytes[0..64]);

        let pub_key_vec = self.public_key.get_bytes();
        let pub_key_bytes: &[u8; 65] = pub_key_vec.as_slice().try_into().unwrap_or(&[0u8; 65]);
        let rp_id_str = self.rp_id.get_string();
        let origin_str = self.origin.get_string();

        use stylus_sdk::prelude::TopLevelStorage;
        if auth::verify_webauthn(
            self.vm(),
            &user_op_hash,
            pub_key_bytes,
            auth_data,
            client_data_json.as_bytes(),
            &raw_sig,
            &rp_id_str,
            &origin_str,
        ).is_err() {
            return Ok(U256::from(1));
        }

        Ok(U256::ZERO)
    }

    pub fn execute(&mut self, dest: Address, value: U256, func: Bytes) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }

        let ctx = Call::new_payable(self, value);
        call::call(
            self.vm(),
            ctx,
            dest,
            &func,
        ).map_err(|_| Vec::from(WalletError::CallFailed))?;

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
            call::call(
                self.vm(),
                ctx,
                dest[i],
                &func[i],
            ).map_err(|_| Vec::from(WalletError::CallFailed))?;
        }

        Ok(())
    }

    pub fn execute_delegatecall(&mut self, dest: Address, func: Bytes) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }

        unsafe {
            let ctx = Call::new_mutating(self);
            call::delegate_call(
                self.vm(),
                ctx,
                dest,
                &func,
            ).map_err(|_| Vec::from(WalletError::CallFailed))?;
        }

        Ok(())
    }

    pub fn add_session_key(&mut self, key: Address, expiry: U256) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }
        self.session_key.set(key);
        self.session_expiry.set(expiry);
        Ok(())
    }

    pub fn setup_subscription(&mut self, _payee: Address, _amount: U256, _frequency_days: U256) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.entry_point.get() {
            return Err(Vec::from(WalletError::NotEntryPoint));
        }
        Ok(())
    }

    pub fn session_key(&self) -> Address {
        self.session_key.get()
    }

    pub fn session_expiry(&self) -> U256 {
        self.session_expiry.get()
    }

    pub fn entry_point(&self) -> Address {
        self.entry_point.get()
    }

    #[receive]
    pub fn receive(&mut self) -> Result<(), Vec<u8>> {
        Ok(())
    }
}
