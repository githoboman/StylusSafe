// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title StylusSafeAccount (v2)
 * @notice ERC-4337 (EntryPoint v0.6) smart account for StylusSafe.
 *
 *  Owner path   — WebAuthn / P-256 passkey, verified with the RIP-7212 precompile (0x100).
 *                 Binds: rpIdHash, UP+UV flags, type=webauthn.get, challenge == base64url(userOpHash),
 *                 origin == stored origin, crossOrigin != true, monotonic signCount.
 *  Agent path   — secp256k1 session key (signature prefix 0x01). A session-signed UserOp may ONLY call
 *                 `executeAsAgent`, which enforces the on-chain spending policy at execution time.
 *                 Expiry is returned to the EntryPoint as `validUntil` (no TIMESTAMP in validation, ERC-7562).
 *  Direct agent — `executeWithPolicy` lets the session-key EOA call directly, under the same policy.
 *
 *  Policy       — expiry, per-tx cap, rolling-window cap, single allowed target, never the wallet itself.
 *
 *  v2 fixes over v1:
 *   - C-01 WebAuthn challenge was never bound to userOpHash (signature replay). Fixed.
 *   - C-02 WebAuthn origin was never checked. Fixed.
 *   - C-03 Session key could sign arbitrary callData (e.g. setAgentPolicy) and take over. Fixed.
 *   - C-04 Session key could target the wallet itself via executeWithPolicy. Fixed.
 *   - H-01 block.timestamp used in validation (banned by ERC-7562). Replaced by validUntil.
 *   - H-02 Implementation contract could be initialized by anyone. Locked in constructor.
 *   - M-01 Subscription window was hardcoded to 1 day regardless of frequency. Fixed.
 */
