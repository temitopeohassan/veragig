// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract GoodScoreRegistry is Ownable, ReentrancyGuard {
    struct WorkerScore {
        uint16 score;           // 0–850 composite score
        uint32 lastUpdatedBlock;
        uint32 tasksCompleted;
        uint32 tasksAccepted;
        uint32 disputesLost;
        uint32 loansRepaidOnTime;
        uint32 ubiClaimStreakDays;
        uint32 earningConsistencyWeeks;
    }

    mapping(address => WorkerScore) public scores;
    mapping(address => bool) public authorizedUpdaters;

    event ScoreUpdated(address indexed worker, uint16 oldScore, uint16 newScore, string trigger);
    event UpdaterAuthorized(address indexed updater, bool authorized);

    constructor() Ownable(msg.sender) {}

    modifier onlyAuthorized() {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
        emit UpdaterAuthorized(updater, authorized);
    }

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
    ) external onlyAuthorized {
        uint16 oldScore = scores[worker].score;
        scores[worker] = WorkerScore({
            score: newScore,
            lastUpdatedBlock: uint32(block.number),
            tasksCompleted: tasksCompleted,
            tasksAccepted: tasksAccepted,
            disputesLost: disputesLost,
            loansRepaidOnTime: loansRepaidOnTime,
            ubiClaimStreakDays: ubiClaimStreakDays,
            earningConsistencyWeeks: earningConsistencyWeeks
        });
        emit ScoreUpdated(worker, oldScore, newScore, trigger);
    }

    function getScore(address worker) external view returns (uint16) {
        return scores[worker].score;
    }

    function getLoanTier(address worker) external view returns (string memory) {
        uint16 score = scores[worker].score;
        if (score >= 700) return "prime";
        if (score >= 500) return "builder";
        if (score >= 300) return "starter";
        return "none";
    }

    function getFullProfile(address worker) external view returns (WorkerScore memory) {
        return scores[worker];
    }
}
