import asyncio
from decimal import Decimal

from fastapi import APIRouter, Depends

from src import prices, sui
from src.auth.dependencies import get_current_user
from src.config import settings
from src.db.models import User

from .schemas import AssetBalance, WalletAssetsResponse, WalletBalanceResponse

router = APIRouter(prefix="/wallet", tags=["wallet"])


def _to_decimal(base_units: int, decimals: int) -> Decimal:
    """Convert an integer base-unit amount to a whole-token Decimal."""
    return Decimal(base_units) / (Decimal(10) ** decimals)


@router.get("/balance", response_model=WalletBalanceResponse)
async def get_balance(user: User = Depends(get_current_user)) -> WalletBalanceResponse:
    """Return the authenticated user's SUI and USDC balances.

    Amounts are human-readable whole-token values (e.g. ``1.5`` SUI). If USDC
    is not configured for the current network, its balance is reported as 0
    rather than failing the request.
    """
    sui_balance, usdc_balance = await asyncio.gather(
        sui.get_sui_balance(user.wallet_address),
        sui.get_usdc_balance(user.wallet_address) if settings.USDC_COIN_TYPE else _zero(),
    )
    return WalletBalanceResponse(
        wallet_address=user.wallet_address,
        sui=_to_decimal(sui_balance, sui.SUI_DECIMALS),
        usdc=_to_decimal(usdc_balance, sui.USDC_DECIMALS),
    )


async def _zero() -> int:
    return 0


@router.get("/assets", response_model=WalletAssetsResponse)
async def get_assets(user: User = Depends(get_current_user)) -> WalletAssetsResponse:
    """Return the user's assets with USD valuations and total worth.

    Balances come from Sui RPC; USD prices from CoinGecko (cached ~60s). If a
    price is unavailable the asset's ``usd_value`` is ``None`` and it is
    excluded from ``total_usd``.
    """
    (sui_balance, usdc_balance), usd_prices = await asyncio.gather(
        asyncio.gather(
            sui.get_sui_balance(user.wallet_address),
            sui.get_usdc_balance(user.wallet_address) if settings.USDC_COIN_TYPE else _zero(),
        ),
        prices.get_usd_prices(["SUI", "USDC"]),
    )

    assets: list[AssetBalance] = []
    total = Decimal(0)
    for symbol, base_units, decimals in (
        ("SUI", sui_balance, sui.SUI_DECIMALS),
        ("USDC", usdc_balance, sui.USDC_DECIMALS),
    ):
        balance = _to_decimal(base_units, decimals)
        price_raw = usd_prices.get(symbol)
        price = Decimal(str(price_raw)) if price_raw is not None else None
        value = (balance * price).quantize(Decimal("0.01")) if price is not None else None
        if value is not None:
            total += value
        assets.append(
            AssetBalance(symbol=symbol, balance=balance, usd_price=price, usd_value=value)
        )

    return WalletAssetsResponse(
        wallet_address=user.wallet_address, assets=assets, total_usd=total
    )
