from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/velo"

    SUI_NETWORK: str = "testnet"
    SUI_RPC_URL: str = ""
    USDC_COIN_TYPE: str = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"

    ENOKI_BASE_URL: str = "https://api.enoki.mystenlabs.com"
    ENOKI_PRIVATE_API_KEY: str = ""
    ENOKI_TIMEOUT_SECONDS: float = 20.0

    GOOGLE_CLIENT_ID: str = ""
    APPLE_CLIENT_ID: str = ""
    JWT_LEEWAY_SECONDS: int = 30
    TRANSACK_API_KEY: str = ""
    TRANSACK_API_SECRET: str = ""
    TRANSACK_REFERRER_DOMAIN: str = "localhost"
    TRANSACK_TIMEOUT_SECONDS: float = 20.0
    TRANSACK_AUTH_BASE_URL: str = ""
    TRANSACK_GATEWAY_BASE_URL: str = ""

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    DEEPBOOK_PACKAGE_ID: str = ""

    SWAP_TREASURY_ADDRESS: str = ""
    SWAP_COMMISSION_BPS: int = 85

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://rivio-fe.vercel.app"]

    @property
    def effective_sui_rpc_url(self) -> str:
        if self.SUI_RPC_URL:
            return self.SUI_RPC_URL
        return f"https://fullnode.{self.SUI_NETWORK}.sui.io:443"

    @property
    def effective_transak_auth_base_url(self) -> str:
        """Base URL for the Transak refresh-token (partner auth) API."""
        if self.TRANSACK_AUTH_BASE_URL:
            return self.TRANSACK_AUTH_BASE_URL
        if self.SUI_NETWORK == "mainnet":
            return "https://api.transak.com/partners/api/v2"
        return "https://api-stg.transak.com/partners/api/v2"

    @property
    def effective_transak_gateway_base_url(self) -> str:
        """Base URL for the Transak widget-session (gateway) API."""
        if self.TRANSACK_GATEWAY_BASE_URL:
            return self.TRANSACK_GATEWAY_BASE_URL
        if self.SUI_NETWORK == "mainnet":
            return "https://api-gateway.transak.com/api/v2"
        return "https://api-gateway-stg.transak.com/api/v2"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
