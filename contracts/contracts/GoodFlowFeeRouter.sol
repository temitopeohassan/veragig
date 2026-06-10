// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GoodFlowFeeRouter is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable gDollar;

    address public ubiPool;        // GoodCollective Worker Advancement Pool
    address public treasury;       // GoodFlow treasury

    uint256 public constant UBI_POOL_PCT = 50;
    uint256 public constant TREASURY_PCT = 50;
    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant BPS_DENOM = 10000;

    mapping(address => bool) public authorizedCallers;

    event FeeRouted(
        bytes32 indexed taskId,
        uint256 settlementAmount,
        uint256 ubiContribution,
        uint256 treasuryContribution
    );

    constructor(address _gDollar, address _ubiPool, address _treasury) Ownable(msg.sender) {
        gDollar = IERC20(_gDollar);
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

    function routeFee(bytes32 taskId, uint256 settlementAmount, address payer) external onlyAuthorized {
        uint256 feeAmount = (settlementAmount * FEE_BPS) / BPS_DENOM;

        gDollar.safeTransferFrom(payer, address(this), feeAmount);

        uint256 ubiContribution = (feeAmount * UBI_POOL_PCT) / 100;
        uint256 treasuryContribution = feeAmount - ubiContribution;

        gDollar.safeTransfer(ubiPool, ubiContribution);
        gDollar.safeTransfer(treasury, treasuryContribution);

        emit FeeRouted(taskId, settlementAmount, ubiContribution, treasuryContribution);
    }
}
