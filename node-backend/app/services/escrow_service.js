const { createPublicClient, createWalletClient, http, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { celo } = require('viem/chains');
const config = require('../config');

// Minimal ABI for the relayer-gated fund-moving functions on VeraGigEscrow.
const ESCROW_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "taskId", "type": "bytes32" },
      { "internalType": "address", "name": "client", "type": "address" },
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "rewardWei", "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "uint8", "name": "taskType", "type": "uint8" }
    ],
    "name": "createTask",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "taskId", "type": "bytes32" },
      { "internalType": "address", "name": "client", "type": "address" },
      { "internalType": "uint8", "name": "rating", "type": "uint8" }
    ],
    "name": "approveAndRelease",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "taskId", "type": "bytes32" },
      { "internalType": "address", "name": "client", "type": "address" },
      { "internalType": "address[]", "name": "winners", "type": "address[]" },
      { "internalType": "uint8", "name": "rating", "type": "uint8" }
    ],
    "name": "approveBountyWinners",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "taskId", "type": "bytes32" },
      { "internalType": "address", "name": "client", "type": "address" }
    ],
    "name": "cancelTask",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// TaskType enum on-chain: Gig = 0, Bounty = 1.
const TASK_TYPE = { gig: 0, bounty: 1 };

class EscrowService {
  constructor() {
    this.publicClient = createPublicClient({
      chain: celo,
      transport: http(config.celoRpcUrl),
    });

    // The relayer signer — this account must be set on-chain via escrow.setTrustedRelayer().
    if (config.backendPrivateKey && config.backendPrivateKey.startsWith('0x') && config.backendPrivateKey.length === 66) {
      try {
        this.account = privateKeyToAccount(config.backendPrivateKey);
        this.walletClient = createWalletClient({
          account: this.account,
          chain: celo,
          transport: http(config.celoRpcUrl),
        });
      } catch (e) {
        console.error('Failed to initialize escrow relayer wallet client:', e.message);
      }
    }
  }

  get relayerAddress() {
    return this.account ? this.account.address : null;
  }

  _requireSigner() {
    if (!this.walletClient) {
      throw new Error('RELAYER_NOT_CONFIGURED');
    }
  }

  /**
   * Relay createTask on behalf of `client`. The client must have approved the
   * escrow contract for rewardWei + 2% fee of `token` before this is called.
   * @param {('gig'|'bounty')} taskType
   */
  async createTask({ taskId, client, token, rewardWei, deadlineUnix, taskType }) {
    this._requireSigner();
    const typeEnum = TASK_TYPE[taskType];
    if (typeEnum === undefined) throw new Error('INVALID_TASK_TYPE');
    return this.walletClient.writeContract({
      address: getAddress(config.escrowContract),
      abi: ESCROW_ABI,
      functionName: 'createTask',
      args: [
        taskId,
        getAddress(client),
        getAddress(token),
        BigInt(rewardWei),
        BigInt(deadlineUnix),
        typeEnum,
      ],
    });
  }

  /** Relay approveAndRelease — releases a gig reward to the assigned worker. */
  async approveAndRelease({ taskId, client, rating }) {
    this._requireSigner();
    return this.walletClient.writeContract({
      address: getAddress(config.escrowContract),
      abi: ESCROW_ABI,
      functionName: 'approveAndRelease',
      args: [taskId, getAddress(client), Number(rating)],
    });
  }

  /** Relay approveBountyWinners — splits a bounty reward equally among winners. */
  async approveBountyWinners({ taskId, client, winners, rating }) {
    this._requireSigner();
    const winnerAddrs = winners.map((w) => getAddress(w));
    return this.walletClient.writeContract({
      address: getAddress(config.escrowContract),
      abi: ESCROW_ABI,
      functionName: 'approveBountyWinners',
      args: [taskId, getAddress(client), winnerAddrs, Number(rating)],
    });
  }

  /** Relay cancelTask — refunds an open task to the client. */
  async cancelTask({ taskId, client }) {
    this._requireSigner();
    return this.walletClient.writeContract({
      address: getAddress(config.escrowContract),
      abi: ESCROW_ABI,
      functionName: 'cancelTask',
      args: [taskId, getAddress(client)],
    });
  }
}

let instance = null;
const getEscrowService = () => {
  if (!instance) {
    instance = new EscrowService();
  }
  return instance;
};

module.exports = { getEscrowService, EscrowService };
