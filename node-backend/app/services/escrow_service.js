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
      { "internalType": "uint256", "name": "rewardWei", "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
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
      { "internalType": "address", "name": "client", "type": "address" }
    ],
    "name": "cancelTask",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

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
   * escrow contract for rewardWei + 2% fee of G$ before this is called.
   */
  async createTask({ taskId, client, rewardWei, deadlineUnix }) {
    this._requireSigner();
    return this.walletClient.writeContract({
      address: getAddress(config.escrowContract),
      abi: ESCROW_ABI,
      functionName: 'createTask',
      args: [
        taskId,
        getAddress(client),
        BigInt(rewardWei),
        BigInt(deadlineUnix),
      ],
    });
  }

  /** Relay approveAndRelease — releases the reward to the worker. */
  async approveAndRelease({ taskId, client, rating }) {
    this._requireSigner();
    return this.walletClient.writeContract({
      address: getAddress(config.escrowContract),
      abi: ESCROW_ABI,
      functionName: 'approveAndRelease',
      args: [taskId, getAddress(client), Number(rating)],
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
