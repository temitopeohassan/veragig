// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title VeraGig fee router (multi-token)
/// @notice Splits the 2% platform fee 50/50 between the Worker Advancement Pool
///         and the treasury, in whichever ERC-20 token settled the task.
/// @dev The fee is pulled from the calling escrow (which already holds reward+fee
///      from task creation and approves this router for the fee). This is the
///      authorized caller, not the original payer.
contract VeraGigFeeRouter is Ownable {
    using SafeERC20 for IERC20;

    address public ubiPool;        // VeraCollective Worker Advancement Pool
    address public treasury;       // VeraGig treasury

    uint256 public constant UBI_POOL_PCT = 50;
    uint256 public constant TREASURY_PCT = 50;
    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant BPS_DENOM = 10000;

    mapping(address => bool) public authorizedCallers;

    event FeeRouted(
        bytes32 indexed taskId,
        address indexed token,
        uint256 settlementAmount,
        uint256 ubiContribution,
        uint256 treasuryContribution
    );

    constructor(address _ubiPool, address _treasury) Ownable(msg.sender) {
        ubiPool = _ubiPool;
        treasury = _treasury;
    }

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    function setAddresses(address _ubiPool, address _treasury) external onlyOwner {
        ubiPool = _ubiPool;
        treasury = _treasury;
    }

    /// @notice Pull the 2% fee in `token` from the calling escrow and split it 50/50.
    /// @param taskId The settling task (for event traceability only).
    /// @param token The ERC-20 the task settled in.
    /// @param settlementAmount The task reward the fee is computed against.
    function routeFee(bytes32 taskId, address token, uint256 settlementAmount) external onlyAuthorized {
        uint256 feeAmount = (settlementAmount * FEE_BPS) / BPS_DENOM;

        IERC20(token).safeTransferFrom(msg.sender, address(this), feeAmount);

        uint256 ubiContribution = (feeAmount * UBI_POOL_PCT) / 100;
        uint256 treasuryContribution = feeAmount - ubiContribution;

        IERC20(token).safeTransfer(ubiPool, ubiContribution);
        IERC20(token).safeTransfer(treasury, treasuryContribution);

        emit FeeRouted(taskId, token, settlementAmount, ubiContribution, treasuryContribution);
    }
}
