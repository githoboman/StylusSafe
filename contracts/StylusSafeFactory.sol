// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StylusSafeFactory
 * @notice Deterministic CREATE2 factory for deploying StylusSafe wallets.
 *         The implementation address is the Arbitrum Stylus-compiled
 *         StylusSafe contract. Each user gets a unique EIP-1167 proxy keyed by
 *         all initialization parameters (publicKey, entryPoint, rpId, origin),
 *         preventing mempool front-running of wallet initialization (Audit C4).
 */
contract StylusSafeFactory {
    /// @notice The address of the deployed Stylus WASM implementation contract.
    address public immutable implementation;

    /// @notice Canonical ERC-4337 v0.6 EntryPoint address used when omitted.
    address public constant DEFAULT_ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    event WalletCreated(
        address indexed wallet,
        address indexed owner,
        bytes publicKey,
        address entryPoint,
        string rpId,
        string origin
    );

    error InitializationFailed(bytes reason);
    error Create2Failed();

    constructor(address _implementation) {
        require(_implementation != address(0), "Invalid implementation");
        implementation = _implementation;
    }

    /**
     * @notice Compute the deterministic CREATE2 address for a wallet bound to all
     *         initialization parameters (prevents initialization front-running).
     * @param publicKey  The 65-byte uncompressed P-256 public key.
     * @param entryPoint The ERC-4337 EntryPoint address.
     * @param rpId       The WebAuthn relying-party ID (e.g. "stylussafe.xyz").
     * @param origin     The WebAuthn origin (e.g. "https://stylussafe.xyz").
     * @return predicted The deterministic address the wallet will be deployed to.
     */
    function getAddress(
        bytes calldata publicKey,
        address entryPoint,
        string calldata rpId,
        string calldata origin
    ) public view returns (address predicted) {
        bytes32 salt = _computeSalt(publicKey, entryPoint, rpId, origin);
        predicted = _predictAddress(salt);
    }

    /**
     * @notice Convenience overload using the canonical EntryPoint and default RP ("stylussafe.xyz").
     * @param publicKey  The 65-byte uncompressed P-256 public key.
     * @return predicted The deterministic address for default parameters.
     */
    function getAddress(bytes calldata publicKey) external view returns (address predicted) {
        bytes32 salt = _computeSalt(
            publicKey,
            DEFAULT_ENTRY_POINT,
            "stylussafe.xyz",
            "https://stylussafe.xyz"
        );
        predicted = _predictAddress(salt);
    }

    /**
     * @notice Deploy a new StylusSafe wallet and atomically initialize it.
     *         Because `salt` commits to `(publicKey, entryPoint, rpId, origin)`,
     *         no attacker can front-run `createWallet` with a different `origin`,
     *         `rpId`, or `entryPoint` for the same predicted wallet address.
     * @param publicKey  The 65-byte uncompressed P-256 public key.
     * @param entryPoint The ERC-4337 EntryPoint address.
     * @param rpId       The WebAuthn relying-party ID (e.g. "stylussafe.xyz").
     * @param origin     The WebAuthn origin (e.g. "https://stylussafe.xyz").
     * @return wallet    The address of the deployed (or pre-existing) wallet.
     */
    function createWallet(
        bytes calldata publicKey,
        address entryPoint,
        string calldata rpId,
        string calldata origin
    ) external returns (address wallet) {
        bytes32 salt = _computeSalt(publicKey, entryPoint, rpId, origin);
        wallet = _predictAddress(salt);

        // Idempotent: if the wallet already has code at this exact parameter-bound address, return it.
        if (wallet.code.length > 0) return wallet;

        // Deploy a minimal proxy pointing at the Stylus WASM implementation.
        bytes memory bytecode = _proxyBytecode(implementation);
        assembly {
            wallet := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        if (wallet == address(0)) revert Create2Failed();

        // Atomically initialize the wallet: stores the EntryPoint, pubKey, rpId, origin.
        (bool ok, bytes memory reason) = wallet.call(
            abi.encodeWithSignature(
                "initialize(address,bytes,string,string)",
                entryPoint,
                publicKey,
                rpId,
                origin
            )
        );
        if (!ok) revert InitializationFailed(reason);

        emit WalletCreated(wallet, msg.sender, publicKey, entryPoint, rpId, origin);
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    function _computeSalt(
        bytes memory publicKey,
        address entryPoint,
        string memory rpId,
        string memory origin
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(publicKey, entryPoint, rpId, origin));
    }

    function _predictAddress(bytes32 salt) internal view returns (address) {
        bytes memory bytecode = _proxyBytecode(implementation);
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode))
        );
        return address(uint160(uint256(hash)));
    }

    /**
     * @dev Generates EIP-1167 minimal proxy bytecode pointing at `impl`.
     *      The proxy simply delegatecalls every call to the implementation.
     */
    function _proxyBytecode(address impl) internal pure returns (bytes memory) {
        return abi.encodePacked(
            hex"3d602d80600a3d3981f3363d3d373d3d3d363d73",
            impl,
            hex"5af43d82803e903d91602b57fd5bf3"
        );
    }
}
