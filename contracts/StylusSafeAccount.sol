// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title StylusSafeAccount (v3 — Multi-Policy & ERC-7579 Modules)
 * @notice ERC-4337 (EntryPoint v0.6) smart account for StylusSafe.
 *
 *  Owner path   — WebAuthn / P-256 passkey verified with RIP-7212 precompile (0x100).
 *  Agent path   — Multiple concurrent secp256k1 session keys (AGENT / DCA / SUBSCRIPTION)
 *                 stored in `mapping(address => Policy)` with ERC-7579 Validator/Executor support.
 *                 Session UserOps may call `executeAsAgent`, `executeAsAgentFor`, or
 *                 `executeAsAgentBatch` (allowing ERC-20 `approve(allowedTarget)` + `allowedTarget.swap`
 *                 under one shared budget without risking cross-contract approvals).
 */
contract StylusSafeAccount {
    // ─── Storage (slots 0..12 match v2; v3 state is appended from slot 13) ─────

    address public entryPoint;
    bytes public publicKey; // 65-byte uncompressed P-256 key (0x04 || x || y)
    string public rpId;
    string public origin;
    uint256 public signCount;

    // Legacy / primary AGENT mirror (keeps v2 views & EthCall stateDiff checks compatible)
    address public sessionKey;
    uint256 public sessionExpiry;
    uint256 public sessionMaxPerTx;
    uint256 public sessionDailyLimit;
    uint256 public sessionSpentToday;
    uint256 public sessionLastReset;
    address public sessionAllowedTarget;
    uint256 public sessionWindow; // seconds; 1 day for agent policies, N days for subscriptions

    // v3 Multi-policy & ERC-7579 storage (slot 13+)
    uint8 public constant POLICY_AGENT = 0;
    uint8 public constant POLICY_DCA = 1;
    uint8 public constant POLICY_SUBSCRIPTION = 2;

    uint256 public constant MODULE_TYPE_VALIDATOR = 1;
    uint256 public constant MODULE_TYPE_EXECUTOR = 2;

    struct Policy {
        address key;
        uint48 expiry;
        uint8 kind;
        bool active;
        uint256 maxPerTx;
        uint256 dailyLimit;
        uint256 spent;
        uint256 lastReset;
        address allowedTarget;
        uint256 window;
    }

    mapping(address => Policy) internal _policies;
    address[] internal _policyKeys;
    mapping(address => uint256) internal _policyIndexPlusOne;
    mapping(uint256 => mapping(address => bool)) internal _installedModules;

    uint256 internal constant SIG_VALIDATION_FAILED = 1;
    address internal constant P256_PRECOMPILE = address(0x100);
    bytes1 internal constant SESSION_SIG_PREFIX = 0x01;
    bytes4 internal constant SEL_TRANSFER = 0xa9059cbb;
    bytes4 internal constant SEL_APPROVE = 0x095ea7b3;
    bytes4 internal constant SEL_SWAP = bytes4(keccak256("swap(address,address,uint256,uint256,address)"));
    // secp256k1n / 2 — reject malleable ECDSA signatures
    uint256 internal constant SECP256K1_HALF_N =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    // ─── Events & Errors ───────────────────────────────────────────────────────

    event WalletInitialized(address indexed entryPoint, bytes publicKey, string rpId, string origin);
    event Executed(address indexed dest, uint256 value, bytes func);
    event SessionKeyUpdated(address indexed key, uint256 expiry, uint256 maxPerTx, uint256 dailyLimit, address allowedTarget);
    event PolicyUpdated(address indexed key, uint8 kind, uint256 expiry, uint256 maxPerTx, uint256 dailyLimit, address allowedTarget, uint256 window);
    event SessionKeyRevoked();
    event PolicyRevoked(address indexed key);
    event ModuleInstalled(uint256 indexed moduleTypeId, address indexed module);
    event ModuleUninstalled(uint256 indexed moduleTypeId, address indexed module);

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

    function accountId() external pure returns (string memory) {
        return "stylussafe.account.v3.erc7579";
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

    // ─── Execution (agent — single & multi-policy batch) ───────────────────────

    /// @notice Legacy 3-arg agent execution bound to `sessionKey`.
    function executeAsAgent(address dest, uint256 value, bytes calldata func) external onlyEntryPoint {
        _enforcePolicyKey(sessionKey, dest, value, func);
        _call(dest, value, func);
    }

    /// @notice Multi-policy single call executed under `key`'s policy.
    function executeAsAgentFor(
        address key,
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyEntryPoint {
        _enforcePolicyKey(key, dest, value, func);
        _call(dest, value, func);
    }

    /// @notice Multi-policy atomic batch (e.g. ERC-20 `approve(allowedTarget)` + `allowedTarget.swap`).
    function executeAsAgentBatch(
        address key,
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external onlyEntryPoint {
        _enforcePolicyBatch(key, dest, value, func);
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    /// @notice Direct (non-4337) agent or merchant pull execution under `msg.sender`'s policy.
    function executeWithPolicy(address dest, uint256 value, bytes calldata func) external {
        if (_policies[msg.sender].active) {
            _enforcePolicyKey(msg.sender, dest, value, func);
        } else {
            if (sessionKey == address(0) || msg.sender != sessionKey) revert NotAuthorized();
            _enforceLegacySlots(dest, value, func);
        }
        _call(dest, value, func);
    }

    // ─── Policy & ERC-7579 Module Management (owner only) ──────────────────────

    function setAgentPolicy(
        address key,
        uint256 expiry,
        uint256 maxPerTx,
        uint256 dailyLimit,
        address allowedTarget
    ) external onlyEntryPointOrSelf {
        if (key == address(0) || allowedTarget == address(this)) revert InvalidPolicy();
        if (expiry <= block.timestamp || expiry > type(uint48).max) revert InvalidPolicy();
        _writePolicy(key, POLICY_AGENT, expiry, maxPerTx, dailyLimit, allowedTarget, 1 days);
    }

    function setPolicy(
        address key,
        uint8 kind,
        uint256 expiry,
        uint256 maxPerTx,
        uint256 dailyLimit,
        address allowedTarget,
        uint256 windowSeconds
    ) external onlyEntryPointOrSelf {
        if (
            key == address(0) ||
            allowedTarget == address(this) ||
            kind > POLICY_SUBSCRIPTION ||
            windowSeconds == 0 ||
            expiry <= block.timestamp ||
            expiry > type(uint48).max
        ) revert InvalidPolicy();
        _writePolicy(key, kind, expiry, maxPerTx, dailyLimit, allowedTarget, windowSeconds);
    }

    /// @notice Back-compat helper: conservative defaults (0.01 ETH/tx, 0.05 ETH/day, any external target).
    function addSessionKey(address key, uint256 expiry) external onlyEntryPointOrSelf {
        if (key == address(0) || expiry <= block.timestamp || expiry > type(uint48).max) revert InvalidPolicy();
        _writePolicy(key, POLICY_AGENT, expiry, 0.01 ether, 0.05 ether, address(0), 1 days);
    }

    /// @notice Revoke a single policy key without disturbing other concurrent agents or subscriptions.
    function revokeSessionKey(address key) external onlyEntryPointOrSelf {
        _removePolicy(key);
    }

    /// @notice Legacy 0-arg revoke: revokes the primary `sessionKey`.
    function revokeSessionKey() external onlyEntryPointOrSelf {
        address targetKey = sessionKey;
        if (targetKey != address(0)) {
            _removePolicy(targetKey);
        } else {
            _clearLegacySlots();
            emit SessionKeyRevoked();
        }
    }

    /// @notice Concurrent pull-payment subscription: does NOT overwrite AI trading session keys.
    function setupSubscription(address payee, uint256 amount, uint256 frequencyDays) external onlyEntryPointOrSelf {
        if (payee == address(0) || payee == address(this) || frequencyDays == 0 || frequencyDays > 365) {
            revert InvalidPolicy();
        }
        uint256 window = frequencyDays * 1 days;
        _writePolicy(payee, POLICY_SUBSCRIPTION, block.timestamp + window * 12, amount, amount, payee, window);
    }

    // ─── ERC-7579 Module Subset ────────────────────────────────────────────────

    function supportsModule(uint256 moduleTypeId) external pure returns (bool) {
        return moduleTypeId == MODULE_TYPE_VALIDATOR || moduleTypeId == MODULE_TYPE_EXECUTOR;
    }

    function installModule(
        uint256 moduleTypeId,
        address module,
        bytes calldata initData
    ) external onlyEntryPointOrSelf {
        if (
            (moduleTypeId != MODULE_TYPE_VALIDATOR && moduleTypeId != MODULE_TYPE_EXECUTOR) ||
            module == address(0) ||
            module == address(this)
        ) revert InvalidPolicy();

        _installedModules[moduleTypeId][module] = true;

        if (initData.length >= 192) {
            (
                uint8 kind,
                uint256 expiry,
                uint256 maxPerTx,
                uint256 dailyLimit,
                address allowedTarget,
                uint256 windowSeconds
            ) = abi.decode(initData, (uint8, uint256, uint256, uint256, address, uint256));
            if (
                kind > POLICY_SUBSCRIPTION ||
                allowedTarget == address(this) ||
                windowSeconds == 0 ||
                expiry <= block.timestamp ||
                expiry > type(uint48).max
            ) revert InvalidPolicy();
            _writePolicy(module, kind, expiry, maxPerTx, dailyLimit, allowedTarget, windowSeconds);
        }

        emit ModuleInstalled(moduleTypeId, module);
    }

    function uninstallModule(
        uint256 moduleTypeId,
        address module,
        bytes calldata
    ) external onlyEntryPointOrSelf {
        _installedModules[moduleTypeId][module] = false;
        if (_policies[module].active) {
            _removePolicy(module);
        }
        emit ModuleUninstalled(moduleTypeId, module);
    }

    function isModuleInstalled(
        uint256 moduleTypeId,
        address module,
        bytes calldata
    ) external view returns (bool) {
        if (_installedModules[moduleTypeId][module]) return true;
        return moduleTypeId == MODULE_TYPE_VALIDATOR && _policies[module].active;
    }

    // ─── Policy Views ──────────────────────────────────────────────────────────

    function getPolicy(address key) external view returns (Policy memory) {
        return _policies[key];
    }

    function policyCount() external view returns (uint256) {
        return _policyKeys.length;
    }

    function getAllPolicies() external view returns (Policy[] memory list) {
        uint256 len = _policyKeys.length;
        list = new Policy[](len);
        for (uint256 i = 0; i < len; i++) {
            list[i] = _policies[_policyKeys[i]];
        }
    }

    // ─── Internal Policy Helpers ───────────────────────────────────────────────

    function _writePolicy(
        address key,
        uint8 kind,
        uint256 expiry,
        uint256 maxPerTx,
        uint256 dailyLimit,
        address allowedTarget,
        uint256 window
    ) internal {
        if (_policyIndexPlusOne[key] == 0) {
            _policyKeys.push(key);
            _policyIndexPlusOne[key] = _policyKeys.length;
        }

        _policies[key] = Policy({
            key: key,
            expiry: uint48(expiry),
            kind: kind,
            active: true,
            maxPerTx: maxPerTx,
            dailyLimit: dailyLimit,
            spent: 0,
            lastReset: block.timestamp,
            allowedTarget: allowedTarget,
            window: window
        });

        _installedModules[MODULE_TYPE_VALIDATOR][key] = true;

        // Mirror AGENT / DCA policies to primary legacy slots so single-slot readers keep working;
        // SUBSCRIPTION policies stay isolated in `_policies` without overwriting active AI agents.
        if (kind != POLICY_SUBSCRIPTION || sessionKey == address(0)) {
            sessionKey = key;
            sessionExpiry = expiry;
            sessionMaxPerTx = maxPerTx;
            sessionDailyLimit = dailyLimit;
            sessionSpentToday = 0;
            sessionLastReset = block.timestamp;
            sessionAllowedTarget = allowedTarget;
            sessionWindow = window;
        }

        emit SessionKeyUpdated(key, expiry, maxPerTx, dailyLimit, allowedTarget);
        emit PolicyUpdated(key, kind, expiry, maxPerTx, dailyLimit, allowedTarget, window);
    }

    function _removePolicy(address key) internal {
        uint256 idxPlus = _policyIndexPlusOne[key];
        if (idxPlus > 0) {
            uint256 idx = idxPlus - 1;
            uint256 lastIdx = _policyKeys.length - 1;
            if (idx != lastIdx) {
                address lastKey = _policyKeys[lastIdx];
                _policyKeys[idx] = lastKey;
                _policyIndexPlusOne[lastKey] = idx + 1;
            }
            _policyKeys.pop();
            delete _policyIndexPlusOne[key];
        }

        delete _policies[key];
        _installedModules[MODULE_TYPE_VALIDATOR][key] = false;

        if (sessionKey == key) {
            _promoteNextLegacyAgent();
            emit SessionKeyRevoked();
        }
        emit PolicyRevoked(key);
    }

    function _promoteNextLegacyAgent() internal {
        for (uint256 i = 0; i < _policyKeys.length; i++) {
            Policy storage next = _policies[_policyKeys[i]];
            if (next.active && next.kind != POLICY_SUBSCRIPTION) {
                sessionKey = next.key;
                sessionExpiry = next.expiry;
                sessionMaxPerTx = next.maxPerTx;
                sessionDailyLimit = next.dailyLimit;
                sessionSpentToday = next.spent;
                sessionLastReset = next.lastReset;
                sessionAllowedTarget = next.allowedTarget;
                sessionWindow = next.window;
                return;
            }
        }
        _clearLegacySlots();
    }

    function _clearLegacySlots() internal {
        sessionKey = address(0);
        sessionExpiry = 0;
        sessionMaxPerTx = 0;
        sessionDailyLimit = 0;
        sessionSpentToday = 0;
        sessionLastReset = 0;
        sessionAllowedTarget = address(0);
        sessionWindow = 0;
    }

    function _call(address dest, uint256 value, bytes calldata func) internal {
        (bool success, bytes memory ret) = dest.call{value: value}(func);
        if (!success) revert CallFailed(ret);
        emit Executed(dest, value, func);
    }

    function _extractSpend(bytes calldata func) internal pure returns (uint256 transferOrApprove, uint256 swapIn, bool isApprove) {
        if (func.length >= 68) {
            bytes4 sel = bytes4(func[:4]);
            if (sel == SEL_TRANSFER) {
                transferOrApprove = uint256(bytes32(func[36:68]));
            } else if (sel == SEL_APPROVE) {
                transferOrApprove = uint256(bytes32(func[36:68]));
                isApprove = true;
            } else if (sel == SEL_SWAP && func.length >= 100) {
                swapIn = uint256(bytes32(func[68:100]));
            }
        }
    }

    function _enforcePolicyKey(address key, address target, uint256 ethValue, bytes calldata func) internal {
        Policy storage p = _policies[key];
        if (!p.active) {
            // Fall back to legacy slots only if key matches legacy `sessionKey`
            if (key != address(0) && key == sessionKey) {
                _enforceLegacySlots(target, ethValue, func);
                return;
            }
            revert SessionExpired();
        }
        if (block.timestamp >= p.expiry) revert SessionExpired();
        if (target == address(this)) revert TargetNotAllowed(); // C-04
        if (p.allowedTarget != address(0) && target != p.allowedTarget) revert TargetNotAllowed();

        (uint256 tOrA, uint256 swapIn, ) = _extractSpend(func);
        uint256 spend = ethValue + tOrA + swapIn;
        _applyWindowSpend(p, key, spend);
    }

    function _enforcePolicyBatch(
        address key,
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) internal {
        if (dest.length == 0 || dest.length > 10 || dest.length != value.length || dest.length != func.length) {
            revert InvalidPolicy();
        }
        Policy storage p = _policies[key];
        if (!p.active || block.timestamp >= p.expiry) revert SessionExpired();

        uint256 ethAndTransfers = 0;
        uint256 approveSpend = 0;
        uint256 swapSpend = 0;

        for (uint256 i = 0; i < dest.length; i++) {
            if (dest[i] == address(this)) revert TargetNotAllowed(); // C-04

            if (p.allowedTarget != address(0) && dest[i] != p.allowedTarget) {
                bool isApproveForTarget = value[i] == 0 &&
                    func[i].length == 68 &&
                    bytes4(func[i][:4]) == SEL_APPROVE &&
                    abi.decode(func[i][4:36], (address)) == p.allowedTarget;
                if (!isApproveForTarget) revert TargetNotAllowed();
            }

            ethAndTransfers += value[i];
            (uint256 tOrA, uint256 swapIn, bool isApprove) = _extractSpend(func[i]);
            if (isApprove) {
                approveSpend += tOrA;
            } else {
                ethAndTransfers += tOrA;
            }
            swapSpend += swapIn;
        }

        uint256 dexSpend = approveSpend > swapSpend ? approveSpend : swapSpend;
        _applyWindowSpend(p, key, ethAndTransfers + dexSpend);
    }

    function _applyWindowSpend(Policy storage p, address key, uint256 spend) internal {
        if (p.maxPerTx > 0 && spend > p.maxPerTx) revert PerTxLimitExceeded();

        uint256 window = p.window == 0 ? 1 days : p.window;
        if (block.timestamp >= p.lastReset + window) {
            if (p.dailyLimit > 0 && spend > p.dailyLimit) revert DailyLimitExceeded();
            p.spent = spend;
            p.lastReset = block.timestamp;
        } else {
            uint256 newSpent = p.spent + spend;
            if (p.dailyLimit > 0 && newSpent > p.dailyLimit) revert DailyLimitExceeded();
            p.spent = newSpent;
        }

        if (key == sessionKey) {
            sessionSpentToday = p.spent;
            sessionLastReset = p.lastReset;
        }
    }

    function _enforceLegacySlots(address target, uint256 ethValue, bytes calldata func) internal {
        if (sessionKey == address(0) || block.timestamp >= sessionExpiry) revert SessionExpired();
        if (target == address(this)) revert TargetNotAllowed(); // C-04
        if (sessionAllowedTarget != address(0) && target != sessionAllowedTarget) revert TargetNotAllowed();

        (uint256 tOrA, uint256 swapIn, ) = _extractSpend(func);
        uint256 spend = ethValue + tOrA + swapIn;

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
     *      enforced by the EntryPoint. Only `executeAsAgent`, `executeAsAgentFor`, and
     *      `executeAsAgentBatch` (matching recovered signer) are permitted (C-03).
     */
    function _validateSessionKeyUserOp(
        bytes calldata sig,
        bytes calldata callData,
        bytes32 userOpHash
    ) internal view returns (uint256) {
        if (callData.length < 4) return SIG_VALIDATION_FAILED;
        bytes4 sel = bytes4(callData[:4]);

        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        if (v < 27) v += 27;
        if (uint256(s) > SECP256K1_HALF_N) return SIG_VALIDATION_FAILED;

        address recovered = ecrecover(userOpHash, v, r, s);
        if (recovered == address(0)) return SIG_VALIDATION_FAILED;

        if (sel == this.executeAsAgent.selector) {
            if (recovered != sessionKey) return SIG_VALIDATION_FAILED;
        } else if (sel == this.executeAsAgentFor.selector || sel == this.executeAsAgentBatch.selector) {
            if (callData.length < 36) return SIG_VALIDATION_FAILED;
            address targetKey = abi.decode(callData[4:36], (address));
            if (targetKey != recovered) return SIG_VALIDATION_FAILED;
        } else {
            return SIG_VALIDATION_FAILED;
        }

        Policy storage p = _policies[recovered];
        if (p.active && p.expiry > 0) {
            return uint256(p.expiry) << 160;
        }
        if (recovered == sessionKey && sessionExpiry > 0) {
            return uint256(uint48(sessionExpiry)) << 160;
        }
        return SIG_VALIDATION_FAILED;
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