contract StylusSafeAccount {
    // ─── Storage (layout is append-only relative to v1) ────────────────────────

    address public entryPoint;
    bytes public publicKey; // 65-byte uncompressed P-256 key (0x04 || x || y)
    string public rpId;
    string public origin;
    uint256 public signCount;

    address public sessionKey;
    uint256 public sessionExpiry;
    uint256 public sessionMaxPerTx;
    uint256 public sessionDailyLimit;
    uint256 public sessionSpentToday;
    uint256 public sessionLastReset;
    address public sessionAllowedTarget;
    uint256 public sessionWindow; // seconds; 1 day for agent policies, N days for subscriptions

    uint256 internal constant SIG_VALIDATION_FAILED = 1;
    address internal constant P256_PRECOMPILE = address(0x100);
    bytes1 internal constant SESSION_SIG_PREFIX = 0x01;
    // secp256k1n / 2 — reject malleable ECDSA signatures
    uint256 internal constant SECP256K1_HALF_N =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    // ─── Events & Errors ───────────────────────────────────────────────────────

    event WalletInitialized(address indexed entryPoint, bytes publicKey, string rpId, string origin);
    event Executed(address indexed dest, uint256 value, bytes func);
    event SessionKeyUpdated(address indexed key, uint256 expiry, uint256 maxPerTx, uint256 dailyLimit, address allowedTarget);
    event SessionKeyRevoked();

    error AlreadyInitialized();
    error NotEntryPoint();
    error NotAuthorized();
    error CallFailed(bytes reason);
    error InvalidPublicKey();
    error InvalidPolicy();
    error SessionExpired();
    error TargetNotAllowed();
    error PerTxLimitExceeded();
    error DailyLimitExceeded();

    // ─── Construction / Initialization ─────────────────────────────────────────

    /// @dev Locks the implementation contract so nobody can initialize it directly (H-02).
    ///      EIP-1167 proxies do not run this constructor, so their storage starts empty.
    constructor() {
        entryPoint = address(1);
    }

    function initialize(
        address _entryPoint,
        bytes calldata _publicKey,
        string calldata _rpId,
        string calldata _origin
    ) external {
        if (entryPoint != address(0)) revert AlreadyInitialized();
        if (_entryPoint == address(0)) revert NotAuthorized();
        if (_publicKey.length != 65 || _publicKey[0] != 0x04) revert InvalidPublicKey();
        if (bytes(_rpId).length == 0 || bytes(_origin).length == 0) revert NotAuthorized();

        entryPoint = _entryPoint;
        publicKey = _publicKey;
        rpId = _rpId;
        origin = _origin;

        emit WalletInitialized(_entryPoint, _publicKey, _rpId, _origin);
    }

    modifier onlyEntryPoint() {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        _;
    }

    modifier onlyEntryPointOrSelf() {
        if (msg.sender != entryPoint && msg.sender != address(this)) revert NotAuthorized();
        _;
    }

    // ─── ERC-4337 ──────────────────────────────────────────────────────────────

    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        bytes paymasterAndData;
        bytes signature;
    }

    /**
     * @notice ERC-4337 v0.6 validateUserOp.
     * @dev Signature formats:
     *   Owner : abi.encode(bytes authenticatorData, bytes clientDataJSON, bytes32 r, bytes32 s)
     *   Agent : 0x01 || r(32) || s(32) || v(1)   (66 bytes), signs the raw userOpHash
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        bytes calldata sig = userOp.signature;

        if (sig.length == 66 && sig[0] == SESSION_SIG_PREFIX) {
            validationData = _validateSessionKeyUserOp(sig[1:], userOp.callData, userOpHash);
        } else {
            validationData = _validateWebAuthn(sig, userOpHash) ? 0 : SIG_VALIDATION_FAILED;
        }

        if (missingAccountFunds > 0) {
            // Ignore failure: the EntryPoint will reject the op if the deposit is insufficient.
            (bool ok, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            (ok);
        }
    }

    // ─── Execution (owner) ─────────────────────────────────────────────────────

    function execute(address dest, uint256 value, bytes calldata func) external onlyEntryPoint {
        _call(dest, value, func);
    }

    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external onlyEntryPoint {
        require(dest.length == value.length && dest.length == func.length, "Mismatched arrays");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    // ─── Execution (agent) ─────────────────────────────────────────────────────

    /// @notice The only function a session-key-signed UserOp may call. Policy enforced here.
    function executeAsAgent(address dest, uint256 value, bytes calldata func) external onlyEntryPoint {
        _enforcePolicy(dest, value, func);
        _call(dest, value, func);
    }

    /// @notice Direct (non-4337) agent execution by the session-key EOA, under the same policy.
    function executeWithPolicy(address dest, uint256 value, bytes calldata func) external {
        if (sessionKey == address(0) || msg.sender != sessionKey) revert NotAuthorized();
        _enforcePolicy(dest, value, func);
        _call(dest, value, func);
    }

    // ─── Policy management (owner only) ────────────────────────────────────────

    function setAgentPolicy(
        address key,
        uint256 expiry,
        uint256 maxPerTx,
        uint256 dailyLimit,
        address allowedTarget
    ) external onlyEntryPointOrSelf {
        if (key == address(0) || allowedTarget == address(this)) revert InvalidPolicy();
        // expiry must be in the future and fit validUntil (0 would mean "never expires" to the EntryPoint)
        if (expiry <= block.timestamp || expiry > type(uint48).max) revert InvalidPolicy();
        _writePolicy(key, expiry, maxPerTx, dailyLimit, allowedTarget, 1 days);
    }

    /// @notice Back-compat helper: conservative defaults (0.01 ETH/tx, 0.05 ETH/day, any external target).
    function addSessionKey(address key, uint256 expiry) external onlyEntryPointOrSelf {
        if (key == address(0) || expiry <= block.timestamp || expiry > type(uint48).max) revert InvalidPolicy();
        _writePolicy(key, expiry, 0.01 ether, 0.05 ether, address(0), 1 days);
    }

    function revokeSessionKey() external onlyEntryPointOrSelf {
        sessionKey = address(0);
        sessionExpiry = 0;
        sessionMaxPerTx = 0;
        sessionDailyLimit = 0;
        sessionSpentToday = 0;
        sessionLastReset = 0;
        sessionAllowedTarget = address(0);
        sessionWindow = 0;
        emit SessionKeyRevoked();
    }

    /// @notice Pull-payment subscription: `payee` may pull up to `amount` once per `frequencyDays`, for 12 cycles.
    function setupSubscription(address payee, uint256 amount, uint256 frequencyDays) external onlyEntryPointOrSelf {
        if (payee == address(0) || payee == address(this) || frequencyDays == 0 || frequencyDays > 365) {
            revert InvalidPolicy();
        }
        uint256 window = frequencyDays * 1 days;
        _writePolicy(payee, block.timestamp + window * 12, amount, amount, payee, window);
    }

    // ─── Internal ──────────────────────────────────────────────────────────────

    function _writePolicy(
        address key,
        uint256 expiry,
        uint256 maxPerTx,
        uint256 dailyLimit,
        address allowedTarget,
        uint256 window
    ) internal {
        sessionKey = key;
        sessionExpiry = expiry;
        sessionMaxPerTx = maxPerTx;
        sessionDailyLimit = dailyLimit;
        sessionSpentToday = 0;
        sessionLastReset = block.timestamp;
        sessionAllowedTarget = allowedTarget;
        sessionWindow = window;
        emit SessionKeyUpdated(key, expiry, maxPerTx, dailyLimit, allowedTarget);
    }

    function _call(address dest, uint256 value, bytes calldata func) internal {
        (bool success, bytes memory ret) = dest.call{value: value}(func);
        if (!success) revert CallFailed(ret);
        emit Executed(dest, value, func);
    }

    function _enforcePolicy(address target, uint256 ethValue, bytes calldata func) internal {
        if (sessionKey == address(0) || block.timestamp >= sessionExpiry) revert SessionExpired();
        if (target == address(this)) revert TargetNotAllowed(); // C-04
        if (sessionAllowedTarget != address(0) && target != sessionAllowedTarget) revert TargetNotAllowed();

        uint256 spend = ethValue;
        if (func.length >= 68) {
            bytes4 sel = bytes4(func[:4]);
            // ERC-20 transfer / approve: count the token amount as spend (in addition to any ETH value)
            if (sel == 0xa9059cbb || sel == 0x095ea7b3) {
                spend += uint256(bytes32(func[36:68]));
            }
        }

        if (sessionMaxPerTx > 0 && spend > sessionMaxPerTx) revert PerTxLimitExceeded();

        uint256 window = sessionWindow == 0 ? 1 days : sessionWindow;
        if (block.timestamp >= sessionLastReset + window) {
            if (sessionDailyLimit > 0 && spend > sessionDailyLimit) revert DailyLimitExceeded();
            sessionSpentToday = spend;
            sessionLastReset = block.timestamp;
        } else {
            uint256 newSpent = sessionSpentToday + spend;
            if (sessionDailyLimit > 0 && newSpent > sessionDailyLimit) revert DailyLimitExceeded();
            sessionSpentToday = newSpent;
        }
    }

    /**
     * @dev Session-key validation. No TIMESTAMP opcode: expiry is returned as validUntil and
     *      enforced by the EntryPoint. Only `executeAsAgent` is permitted (C-03).
     */
    function _validateSessionKeyUserOp(
        bytes calldata sig,
        bytes calldata callData,
        bytes32 userOpHash
    ) internal view returns (uint256) {
        address key = sessionKey;
        if (key == address(0)) return SIG_VALIDATION_FAILED;
        if (callData.length < 4 || bytes4(callData[:4]) != this.executeAsAgent.selector) {
            return SIG_VALIDATION_FAILED;
        }

        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        if (v < 27) v += 27;
        if (uint256(s) > SECP256K1_HALF_N) return SIG_VALIDATION_FAILED;

        address recovered = ecrecover(userOpHash, v, r, s);
        if (recovered == address(0) || recovered != key) return SIG_VALIDATION_FAILED;

        // validationData = sigFailed(0) | validUntil << 160 | validAfter(0) << 208
        return uint256(uint48(sessionExpiry)) << 160;
    }

    /**
     * @dev WebAuthn assertion verification bound to `userOpHash`.
     *      Evaluates every check (no early return after decoding) so gas estimation with a
     *      well-formed dummy signature is representative of a real one.
     */
    function _validateWebAuthn(bytes calldata sig, bytes32 userOpHash) internal returns (bool) {
        if (sig.length < 192) return false;

        (bytes memory authData, bytes memory clientDataJSON, bytes32 r, bytes32 s) =
            abi.decode(sig, (bytes, bytes, bytes32, bytes32));
        if (authData.length < 37) return false;

        // All checks are evaluated unconditionally (no short-circuit) for representative gas estimation.
        bool authOk = _checkAuthData(authData);
        bool clientOk = _checkClientData(clientDataJSON, userOpHash);
        bool sigOk = _verifyP256(sha256(abi.encodePacked(authData, sha256(clientDataJSON))), r, s);

        if (!(authOk && clientOk && sigOk)) return false;
        return _bumpSignCount(authData);
    }

    /// @dev rpIdHash == sha256(rpId) and flags include User Present (0x01) + User Verified (0x04).
    function _checkAuthData(bytes memory authData) internal view returns (bool) {
        bytes32 actualRpHash;
        assembly {
            actualRpHash := mload(add(authData, 32))
        }
        uint8 flags = uint8(authData[32]);
        bool rpOk = actualRpHash == sha256(bytes(rpId));
        bool flagsOk = (flags & 0x05) == 0x05;
        return rpOk && flagsOk;
    }

    /// @dev type == webauthn.get, challenge == base64url(userOpHash), origin == stored origin, not cross-origin.
    function _checkClientData(bytes memory clientDataJSON, bytes32 userOpHash) internal view returns (bool) {
        bool typeOk = _contains(clientDataJSON, bytes('"type":"webauthn.get"'));
        bool challengeOk = _contains(
            clientDataJSON,
            abi.encodePacked('"challenge":"', _base64Url(userOpHash), '"')
        );
        bool originOk = _contains(clientDataJSON, abi.encodePacked('"origin":"', origin, '"'));
        bool notCrossOrigin = !_contains(clientDataJSON, bytes('"crossOrigin":true'));
        return typeOk && challengeOk && originOk && notCrossOrigin;
    }

    /// @dev RIP-7212 P-256 verification of `signedHash` against the stored public key.
    function _verifyP256(bytes32 signedHash, bytes32 r, bytes32 s) internal view returns (bool) {
        bytes memory pk = publicKey;
        bytes32 qx;
        bytes32 qy;
        assembly {
            qx := mload(add(pk, 33))
            qy := mload(add(pk, 65))
        }
        (bool ok, bytes memory out) = P256_PRECOMPILE.staticcall(abi.encode(signedHash, r, s, qx, qy));
        return ok && out.length == 32 && uint256(bytes32(out)) == 1;
    }

    /// @dev Monotonic signCount (authenticators that always report 0 are exempt, per WebAuthn L2).
    function _bumpSignCount(bytes memory authData) internal returns (bool) {
        uint32 count = (uint32(uint8(authData[33])) << 24) |
            (uint32(uint8(authData[34])) << 16) |
            (uint32(uint8(authData[35])) << 8) |
            uint32(uint8(authData[36]));
        if (count > 0 || signCount > 0) {
            if (count <= signCount) return false;
            signCount = count;
        }
        return true;
    }

    function _contains(bytes memory haystack, bytes memory needle) internal pure returns (bool) {
        uint256 n = needle.length;
        uint256 h = haystack.length;
        if (n == 0) return true;
        if (h < n) return false;
        bytes32 needleHash = keccak256(needle);
        unchecked {
            for (uint256 i = 0; i <= h - n; i++) {
                bytes32 slotHash;
                assembly {
                    slotHash := keccak256(add(add(haystack, 32), i), n)
                }
                if (slotHash == needleHash) return true;
            }
        }
        return false;
    }

    /// @dev base64url encoding of 32 bytes without padding (43 chars), as used in WebAuthn challenges.
    function _base64Url(bytes32 data) internal pure returns (bytes memory result) {
        bytes memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        result = new bytes(43);
        uint256 bits;
        uint256 bitCount;
        uint256 j;
        unchecked {
            for (uint256 i = 0; i < 32; i++) {
                bits = (bits << 8) | uint8(data[i]);
                bitCount += 8;
                while (bitCount >= 6) {
                    bitCount -= 6;
                    result[j++] = table[(bits >> bitCount) & 0x3f];
                }
            }
            if (bitCount > 0) {
                result[j++] = table[(bits << (6 - bitCount)) & 0x3f];
            }
        }
    }

    receive() external payable {}
}
