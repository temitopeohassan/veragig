// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVeraScoreRegistry {
    function getScore(address worker) external view returns (uint16);
}

interface IVeraGigFeeRouter {
    function routeFee(bytes32 taskId, address token, uint256 settlementAmount) external;
}

/// @title VeraGigEscrow (multi-token, gig + bounty)
/// @notice Holds task rewards in a whitelisted ERC-20 (G$, USDT, CELO, …) and
///         releases them on settlement. Two task types are supported:
///         - Gig: assigned to one worker, released to that worker.
///         - Bounty: open to many submissions; the client selects winners and the
///           reward is split equally between them.
contract VeraGigEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IVeraScoreRegistry public scoreRegistry;
    IVeraGigFeeRouter public feeRouter;

    /// @notice Backend signer operated by the official frontend (https://useveragig.online).
    /// All fund-moving task actions must be submitted by this relayer (or the owner).
    address public trustedRelayer;

    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant BPS_DENOM = 10000;

    enum TaskStatus { Open, Assigned, Submitted, Completed, Disputed, Cancelled }
    enum TaskType { Gig, Bounty }

    struct Task {
        bytes32 id;
        address client;
        address worker;       // Gig: assigned worker. Bounty: unused (winners passed at settlement).
        address token;        // ERC-20 the reward is escrowed in.
        uint256 rewardWei;    // Reward in `token` base units (excludes the 2% fee).
        uint256 deadline;
        TaskStatus status;
        TaskType taskType;
        bytes32 deliverableCid;
        uint8 rating;
    }

    mapping(bytes32 => Task) public tasks;
    mapping(bytes32 => bytes32) public disputes; // taskId => disputeId
    mapping(address => bool) public allowedToken;

    event TokenAllowed(address indexed token, bool allowed);
    event TaskCreated(
        bytes32 indexed taskId,
        address indexed client,
        address indexed token,
        uint256 rewardWei,
        uint256 deadline,
        TaskType taskType
    );
    event TaskAssigned(bytes32 indexed taskId, address indexed worker);
    event TaskSubmitted(bytes32 indexed taskId, address indexed worker, bytes32 deliverableCid);
    event TaskCompleted(bytes32 indexed taskId, address indexed worker, uint8 rating);
    event BountySettled(bytes32 indexed taskId, address[] winners, uint256 sharePerWinner);
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
        address _scoreRegistry,
        address _feeRouter,
        address _trustedRelayer
    ) Ownable(msg.sender) {
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

    /// @notice Whitelist (or remove) an ERC-20 that tasks may be funded in.
    function setAllowedToken(address token, bool allowed) external onlyOwner {
        require(token != address(0), "Zero token");
        allowedToken[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    /// @notice Create and fund a task on behalf of `client`. Relayer/owner only.
    /// @dev `client` must have approved this contract for `rewardWei + fee` of `token`.
    function createTask(
        bytes32 taskId,
        address client,
        address token,
        uint256 rewardWei,
        uint256 deadline,
        TaskType taskType
    ) external onlyRelayerOrOwner nonReentrant {
        require(client != address(0), "Zero client");
        require(allowedToken[token], "Token not allowed");
        require(tasks[taskId].client == address(0), "Task exists");
        require(deadline > block.timestamp, "Deadline in past");
        require(rewardWei > 0, "Reward required");

        uint256 fee = (rewardWei * FEE_BPS) / BPS_DENOM;
        uint256 totalRequired = rewardWei + fee;

        IERC20(token).safeTransferFrom(client, address(this), totalRequired);

        tasks[taskId] = Task({
            id: taskId,
            client: client,
            worker: address(0),
            token: token,
            rewardWei: rewardWei,
            deadline: deadline,
            status: TaskStatus.Open,
            taskType: taskType,
            deliverableCid: bytes32(0),
            rating: 0
        });

        emit TaskCreated(taskId, client, token, rewardWei, deadline, taskType);
    }

    // ----------------------------------------------------------------------
    // Gig flow: assign one worker, who submits, then the client approves.
    // ----------------------------------------------------------------------

    function assignTask(bytes32 taskId, address worker) external {
        Task storage task = tasks[taskId];
        require(task.client == msg.sender, "Not client");
        require(task.taskType == TaskType.Gig, "Not a gig");
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

    /// @notice Approve a submitted gig and release the reward to the worker. Relayer/owner only.
    /// @param client The task's client, on whose behalf the relayer acts (must match stored client).
    function approveAndRelease(bytes32 taskId, address client, uint8 rating) external onlyRelayerOrOwner nonReentrant {
        Task storage task = tasks[taskId];
        require(task.client == client, "Not client");
        require(task.taskType == TaskType.Gig, "Not a gig");
        require(task.status == TaskStatus.Submitted, "Not submitted");
        require(rating >= 1 && rating <= 5, "Rating 1-5");

        task.rating = rating;
        task.status = TaskStatus.Completed;

        _routeFee(taskId, task.token, task.rewardWei);
        IERC20(task.token).safeTransfer(task.worker, task.rewardWei);

        emit TaskCompleted(taskId, task.worker, rating);
    }

    // ----------------------------------------------------------------------
    // Bounty flow: many off-chain submissions; client selects winners and the
    // reward is split equally between them.
    // ----------------------------------------------------------------------

    /// @notice Settle a bounty by splitting the reward equally among `winners`. Relayer/owner only.
    /// @dev Submissions are tracked off-chain; the relayer passes the selected winner
    ///      addresses here. Integer-division remainder goes to the first winner so the
    ///      full reward is always distributed. Winners must be de-duplicated by the caller.
    function approveBountyWinners(
        bytes32 taskId,
        address client,
        address[] calldata winners,
        uint8 rating
    ) external onlyRelayerOrOwner nonReentrant {
        Task storage task = tasks[taskId];
        require(task.client == client, "Not client");
        require(task.taskType == TaskType.Bounty, "Not a bounty");
        require(task.status == TaskStatus.Open, "Not open");
        require(winners.length > 0, "No winners");
        require(rating >= 1 && rating <= 5, "Rating 1-5");

        task.rating = rating;
        task.status = TaskStatus.Completed;

        address token = task.token;
        uint256 reward = task.rewardWei;

        _routeFee(taskId, token, reward);

        uint256 share = reward / winners.length;
        uint256 remainder = reward - (share * winners.length);

        for (uint256 i = 0; i < winners.length; i++) {
            require(winners[i] != address(0), "Zero winner");
            uint256 amount = i == 0 ? share + remainder : share;
            IERC20(token).safeTransfer(winners[i], amount);
        }

        emit BountySettled(taskId, winners, share);
    }

    /// @notice Cancel an open task and refund the client (reward + fee). Relayer/owner only.
    /// @param client The task's client, on whose behalf the relayer acts (must match stored client).
    function cancelTask(bytes32 taskId, address client) external onlyRelayerOrOwner nonReentrant {
        Task storage task = tasks[taskId];
        require(task.client == client, "Not client");
        require(task.status == TaskStatus.Open, "Can only cancel open tasks");

        task.status = TaskStatus.Cancelled;
        uint256 fee = (task.rewardWei * FEE_BPS) / BPS_DENOM;
        IERC20(task.token).safeTransfer(task.client, task.rewardWei + fee);

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
        _routeFee(taskId, task.token, task.rewardWei);
        IERC20(task.token).safeTransfer(winner, task.rewardWei);

        emit DisputeResolved(taskId, winner);
    }

    /// @dev Approve the fee router for the 2% fee held by this contract and route it.
    function _routeFee(bytes32 taskId, address token, uint256 settlementAmount) internal {
        uint256 fee = (settlementAmount * FEE_BPS) / BPS_DENOM;
        IERC20(token).forceApprove(address(feeRouter), fee);
        feeRouter.routeFee(taskId, token, settlementAmount);
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
