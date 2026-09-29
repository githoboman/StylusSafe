// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StylusSafeFactory
 * @notice Deterministic CREATE2 factory for deploying StylusSafe wallets.
 *         The implementation WASM address is the Arbitrum Stylus-compiled
 *         StylusSafe contract. Each user gets a unique proxy keyed by their
 *         P-256 public key hash, ensuring the same address across any
 *         bundler regardless of who submits the initCode.
 */
contract StylusSafeFactory {
    /// @notice The address of the deployed Stylus WASM implementation contract.
    address public immutable implementation;

    event WalletCreated(address indexed wallet, address indexed owner, bytes publicKey);

    error AlreadyDeployed();

    constructor(address _implementation) {
        implementation = _implementation;
    }

    /**
     * @notice Compute the deterministic CREATE2 address for a wallet.
     * @param publicKey  The 65-byte uncompressed P-256 public key.
     * @return predicted  The address the wallet will be deployed to.
     */
    function getAddress(bytes calldata publicKey) external view returns (address predicted) {
        bytes32 salt = keccak256(publicKey);
        predicted = _predictAddress(salt);
    }

    /**
     * @notice Deploy a new StylusSafe wallet and initialise it.
     *         If the wallet already exists this is a no-op (idempotent).
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
        bytes32 salt = keccak256(publicKey);
        wallet = _predictAddress(salt);

        // Idempotent: if the wallet already has code, skip deployment.
        if (wallet.code.length > 0) return wallet;

        // Deploy a minimal proxy pointing at the Stylus WASM implementation.
        bytes memory bytecode = _proxyBytecode(implementation);
        assembly {
            wallet := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(wallet != address(0), "CREATE2 failed");

        // Initialise the wallet: stores the EntryPoint, pubKey, rpId, origin.
        (bool ok, bytes memory reason) = wallet.call(
            abi.encodeWithSignature(
                "initialize(address,bytes,string,string)",
                entryPoint,
                publicKey,
                rpId,
                origin
            )
        );
        require(ok, string(reason));

        emit WalletCreated(wallet, msg.sender, publicKey);
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

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
