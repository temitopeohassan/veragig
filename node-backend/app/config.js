require('dotenv').config();

const config = {
  veragigEnv: process.env.VERAGIG_ENV || 'production',
  celoRpcUrl: process.env.CELO_RPC_URL || 'https://forno.celo.org',
  backendPrivateKey: process.env.BACKEND_PRIVATE_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'sqlite:/tmp/veragig.db',
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || './veragig-api-firebase-adminsdk-fbsvc-e4deba2e3e.json',
  graphNodeUrl: process.env.GRAPH_NODE_URL || '',
  ipfsApiUrl: process.env.IPFS_API_URL || 'https://api.0g.ai',
  zeroGApiKey: process.env.ZERO_G_API_KEY || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379/0',

  // Contract addresses
  accountContract: process.env.ACCOUNT_CONTRACT || '0x3FBcCD2496A22C2C4247D2c985EC47EaFa76638e',
  escrowContract: process.env.ESCROW_CONTRACT || '0xDa4F6EE5f77883a901F1509b8B3548b95BAfCE5f',
  scoreRegistry: process.env.SCORE_REGISTRY || '0xac9861Bf37588Bc17D5B60Bf1EB47C664a572510',
  lendingPool: process.env.LENDING_POOL || '0x52E0220fe011923f28440C851ae0efD6B3d63f06',
  feeRouter: process.env.FEE_ROUTER || '0xE27c10d0a730b0E4B54EF199f54Bc2f7feC1A7B6',

  // Known contracts
  gDollarAddress: '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A',
  identityContract: '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42',
  cfaForwarder: '0xcfA132E353cB4E398080B9700609bb008eceB125',

  // Reward tokens the escrow accepts. Addresses + decimals verified on Celo mainnet.
  // USDT is native Tether (6 decimals); CELO is the native asset's ERC-20 interface.
  rewardTokens: {
    'G$':   { symbol: 'G$',   address: '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A', decimals: 18 },
    'USDT': { symbol: 'USDT', address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e', decimals: 6 },
    'CELO': { symbol: 'CELO', address: '0x471EcE3750Da237f93B8E339c536989b8978a438', decimals: 18 },
  },
};

// Lookup helper: resolve a token by symbol or address (case-insensitive) to its
// registry entry, or null if it is not a whitelisted reward token.
config.resolveToken = (tokenSymbolOrAddress) => {
  if (!tokenSymbolOrAddress) return null;
  const q = String(tokenSymbolOrAddress).toLowerCase();
  return (
    Object.values(config.rewardTokens).find(
      (t) => t.symbol.toLowerCase() === q || t.address.toLowerCase() === q
    ) || null
  );
};

module.exports = config;
