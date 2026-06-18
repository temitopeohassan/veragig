// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVeraScoreRegistry {
    function updateScore(
        address worker,
        uint16 newScore,
        uint32 tasksCompleted,
        uint32 tasksAccepted,
        uint32 disputesLost,
        uint32 loansRepaidOnTime,
        uint32 ubiClaimStreakDays,
        uint32 earningConsistencyWeeks,
        string calldata trigger
    ) external;
    function getScore(address worker) external view returns (uint16);
}

interface IVeraGigFeeRouter {
    function routeFee(bytes32 taskId, uint256 settlementAmount, address payer) external;
}

contract VeraGigEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable gDollar;
    IVeraScoreRegistry public scoreRegistry;
    IVeraGigFeeRouter public feeRouter;

    /// @notice Backend signer operated by the official frontend (https://useveragig.online).
    /// All fund-moving task actions must be submitted by this relayer (or the owner).
    /// A URL cannot be verified on-chain, so the relayer address is its on-chain proxy.
    address public trustedRelayer;

    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant BPS_DENOM = 10000;

    enum TaskStatus { Open, Assigned, Submitted, Completed, Disputed, Cancelled }

    struct Task {
        bytes32 id;
        address client;
        address worker;
        uint256 rewardWei;
        uint256 deadline;
        TaskStatus status;
        bytes32 deliverableCid;
        uint8 rating;
        bool releaseAsStream;
        uint256 payoutDurationDays;
    }

    mapping(bytes32 => Task) public tasks;
    mapping(bytes32 => bytes32) public disputes; // taskId => disputeId

    event TaskCreated(bytes32 indexed taskId, address indexed client, uint256 rewardWei, uint256 deadline);
    event TaskAssigned(bytes32 indexed taskId, address indexed worker);
    event TaskSubmitted(bytes32 indexed taskId, address indexed worker, bytes32 deliverableCid);
    event TaskCompleted(bytes32 indexed taskId, address indexed worker, uint8 rating);
    event TaskCancelled(bytes32 indexed taskId);
    event DisputeRaised(bytes32 indexed taskId, address indexed raiser, bytes32 disputeId);
    event DisputeResolved(bytes32 indexed taskId, address indexed winner);
    event TrustedRelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    /// @dev Gates all fund-moving task actions to the trusted relayer or the owner (deployer).
    modifier onlyRelayerOrOwner() {
        require(msg.sender == trustedRelayer || msg.sender == owner(), "Not relayer or owner");
        _;
    }

    constructor(
        address _gDollar,
        address _scoreRegistry,
        address _feeRouter,
        address _trustedRelayer
    ) Ownable(msg.sender) {
        gDollar = IERC20(_gDollar);
        scoreRegistry = IVeraScoreRegistry(_scoreRegistry);
        feeRouter = IVeraGigFeeRouter(_feeRouter);
        trustedRelayer = _trustedRelayer;
        emit TrustedRelayerUpdated(address(0), _trustedRelayer);
    }

    /// @notice Update the trusted relayer (backend signer for the official frontend).
    function setTrustedRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "Zero relayer");
        emit TrustedRelayerUpdated(trustedRelayer, newRelayer);
        trustedRelayer = newRelayer;
    }

    /// @notice Create and fund a task on behalf of `client`. Relayer/owner only.
    /// @dev `client` must have approved this contract for `rewardWei + fee` of G$.
    function createTask(
        bytes32 taskId,
        address client,
        uint256 rewardWei,
        uint256 deadline,
        bool releaseAsStream,
        uint256 payoutDurationDays
    ) external onlyRelayerOrOwner nonReentrant {
        require(client != address(0), "Zero client");
        require(tasks[taskId].client == address(0), "Task exists");
        require(deadline > block.timestamp, "Deadline in past");
        require(rewardWei > 0, "Reward required");

        uint256 fee = (rewardWei * FEE_BPS) / BPS_DENOM;
        uint256 totalRequired = rewardWei + fee;

        gDollar.safeTransferFrom(client, address(this), totalRequired);

        tasks[taskId] = Task({
            id: taskId,
            client: client,
            worker: address(0),
            rewardWei: rewardWei,
            deadline: deadline,
            status: TaskStatus.Open,
            deliverableCid: bytes32(0),
            rating: 0,
            releaseAsStream: releaseAsStream,
            payoutDurationDays: payoutDurationDays
        });

        emit TaskCreated(taskId, client, rewardWei, deadline);
    }

    function assignTask(bytes32 taskId, address worker) external {
        Task storage task = tasks[taskId];
        require(task.client == msg.sender, "Not client");
        require(task.status == TaskStatus.Open, "Not open");
        task.worker = worker;
        task.status = TaskStatus.Assigned;
        emit TaskAssigned(taskId, worker);
    }

    function submitDeliverable(bytes32 taskId, bytes32 deliverableCid) external {
        Task storage task = tasks[taskId];
        require(task.worker == msg.sender, "Not worker");
        require(task.status == TaskStatus.Assigned, "Not assigned");
        task.deliverableCid = deliverableCid;
        task.status = TaskStatus.Submitted;
        emit TaskSubmitted(taskId, msg.sender, deliverableCid);
    }

    /// @notice Approve a submitted task and release the reward to the worker. Relayer/owner only.
    /// @param client The task's client, on whose behalf the relayer acts (must match stored client).
    function approveAndRelease(bytes32 taskId, address client, uint8 rating) external onlyRelayerOrOwner nonReentrant {
        Task storage task = tasks[taskId];
        require(task.client == client, "Not client");
        require(task.status == TaskStatus.Submitted, "Not submitted");
        require(rating >= 1 && rating <= 5, "Rating 1-5");

        task.rating = rating;
        task.status = TaskStatus.Completed;

        uint256 fee = (task.rewardWei * FEE_BPS) / BPS_DENOM;

        // Route platform fee
        gDollar.forceApprove(address(feeRouter), fee);
        feeRouter.routeFee(taskId, task.rewardWei, task.client);

        // Release reward to worker (lump sum — streaming handled off-chain via Superfluid)
        gDollar.safeTransfer(task.worker, task.rewardWei);

        emit TaskCompleted(taskId, task.worker, rating);
    }

    /// @notice Cancel an open task and refund the client. Relayer/owner only.
    /// @param client The task's client, on whose behalf the relayer acts (must match stored client).
    function cancelTask(bytes32 taskId, address client) external onlyRelayerOrOwner nonReentrant {
        Task storage task = tasks[taskId];
        require(task.client == client, "Not client");
        require(task.status == TaskStatus.Open, "Can only cancel open tasks");

        task.status = TaskStatus.Cancelled;
        uint256 fee = (task.rewardWei * FEE_BPS) / BPS_DENOM;
        gDollar.safeTransfer(task.client, task.rewardWei + fee);

        emit TaskCancelled(taskId);
    }

    function raiseDispute(bytes32 taskId, bytes32 evidenceCid) external nonReentrant returns (bytes32 disputeId) {
        Task storage task = tasks[taskId];
        require(
            task.client == msg.sender || task.worker == msg.sender,
            "Not party"
        );
        require(
            task.status == TaskStatus.Submitted || task.status == TaskStatus.Assigned,
            "Cannot dispute"
        );

        disputeId = keccak256(abi.encodePacked(taskId, msg.sender, block.timestamp));
        disputes[taskId] = disputeId;
        task.status = TaskStatus.Disputed;

        emit DisputeRaised(taskId, msg.sender, disputeId);
    }

    function resolveDispute(bytes32 taskId, address winner) external onlyOwner nonReentrant {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Disputed, "Not disputed");

        task.status = TaskStatus.Completed;
        uint256 fee = (task.rewardWei * FEE_BPS) / BPS_DENOM;

        gDollar.forceApprove(address(feeRouter), fee);
        feeRouter.routeFee(taskId, task.rewardWei, task.client);
        gDollar.safeTransfer(winner, task.rewardWei);

        emit DisputeResolved(taskId, winner);
    }

    function getTask(bytes32 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    function updateContracts(address _scoreRegistry, address _feeRouter) external onlyOwner {
        scoreRegistry = IVeraScoreRegistry(_scoreRegistry);
        feeRouter = IVeraGigFeeRouter(_feeRouter);
    }

    /// @notice Owner-only escape hatch: only the deployer can withdraw funds directly from the contract.
    /// @dev No other address can pull arbitrary funds out; normal payouts flow through the relayer-gated task functions.
    function emergencyWithdraw(IERC20 token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Zero recipient");
        token.safeTransfer(to, amount);
        emit EmergencyWithdraw(address(token), to, amount);
    }
}
