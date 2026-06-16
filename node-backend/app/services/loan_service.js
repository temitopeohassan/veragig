const { createPublicClient, createWalletClient, http, getAddress, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { celo } = require('viem/chains');
const config = require('../config');
const { getScoreService } = require('./score_service');

const LENDING_POOL_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "worker", "type": "address"}],
    "name": "checkEligibility",
    "outputs": [
      {"internalType": "bool", "name": "isEligible", "type": "bool"},
      {"internalType": "uint256", "name": "maxLoanWei", "type": "uint256"},
      {"internalType": "uint8", "name": "repaymentPct", "type": "uint8"},
      {"internalType": "string", "name": "tier", "type": "string"},
      {"internalType": "string", "name": "reason", "type": "string"},
    ],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "requestedWei", "type": "uint256"},
      {"internalType": "string", "name": "purpose", "type": "string"},
    ],
    "name": "requestLoan",
    "outputs": [{"internalType": "bytes32", "name": "loanId", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "loanId", "type": "bytes32"},
      {"internalType": "uint256", "name": "payoutAmountWei", "type": "uint256"},
    ],
    "name": "processRepayment",
    "outputs": [{"internalType": "uint256", "name": "deductionWei", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "loanId", "type": "bytes32"}],
    "name": "getLoan",
    "outputs": [
      {
        "components": [
          {"internalType": "bytes32", "name": "id", "type": "bytes32"},
          {"internalType": "address", "name": "worker", "type": "address"},
          {"internalType": "uint256", "name": "principalWei", "type": "uint256"},
          {"internalType": "uint256", "name": "remainingWei", "type": "uint256"},
          {"internalType": "uint8", "name": "repaymentDeductionPct", "type": "uint8"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "bool", "name": "fullyRepaid", "type": "bool"},
        ],
        "internalType": "struct GoodFlowLendingPool.Loan",
        "name": "",
        "type": "tuple",
      }
    ],
    "stateMutability": "view",
    "type": "function",
  },
];

class LoanService {
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

  async checkEligibility(workerAddress) {
    const addr = getAddress(workerAddress);
    const [isEligible, maxLoanWei, repaymentPct, tier, reason] = await this.publicClient.readContract({
      address: getAddress(config.lendingPool),
      abi: LENDING_POOL_ABI,
      functionName: 'checkEligibility',
      args: [addr],
    });

    const scoreData = await getScoreService().getScore(workerAddress);

    return {
      is_eligible: isEligible,
      max_loan_g_dollar: (BigInt(maxLoanWei) / BigInt(10**18)).toString(),
      good_score: scoreData.good_score,
      loan_tier: tier,
      repayment_deduction_pct: Number(repaymentPct),
      reason_if_ineligible: !isEligible ? reason : null,
    };
  }

  async processAutoRepayment(loanId, workerAddress, payoutWei, repaymentPct) {
    if (!this.walletClient) {
      return { error: 'No backend signer configured' };
    }

    const loanIdBytes = loanId.startsWith('0x') ? loanId : `0x${loanId}`;
    
    const txHash = await this.walletClient.writeContract({
      address: getAddress(config.lendingPool),
      abi: LENDING_POOL_ABI,
      functionName: 'processRepayment',
      args: [loanIdBytes, BigInt(payoutWei)],
    });

    const deduction = (BigInt(payoutWei) * BigInt(repaymentPct)) / BigInt(100);
    
    return {
      deduction_wei: deduction.toString(),
      repay_tx: txHash,
    };
  }
}

let instance = null;
const getLoanService = () => {
  if (!instance) {
    instance = new LoanService();
  }
  return instance;
};

module.exports = { getLoanService, LoanService };
