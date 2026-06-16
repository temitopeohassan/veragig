from pydantic import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    veragig_env: str = "production"
    celo_rpc_url: str = "https://forno.celo.org"
    backend_private_key: str = ""
    anthropic_api_key: str = ""
    database_url: str = ""
    graph_node_url: str = ""
    ipfs_api_url: str = "https://api.0g.ai"
    zero_g_api_key: str = ""
    redis_url: str = "redis://localhost:6379/0"

    # Contract addresses
    escrow_contract: str = "0x0000000000000000000000000000000000000000"
    score_registry: str = "0x0000000000000000000000000000000000000000"
    lending_pool: str = "0x0000000000000000000000000000000000000000"
    fee_router: str = "0x0000000000000000000000000000000000000000"

    # Known contracts
    g_dollar_address: str = "0x62B8B11039fcfE5AB0C56E502b1C372A3D2a9C7A"
    identity_contract: str = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42"
    cfa_forwarder: str = "0xcfA132E353cB4E398080B9700609bb008eceB125"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
