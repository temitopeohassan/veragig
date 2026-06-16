from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from app.config import get_settings
from app.services.score_service import get_score_service

settings = get_settings()

LENDING_POOL_ABI = [
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
]


class LoanService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.celo_rpc_url))
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(settings.lending_pool),
            abi=LENDING_POOL_ABI,
        )
        self.account = Account.from_key(settings.backend_private_key) if settings.backend_private_key else None

    def check_eligibility(self, worker_address: str) -> dict:
        addr = Web3.toChecksumAddress(worker_address)
        is_eligible, max_loan_wei, repayment_pct, tier, reason = self.contract.functions.checkEligibility(addr).call()

        score_data = get_score_service().get_score(worker_address)

        return {
            "is_eligible": is_eligible,
            "max_loan_g_dollar": str(max_loan_wei // 10**18),
            "good_score": score_data["good_score"],
            "loan_tier": tier,
            "repayment_deduction_pct": repayment_pct,
            "reason_if_ineligible": reason if not is_eligible else None,
        }

    async def process_auto_repayment(self, loan_id: str, worker_address: str, payout_wei: int, repayment_pct: int) -> dict:
        if not self.account:
            return {"error": "No backend signer configured"}

        loan_id_bytes = bytes.fromhex(loan_id.lstrip("0x"))
        nonce = self.w3.eth.getTransactionCount(self.account.address)
        tx = self.contract.functions.processRepayment(
            loan_id_bytes, payout_wei
        ).build_transaction({
            "from": self.account.address,
            "nonce": nonce,
            "gas": 150000,
            "gasPrice": self.w3.eth.gasPrice,
        })
        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.sendRawTransaction(signed.rawTransaction).hex()

        deduction = (payout_wei * repayment_pct) // 100
        return {
            "deduction_wei": str(deduction),
            "repay_tx": tx_hash,
        }


_loan_service = None


def get_loan_service() -> LoanService:
    global _loan_service
    if _loan_service is None:
        _loan_service = LoanService()
    return _loan_service
