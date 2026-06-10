// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IGoodScoreRegistry {
    function getScore(address worker) external view returns (uint16);
    function getLoanTier(address worker) external view returns (string memory);
}

contract GoodFlowLendingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable gDollar;
    IGoodScoreRegistry public scoreRegistry;

    // Loan tier limits in G$ (18 decimals)
    uint256 public constant STARTER_MAX = 50 ether;   // 50 G$
    uint256 public constant BUILDER_MAX = 200 ether;  // 200 G$
    uint256 public constant PRIME_MAX   = 500 ether;  // 500 G$

    // Repayment deduction percentages
    uint8 public constant STARTER_DEDUCTION = 30;
    uint8 public constant BUILDER_DEDUCTION = 20;
    uint8 public constant PRIME_DEDUCTION   = 15;

    struct Loan {
        bytes32 id;
        address worker;
        uint256 principalWei;
        uint256 remainingWei;
        uint8 repaymentDeductionPct;
        uint256 createdAt;
        bool fullyRepaid;
    }

    mapping(address => bytes32) public activeLoanId;
    mapping(bytes32 => Loan) public loans;
    mapping(address => bool) public authorizedRepayers;

    uint256 public totalPoolBalance;

    event LoanIssued(bytes32 indexed loanId, address indexed worker, uint256 amountWei);
    event LoanRepayment(bytes32 indexed loanId, uint256 deductionWei, uint256 remainingWei);
    event LoanFullyRepaid(bytes32 indexed loanId, address indexed worker);
    event PoolDeposit(address indexed depositor, uint256 amountWei);

    constructor(address _gDollar, address _scoreRegistry) Ownable(msg.sender) {
        gDollar = IERC20(_gDollar);
        scoreRegistry = IGoodScoreRegistry(_scoreRegistry);
    }

    modifier onlyAuthorizedRepayer() {
        require(authorizedRepayers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    function setAuthorizedRepayer(address repayer, bool authorized) external onlyOwner {
        authorizedRepayers[repayer] = authorized;
    }

    function deposit(uint256 amountWei) external nonReentrant {
        gDollar.safeTransferFrom(msg.sender, address(this), amountWei);
        totalPoolBalance += amountWei;
        emit PoolDeposit(msg.sender, amountWei);
    }

    function checkEligibility(address worker) external view returns (
        bool isEligible,
        uint256 maxLoanWei,
        uint8 repaymentPct,
        string memory tier,
        string memory reason
    ) {
        if (activeLoanId[worker] != bytes32(0)) {
            return (false, 0, 0, "none", "LOAN_ALREADY_ACTIVE");
        }

        uint16 score = scoreRegistry.getScore(worker);
        tier = scoreRegistry.getLoanTier(worker);

        bytes32 tierHash = keccak256(bytes(tier));
        if (tierHash == keccak256(bytes("prime"))) {
            maxLoanWei = PRIME_MAX;
            repaymentPct = PRIME_DEDUCTION;
        } else if (tierHash == keccak256(bytes("builder"))) {
            maxLoanWei = BUILDER_MAX;
            repaymentPct = BUILDER_DEDUCTION;
        } else if (tierHash == keccak256(bytes("starter"))) {
            maxLoanWei = STARTER_MAX;
            repaymentPct = STARTER_DEDUCTION;
        } else {
            return (false, 0, 0, "none", "INSUFFICIENT_GOOD_SCORE");
        }

        if (totalPoolBalance < maxLoanWei) {
            return (false, 0, 0, tier, "POOL_INSUFFICIENT_LIQUIDITY");
        }

        isEligible = true;
        reason = "";
    }

    function requestLoan(uint256 requestedWei, string calldata purpose) external nonReentrant returns (bytes32 loanId) {
        require(activeLoanId[msg.sender] == bytes32(0), "LOAN_ALREADY_ACTIVE");

        (bool isEligible, uint256 maxLoanWei, uint8 repaymentPct,,) = this.checkEligibility(msg.sender);
        require(isEligible, "Not eligible");
        require(requestedWei <= maxLoanWei, "Exceeds max loan");
        require(totalPoolBalance >= requestedWei, "POOL_INSUFFICIENT_LIQUIDITY");

        loanId = keccak256(abi.encodePacked(msg.sender, block.timestamp, purpose));

        loans[loanId] = Loan({
            id: loanId,
            worker: msg.sender,
            principalWei: requestedWei,
            remainingWei: requestedWei,
            repaymentDeductionPct: repaymentPct,
            createdAt: block.timestamp,
            fullyRepaid: false
        });

        activeLoanId[msg.sender] = loanId;
        totalPoolBalance -= requestedWei;

        gDollar.safeTransfer(msg.sender, requestedWei);
        emit LoanIssued(loanId, msg.sender, requestedWei);
    }

    function processRepayment(
        bytes32 loanId,
        uint256 payoutAmountWei
    ) external onlyAuthorizedRepayer nonReentrant returns (uint256 deductionWei) {
        Loan storage loan = loans[loanId];
        require(!loan.fullyRepaid, "Already repaid");

        deductionWei = (payoutAmountWei * loan.repaymentDeductionPct) / 100;
        if (deductionWei > loan.remainingWei) {
            deductionWei = loan.remainingWei;
        }

        loan.remainingWei -= deductionWei;
        totalPoolBalance += deductionWei;

        emit LoanRepayment(loanId, deductionWei, loan.remainingWei);

        if (loan.remainingWei == 0) {
            loan.fullyRepaid = true;
            activeLoanId[loan.worker] = bytes32(0);
            emit LoanFullyRepaid(loanId, loan.worker);
        }
    }

    function getLoan(bytes32 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }
}
