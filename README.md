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
| GoodDollar Identity | `0xC361A6E67822a0EDc17D899227dd9FC50BD62F42` |
| G$ Token | `0x62B8B11039fcfE5AB0C56E502b1C372A3D2a9C7A` |
| CFAv1Forwarder | `0xcfA132E353cB4E398080B9700609bb008eceB125` |
| VeraGigEscrow | TBD after deployment |
| VeraScoreRegistry | TBD after deployment |
| VeraGigLendingPool | TBD after deployment |
| VeraGigFeeRouter | TBD after deployment |

## Author

Temitope Hassan — [GitHub](https://github.com/temitopeohassan/veragig)
