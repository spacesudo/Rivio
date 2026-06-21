from decimal import Decimal

from pydantic import BaseModel


class WalletBalanceResponse(BaseModel):
    """Wallet balances as human-readable decimal amounts.

    ``sui`` and ``usdc`` are the whole-token amounts (e.g. ``1.5`` SUI), not
    base units.
    """

    wallet_address: str
    sui: Decimal
    usdc: Decimal


class AssetBalance(BaseModel):
    """A single asset's balance and USD valuation.

    ``usd_price``/``usd_value`` are ``None`` when no price is available
    (e.g. the price feed is down and nothing is cached).
    """

    symbol: str
    balance: Decimal
    usd_price: Decimal | None
    usd_value: Decimal | None


class WalletAssetsResponse(BaseModel):
    """All wallet assets with their combined USD worth.

    ``total_usd`` sums only the assets that have a price.
    """

    wallet_address: str
    assets: list[AssetBalance]
    total_usd: Decimal
