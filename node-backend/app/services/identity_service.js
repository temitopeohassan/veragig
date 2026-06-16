const { createPublicClient, http } = require('viem');
const { celo } = require('viem/chains');
const { IdentitySDK } = require('@goodsdks/citizen-sdk');
const config = require('../config');

class IdentityService {
  constructor() {
    this.publicClient = createPublicClient({
      chain: celo,
      transport: http(config.celoRpcUrl),
    });
    this.identitySDK = new IdentitySDK(this.publicClient, null, config.veragigEnv);
  }

  async getWhitelistedRoot(account) {
    try {
      const { isWhitelisted, root } = await this.identitySDK.getWhitelistedRoot(account);
      // We also need lastAuthenticated for the response
      // IdentitySDK might not expose it directly in getWhitelistedRoot, let's check if we can get it from the contract
      // The Python code calls the contract directly
      const lastAuth = await this.publicClient.readContract({
        address: config.identityContract,
        abi: [
          {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "lastAuthenticated",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
          }
        ],
        functionName: 'lastAuthenticated',
        args: [account],
      });

      return {
        is_whitelisted: isWhitelisted,
        root: root,
        last_authenticated_timestamp: Number(lastAuth),
      };
    } catch (error) {
      console.error('Error in getWhitelistedRoot:', error);
      return { is_whitelisted: false, root: null, last_authenticated_timestamp: 0 };
    }
  }

  async getExpiryData(account) {
    try {
      const lastAuth = await this.publicClient.readContract({
        address: config.identityContract,
        abi: [
          {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "lastAuthenticated",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
          },
          {
            "inputs": [],
            "name": "authenticationPeriod",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
          }
        ],
        functionName: 'lastAuthenticated',
        args: [account],
      });

      const authPeriod = await this.publicClient.readContract({
        address: config.identityContract,
        abi: [
          {
            "inputs": [],
            "name": "authenticationPeriod",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
          }
        ],
        functionName: 'authenticationPeriod',
      });

      const expiresAt = Number(lastAuth) + (Number(authPeriod) * 86400);
      const isExpired = Date.now() / 1000 > expiresAt;

      return {
        last_authenticated: Number(lastAuth),
        authentication_period_days: Number(authPeriod),
        expires_at: expiresAt,
        is_expired: isExpired,
      };
    } catch (error) {
      console.error('Error in getExpiryData:', error);
      return { last_authenticated: 0, authentication_period_days: 0, expires_at: 0, is_expired: true };
    }
  }
}

let instance = null;
const getIdentityService = () => {
  if (!instance) {
    instance = new IdentityService();
  }
  return instance;
};

module.exports = { getIdentityService, IdentityService };
