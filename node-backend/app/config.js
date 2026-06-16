require('dotenv').config();

const config = {
  veragigEnv: process.env.VERAGIG_ENV || 'production',
  celoRpcUrl: process.env.CELO_RPC_URL || 'https://forno.celo.org',
  backendPrivateKey: process.env.BACKEND_PRIVATE_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'sqlite:./veragig.db',
  graphNodeUrl: process.env.GRAPH_NODE_URL || '',
  ipfsApiUrl: process.env.IPFS_API_URL || 'https://api.0g.ai',
  zeroGApiKey: process.env.ZERO_G_API_KEY || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379/0',

  // Contract addresses
  escrowContract: process.env.ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
  scoreRegistry: process.env.SCORE_REGISTRY || '0x0000000000000000000000000000000000000000',
  lendingPool: process.env.LENDING_POOL || '0x0000000000000000000000000000000000000000',
  feeRouter: process.env.FEE_ROUTER || '0x0000000000000000000000000000000000000000',

  // Known contracts
  gDollarAddress: '0x62B8B11039fcfE5AB0C56E502b1C372A3D2a9C7A',
  identityContract: '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42',
  cfaForwarder: '0xcfA132E353cB4E398080B9700609bb008eceB125',
};

module.exports = config;
