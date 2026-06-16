from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from app.config import get_settings
import httpx

settings = get_settings()

SCORE_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "worker", "type": "address"}],
        "name": "getScore",
        "outputs": [{"internalType": "uint16", "name": "", "type": "uint16"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "worker", "type": "address"}],
        "name": "getLoanTier",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "worker", "type": "address"}],
        "name": "getFullProfile",
        "outputs": [
            {
                "components": [
                    {"internalType": "uint16", "name": "score", "type": "uint16"},
                    {"internalType": "uint32", "name": "lastUpdatedBlock", "type": "uint32"},
                    {"internalType": "uint32", "name": "tasksCompleted", "type": "uint32"},
                    {"internalType": "uint32", "name": "tasksAccepted", "type": "uint32"},
                    {"internalType": "uint32", "name": "disputesLost", "type": "uint32"},
                    {"internalType": "uint32", "name": "loansRepaidOnTime", "type": "uint32"},
                    {"internalType": "uint32", "name": "ubiClaimStreakDays", "type": "uint32"},
                    {"internalType": "uint32", "name": "earningConsistencyWeeks", "type": "uint32"},
                ],
                "internalType": "struct GoodScoreRegistry.WorkerScore",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "worker", "type": "address"},
            {"internalType": "uint16", "name": "newScore", "type": "uint16"},
            {"internalType": "uint32", "name": "tasksCompleted", "type": "uint32"},
            {"internalType": "uint32", "name": "tasksAccepted", "type": "uint32"},
            {"internalType": "uint32", "name": "disputesLost", "type": "uint32"},
            {"internalType": "uint32", "name": "loansRepaidOnTime", "type": "uint32"},
            {"internalType": "uint32", "name": "ubiClaimStreakDays", "type": "uint32"},
            {"internalType": "uint32", "name": "earningConsistencyWeeks", "type": "uint32"},
            {"internalType": "string", "name": "trigger", "type": "string"},
        ],
        "name": "updateScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

# Signal weights per MCP spec
WEIGHTS = {
    "task_completion_rate": 0.30,
    "earnings_consistency": 0.25,
    "dispute_outcome": 0.20,
    "ubi_claim_streak": 0.15,
    "loan_repayment": 0.10,
}


class ScoreService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.celo_rpc_url))
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        self.contract = self.w3.eth.contract(
            address=Web3.toChecksumAddress(settings.score_registry),
            abi=SCORE_REGISTRY_ABI,
        )
        self.account = Account.from_key(settings.backend_private_key) if settings.backend_private_key else None

    def get_score(self, worker_address: str) -> dict:
        addr = Web3.toChecksumAddress(worker_address)
        profile = self.contract.functions.getFullProfile(addr).call()
        score, last_block, tasks_done, tasks_accepted, disputes_lost, loans_repaid, ubi_streak, earn_weeks = profile

        completion_rate = tasks_done / tasks_accepted if tasks_accepted > 0 else 0.0
        tier = self.contract.functions.getLoanTier(addr).call()

        return {
            "good_score": score,
            "loan_tier": tier,
            "signals": {
                "task_completion_rate": round(completion_rate, 4),
                "earnings_consistency_weeks": earn_weeks,
                "disputes_lost": disputes_lost,
                "ubi_claim_streak_days": ubi_streak,
                "loans_repaid_on_time": loans_repaid,
            },
            "last_updated_block": last_block,
        }

    def _compute_score(self, signals: dict) -> int:
        completion_rate = signals.get("task_completion_rate", 0.0)
        earn_weeks = signals.get("earnings_consistency_weeks", 0)
        disputes_lost = signals.get("disputes_lost", 0)
        ubi_streak = signals.get("ubi_claim_streak_days", 0)
        loans_repaid = signals.get("loans_repaid_on_time", 0)

        score = 0.0
        score += WEIGHTS["task_completion_rate"] * min(completion_rate * 850, 850)
        score += WEIGHTS["earnings_consistency"] * min(earn_weeks * 10, 850)
        score += WEIGHTS["dispute_outcome"] * max(0, 850 - disputes_lost * 50)
        score += WEIGHTS["ubi_claim_streak"] * min(ubi_streak * 5, 850)
        score += WEIGHTS["loan_repayment"] * min(loans_repaid * 100, 850)

        return min(int(score), 850)

    async def compute_and_update(self, worker_address: str, trigger_event: str) -> dict:
        # Fetch on-chain signals
        addr = Web3.toChecksumAddress(worker_address)
        profile = self.contract.functions.getFullProfile(addr).call()
        score_old, last_block, tasks_done, tasks_accepted, disputes_lost, loans_repaid, ubi_streak, earn_weeks = profile

        completion_rate = tasks_done / tasks_accepted if tasks_accepted > 0 else 0.0
        signals = {
            "task_completion_rate": completion_rate,
            "earnings_consistency_weeks": earn_weeks,
            "disputes_lost": disputes_lost,
            "ubi_claim_streak_days": ubi_streak,
            "loans_repaid_on_time": loans_repaid,
        }

        new_score = self._compute_score(signals)

        # Submit on-chain
        tx_hash = None
        if self.account and settings.score_registry != "0x" + "0" * 40:
            nonce = self.w3.eth.getTransactionCount(self.account.address)
            tx = self.contract.functions.updateScore(
                addr, new_score, tasks_done, tasks_accepted, disputes_lost,
                loans_repaid, ubi_streak, earn_weeks, trigger_event
            ).build_transaction({
                "from": self.account.address,
                "nonce": nonce,
                "gas": 200000,
                "gasPrice": self.w3.eth.gasPrice,
            })
            signed = self.account.sign_transaction(tx)
            tx_hash = self.w3.eth.sendRawTransaction(signed.rawTransaction).hex()

        return {
            "new_score": new_score,
            "delta": new_score - score_old,
            "update_tx": tx_hash,
            "signals_snapshot": signals,
        }


_score_service = None


def get_score_service() -> ScoreService:
    global _score_service
    if _score_service is None:
        _score_service = ScoreService()
    return _score_service
