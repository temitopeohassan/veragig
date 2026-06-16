# VeraGig Project Instructions

This project, **VeraGig**, is a hybrid gig marketplace and on-chain micro-credit protocol built on the **GoodDollar** ecosystem and **Celo** blockchain. It enables Sybil-resistant identity verification, G$ token payments, real-time streaming (Superfluid), and AI-powered task matching and credit scoring.

## Project Overview

### Architecture
The project is organized as a multi-component workspace:
- **`backend/`**: FastAPI (Python) service providing AI matching, credit scoring logic, and task management.
- **`contracts/`**: Solidity smart contracts managed with Hardhat. Handles escrow, lending pools, and score registries on Celo.
- **`frontend/`**: Next.js 14 application using Wagmi/Viem for blockchain interactions and RainbowKit for wallet connectivity.

### Core Technologies
- **Blockchain**: Celo Mainnet/Alfajores.
- **Tokens**: G$ (GoodDollar ERC20).
- **Identity**: GoodDollar Face Verification (Identity.sol).
- **AI**: Anthropic Claude (via backend) for task-worker matching, deliverable verification, and credit narratives.
- **Protocols**: Superfluid (for streaming payments).

---

## Building and Running

### Prerequisites
- Node.js 20+
- Python 3.11+
- Hardhat (installed via npm in `contracts/`)

### Backend (FastAPI)
1. Navigate to `backend/`.
2. Create and activate a virtual environment: `python -m venv venv`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Copy `.env.example` to `.env` and fill in required keys (Anthropic API, Database URLs, Web3 Providers).
5. Start the server: `uvicorn app.main:app --reload`.

### Smart Contracts (Hardhat)
1. Navigate to `contracts/`.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env`.
4. Compile contracts: `npm run compile`.
5. Run tests: `npm run test`.
6. Deploy: `npm run deploy:celo` or `npm run deploy:local`.

### Frontend (Next.js)
1. Navigate to `frontend/`.
2. Install dependencies: `npm install`.
3. Copy `.env.local.example` to `.env.local`.
4. Start development server: `npm run dev`.

---

## Development Conventions

### Smart Contracts
- **Solidity Version**: `^0.8.24`.
- **Security**: Use `@openzeppelin/contracts` for `Ownable`, `ReentrancyGuard`, and `SafeERC20`.
- **Registry Pattern**: VeraScore and Fee Routing are decoupled into separate registry contracts.
- **Testing**: Comprehensive tests are located in `contracts/test/`. Always run `npm run test` before deployment.

### Backend
- **Framework**: FastAPI with Pydantic for data validation.
- **AI Integration**: AI services are encapsulated in `app/services/ai_service.py`.
- **Blockchain Interaction**: `web3.py` is used for reading on-chain state (e.g., GoodScore signals).

### Frontend
- **Framework**: Next.js 14 (App Router).
- **Styling**: Tailwind CSS with `clsx` and `tailwind-merge`.
- **State Management**: `@tanstack/react-query` (via Wagmi).
- **Hooks**: Custom hooks for business logic are in `frontend/hooks/` (e.g., `useGoodScore`, `useLoan`).

---

## Key Files & Paths

- `backend/app/main.py`: Entry point for the API.
- `contracts/contracts/VeraGigEscrow.sol`: Main escrow logic for task payments.
- `contracts/contracts/VeraGigLendingPool.sol`: Micro-loan management.
- `frontend/app/page.tsx`: Landing page.
- `frontend/lib/wagmi.ts`: Blockchain and wallet configuration.

## Contribution Workflow
1. Ensure all environment variables are correctly set.
2. For contract changes: Update ABIs in `frontend/abis/` after recompiling.
3. For backend changes: Ensure Pydantic models match the frontend's expected response format.
4. For frontend changes: Use the custom hooks provided in `hooks/` for consistent data fetching.
