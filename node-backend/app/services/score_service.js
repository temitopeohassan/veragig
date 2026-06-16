const { createPublicClient, createWalletClient, http, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { celo } = require('viem/chains');
const config = require('../config');

const SCORE_REGISTRY_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "worker", "type": "address"}],
    "name": "getScore",
    "outputs": [{"internalType": "uint16", "name": "", "type": "uint16"}],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [{"internalType": "address", "name": "worker", "type": "address"}],
    "name": "getLoanTier",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [{"internalType": "address", "name": "worker", "type": "address"}],
    "name": "getFullProfile",
    "outputs": [
      {
        "components": [
          {"internalType": "uint16", "name": "score", "type": "uint16"},
          {"internalType": "uint32", "name": "lastUpdatedBlock", "type": "uint32"},
          {"internalType": "uint32", "name": "tasksCompleted", "type": "uint32"},
          {"internalType": "uint32", "name": "tasksAccepted", "type": "uint32"},
          {"internalType": "uint32", "name": "disputesLost", "type": "uint32"},
          {"internalType": "uint32", "name": "loansRepaidOnTime", "type": "uint32"},
          {"internalType": "uint32", "name": "ubiClaimStreakDays", "type": "uint32"},
          {"internalType": "uint32", "name": "earningConsistencyWeeks", "type": "uint32"},
        ],
        "internalType": "struct GoodScoreRegistry.WorkerScore",
        "name": "",
        "type": "tuple",
      }
    ],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [
      {"internalType": "address", "name": "worker", "type": "address"},
      {"internalType": "uint16", "name": "newScore", "type": "uint16"},
      {"internalType": "uint32", "name": "tasksCompleted", "type": "uint32"},
      {"internalType": "uint32", "name": "tasksAccepted", "type": "uint32"},
      {"internalType": "uint32", "name": "disputesLost", "type": "uint32"},
      {"internalType": "uint32", "name": "loansRepaidOnTime", "type": "uint32"},
      {"internalType": "uint32", "name": "ubiClaimStreakDays", "type": "uint32"},
      {"internalType": "uint32", "name": "earningConsistencyWeeks", "type": "uint32"},
      {"internalType": "string", "name": "trigger", "type": "string"},
    ],
    "name": "updateScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
];

const WEIGHTS = {
  "task_completion_rate": 0.30,
  "earnings_consistency": 0.25,
  "dispute_outcome": 0.20,
  "ubi_claim_streak": 0.15,
  "loan_repayment": 0.10,
};

class ScoreService {
  constructor() {
    this.publicClient = createPublicClient({
      chain: celo,
      transport: http(config.celoRpcUrl),
    });

    if (config.backendPrivateKey && config.backendPrivateKey.startsWith('0x') && config.backendPrivateKey.length === 66) {
      try {
        this.account = privateKeyToAccount(config.backendPrivateKey);
        this.walletClient = createWalletClient({
          account: this.account,
          chain: celo,
          transport: http(config.celoRpcUrl),
        });
      } catch (e) {
        console.error('Failed to initialize wallet client:', e.message);
      }
    }
  }

  async getScore(workerAddress) {
    const addr = getAddress(workerAddress);
    const profile = await this.publicClient.readContract({
      address: getAddress(config.scoreRegistry),
      abi: SCORE_REGISTRY_ABI,
      functionName: 'getFullProfile',
      args: [addr],
    });

    const [score, lastBlock, tasksDone, tasksAccepted, disputesLost, loansRepaid, ubiStreak, earnWeeks] = profile;
    const completionRate = tasksAccepted > 0 ? Number(tasksDone) / Number(tasksAccepted) : 0.0;
    const tier = await this.publicClient.readContract({
      address: getAddress(config.scoreRegistry),
      abi: SCORE_REGISTRY_ABI,
      functionName: 'getLoanTier',
      args: [addr],
    });

    return {
      good_score: Number(score),
      loan_tier: tier,
      signals: {
        task_completion_rate: parseFloat(completionRate.toFixed(4)),
        earnings_consistency_weeks: Number(earnWeeks),
        disputes_lost: Number(disputesLost),
        ubi_claim_streak_days: Number(ubiStreak),
        loans_repaid_on_time: Number(loansRepaid),
      },
      last_updated_block: Number(lastBlock),
    };
  }

  _computeScore(signals) {
    const completionRate = signals.task_completion_rate || 0.0;
    const earnWeeks = signals.earnings_consistency_weeks || 0;
    const disputesLost = signals.disputes_lost || 0;
    const ubiStreak = signals.ubi_claim_streak_days || 0;
    const loansRepaid = signals.loans_repaid_on_time || 0;

    let score = 0.0;
    score += WEIGHTS.task_completion_rate * Math.min(completionRate * 850, 850);
    score += WEIGHTS.earnings_consistency * Math.min(earnWeeks * 10, 850);
    score += WEIGHTS.dispute_outcome * Math.max(0, 850 - disputesLost * 50);
    score += WEIGHTS.ubi_claim_streak * Math.min(ubiStreak * 5, 850);
    score += WEIGHTS.loan_repayment * Math.min(loansRepaid * 100, 850);

    return Math.min(Math.floor(score), 850);
  }

  async computeAndUpdate(workerAddress, triggerEvent) {
    const addr = getAddress(workerAddress);
    const profile = await this.publicClient.readContract({
      address: getAddress(config.scoreRegistry),
      abi: SCORE_REGISTRY_ABI,
      functionName: 'getFullProfile',
      args: [addr],
    });

    const [scoreOld, lastBlock, tasksDone, tasksAccepted, disputesLost, loansRepaid, ubiStreak, earnWeeks] = profile;
    const completionRate = tasksAccepted > 0 ? Number(tasksDone) / Number(tasksAccepted) : 0.0;
    
    const signals = {
      task_completion_rate: completionRate,
      earnings_consistency_weeks: Number(earnWeeks),
      disputes_lost: Number(disputesLost),
      ubi_claim_streak_days: Number(ubiStreak),
      loans_repaid_on_time: Number(loansRepaid),
    };

    const newScore = this._computeScore(signals);

    let txHash = null;
    if (this.walletClient && config.scoreRegistry !== '0x' + '0'.repeat(40)) {
      txHash = await this.walletClient.writeContract({
        address: getAddress(config.scoreRegistry),
        abi: SCORE_REGISTRY_ABI,
        functionName: 'updateScore',
        args: [
          addr, 
          newScore, 
          Number(tasksDone), 
          Number(tasksAccepted), 
          Number(disputesLost),
          Number(loansRepaid), 
          Number(ubiStreak), 
          Number(earnWeeks), 
          triggerEvent
        ],
      });
    }

    return {
      new_score: newScore,
      delta: newScore - Number(scoreOld),
      update_tx: txHash,
      signals_snapshot: signals,
    };
  }
}

let instance = null;
const getScoreService = () => {
  if (!instance) {
    instance = new ScoreService();
  }
  return instance;
};

module.exports = { getScoreService, ScoreService };
