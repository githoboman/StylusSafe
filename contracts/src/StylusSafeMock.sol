// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StylusSafeMock {
    address public entryPoint;
    bytes public publicKey;
    string public rpId;
    string public origin;
    address public sessionKey;
    uint256 public sessionExpiry;

    error NotEntryPoint();
    error AlreadyInitialized();
    error CallFailed();

    function initialize(
        address _entryPoint,
        bytes calldata _publicKey,
        string calldata _rpId,
        string calldata _origin
    ) external {
        if (entryPoint != address(0)) revert AlreadyInitialized();
        entryPoint = _entryPoint;
        publicKey = _publicKey;
        rpId = _rpId;
        origin = _origin;
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData) {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        // Since we don't have the Secp256r1 precompile deployed yet or we want a simple mock
        // Just return 0 to say "signature is valid" for the hackathon demo
        return 0;
    }

    function execute(address dest, uint256 value, bytes calldata func) external {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        (bool success, ) = dest.call{value: value}(func);
        if (!success) revert CallFailed();
    }

    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        require(dest.length == value.length && dest.length == func.length, "Mismatched lengths");
        for (uint i = 0; i < dest.length; i++) {
            (bool success, ) = dest[i].call{value: value[i]}(func[i]);
            if (!success) revert CallFailed();
        }
    }

    function executeDelegateCall(address dest, bytes calldata func) external {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        (bool success, ) = dest.delegatecall(func);
        if (!success) revert CallFailed();
    }

    function addSessionKey(address key, uint256 expiry) external {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        sessionKey = key;
        sessionExpiry = expiry;
    }

    function setupSubscription(address payee, uint256 amount, uint256 frequencyDays) external {
        if (msg.sender != entryPoint) revert NotEntryPoint();
    }

    receive() external payable {}

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
}
