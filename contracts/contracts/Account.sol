// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VeraGig Account registry
/// @notice On-chain record of wallets that have created a VeraGig profile.
/// @dev Self-service: a wallet registers itself by signing `createAccount()`.
///      No funds are held or moved here — it only stores membership.
contract Account {
    mapping(address => bool) public hasAccount;
    address[] private _accounts;

    event AccountCreated(address indexed wallet, uint256 timestamp);

    /// @notice Register the caller as having a VeraGig profile.
    function createAccount() external {
        require(!hasAccount[msg.sender], "Account exists");
        hasAccount[msg.sender] = true;
        _accounts.push(msg.sender);
        emit AccountCreated(msg.sender, block.timestamp);
    }

    /// @notice Whether `wallet` has registered an account.
    function exists(address wallet) external view returns (bool) {
        return hasAccount[wallet];
    }

    /// @notice Total number of registered accounts.
    function totalAccounts() external view returns (uint256) {
        return _accounts.length;
    }

    /// @notice Registered wallet at `index` (for enumeration/off-chain indexing).
    function accountAt(uint256 index) external view returns (address) {
        return _accounts[index];
    }
}
