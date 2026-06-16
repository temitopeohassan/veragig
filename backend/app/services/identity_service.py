from web3 import Web3
from app.config import get_settings

settings = get_settings()

IDENTITY_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "getWhitelistedRoot",
        "outputs": [
            {"internalType": "address", "name": "root", "type": "address"},
            {"internalType": "bool", "name": "isWhitelisted", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
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
    },
]


class IdentityService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.celo_rpc_url))
        self.contract = self.w3.eth.contract(
            address=Web3.toChecksumAddress(settings.identity_contract),
            abi=IDENTITY_ABI,
        )

    async def get_whitelisted_root(self, account: str) -> dict:
        checksum_addr = Web3.toChecksumAddress(account)
        root, is_whitelisted = self.contract.functions.getWhitelistedRoot(checksum_addr).call()
        last_auth = self.contract.functions.lastAuthenticated(checksum_addr).call()
        return {
            "is_whitelisted": is_whitelisted,
            "root": root,
            "last_authenticated_timestamp": last_auth,
        }

    async def get_expiry_data(self, account: str) -> dict:
        checksum_addr = Web3.toChecksumAddress(account)
        last_auth = self.contract.functions.lastAuthenticated(checksum_addr).call()
        auth_period = self.contract.functions.authenticationPeriod().call()
        expires_at = last_auth + (auth_period * 86400)
        import time
        is_expired = time.time() > expires_at
        return {
            "last_authenticated": last_auth,
            "authentication_period_days": auth_period,
            "expires_at": expires_at,
            "is_expired": is_expired,
        }


_identity_service = None


def get_identity_service() -> IdentityService:
    global _identity_service
    if _identity_service is None:
        _identity_service = IdentityService()
    return _identity_service
