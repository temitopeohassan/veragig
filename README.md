# VeraGig

A hybrid gig marketplace and on-chain micro-credit protocol built on GoodDollar × Celo.

## Overview

VeraGig connects verified humans (via GoodDollar Face Verification) to gig work, paying in G$ via Superfluid streams. Workers build an on-chain credit score (VeraScore) that unlocks micro-loans from the Worker Advancement Pool.

## Architecture

```
veragig/
├── frontend/      # Next.js 14 + Wagmi + Viem
├── node-backend/  # Node.js + Express + Firestore + Anthropic Claude
└── contracts/     # Solidity + Hardhat (Celo)
```

## Key Features

- **Identity**: GoodDollar Face Verification (one-human-one-account sybil resistance)
- **Task Marketplace**: Post/apply/complete gigs with G$ escrow
- **G$ Streaming**: Superfluid CFAv1Forwarder real-time payments
- **VeraScore**: On-chain credit score (0–850) from task history and UBI signals
- **Micro-Loans**: Score-gated lending pool with auto-repayment from earnings
- **AI Matching**: Claude-powered task-worker matching and deliverable verification

## Quick Start

### Prerequisites
- Node.js 20+
- A Firebase project (Firestore) with a service account
- A Celo-compatible wallet (MetaMask, Valora, MiniPay)

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Backend
```bash
cd node-backend
npm install
# Create a .env with at least:
#   FIREBASE_SERVICE_ACCOUNT  (service account JSON, or path to it)
#   ANTHROPIC_API_KEY
#   CELO_RPC_URL, BACKEND_PRIVATE_KEY
#   ESCROW_CONTRACT, SCORE_REGISTRY, LENDING_POOL, FEE_ROUTER
npm run dev          # nodemon; use `npm start` for production
```

### Contracts
```bash
cd contracts
npm install
cp .env.example .env
npm run compile
npm run deploy:celo
```

## Contracts (Celo Mainnet)

| Contract | Address |
|---|---|
| VeraGigEscrow | [`0x215af329A2142361730eed1aA83aed656Ed2F194`](https://celoscan.io/address/0x215af329A2142361730eed1aA83aed656Ed2F194#code) |
| VeraGigFeeRouter | [`0x8CF2B033dE82c861DD0Fb60F25031C5D9c328Bb2`](https://celoscan.io/address/0x8CF2B033dE82c861DD0Fb60F25031C5D9c328Bb2#code) |
| VeraScoreRegistry | `0xac9861Bf37588Bc17D5B60Bf1EB47C664a572510` |
| VeraGigLendingPool | `0x52E0220fe011923f28440C851ae0efD6B3d63f06` |
| Account registry | `0x3FBcCD2496A22C2C4247D2c985EC47EaFa76638e` |
| GoodDollar Identity | `0xC361A6E67822a0EDc17D899227dd9FC50BD62F42` |
| CFAv1Forwarder | `0xcfA132E353cB4E398080B9700609bb008eceB125` |

`VeraGigEscrow` and `VeraGigFeeRouter` are source-verified on Celoscan (links above).

### Reward tokens (escrow whitelist)

Tasks can be funded and paid out in any of these ERC-20s:

| Token | Address | Decimals |
|---|---|---|
| G$ (GoodDollar) | `0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A` | 18 |
| USD₮ (native Tether) | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` | 6 |
| CELO | `0x471EcE3750Da237f93B8E339c536989b8978a438` | 18 |

## Author

Temitope Hassan — [GitHub](https://github.com/temitopeohassan/veragig)
