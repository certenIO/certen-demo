// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DemoUpgradeable
 * @notice The execution rail target for Demo 1 ("Stop the $10M Mistake").
 *
 *         This contract holds a single piece of mutable "production" state: `version`.
 *         The WHOLE POINT of the demo is that the version can ONLY be changed by the
 *         `authorizer` — which in a live demo is the Certen-authorized account (the
 *         on-chain anchor that Certen flips only after the full multi-sig quorum has
 *         signed). No quorum, no proof, no call. A rogue CI/CD pipeline or a single
 *         engineer cannot push an upgrade on their own.
 */
contract DemoUpgradeable {
    /// @notice Current production version string (e.g. "6.0" -> "6.1").
    string public version;

    /// @notice The only account allowed to upgrade. Intended to be the Certen anchor.
    address public authorizer;

    /// @notice Emitted on every successful version change.
    event VersionChanged(string oldVersion, string newVersion, address indexed by);

    /// @notice Emitted when authority is handed to a new account.
    event AuthorizerChanged(address indexed oldAuthorizer, address indexed newAuthorizer);

    /// @param authorizer_     The Certen-authorized account permitted to upgrade.
    /// @param initialVersion  Starting version (the demo seeds this as "6.0").
    constructor(address authorizer_, string memory initialVersion) {
        require(authorizer_ != address(0), "Certen: zero authorizer");
        authorizer = authorizer_;
        version = initialVersion;
    }

    /// @notice Upgrade the production version. ONLY the Certen-authorized account may call.
    /// @param v The new version string.
    function setVersion(string calldata v) external {
        require(msg.sender == authorizer, "Certen: unauthorized");
        string memory old = version;
        version = v;
        emit VersionChanged(old, v, msg.sender);
    }

    /// @notice Rotate the authorizing account. Only the current authorizer may do this.
    /// @param newAuthorizer The account that will hold upgrade authority going forward.
    function updateAuthorizer(address newAuthorizer) external {
        require(msg.sender == authorizer, "Certen: unauthorized");
        require(newAuthorizer != address(0), "Certen: zero authorizer");
        emit AuthorizerChanged(authorizer, newAuthorizer);
        authorizer = newAuthorizer;
    }
}
