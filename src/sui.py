import base64
import logging

import httpx

from src.config import settings
from src.errors import SuiBuildError

logger = logging.getLogger(__name__)

SUI_COIN_TYPE = "0x2::sui::SUI"

SUI_DECIMALS = 9
USDC_DECIMALS = 6


async def get_coins(owner: str, coin_type: str) -> list[dict]:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "suix_getCoins",
        "params": [owner, coin_type, None, 50],
    }
    try:
        async with httpx.AsyncClient(timeout=settings.ENOKI_TIMEOUT_SECONDS) as client:
            response = await client.post(settings.effective_sui_rpc_url, json=payload)
            response.raise_for_status()
            body = response.json()
    except httpx.HTTPError as exc:
        raise SuiBuildError(f"Failed to query coins from Sui RPC: {exc}") from exc

    if "error" in body:
        raise SuiBuildError(f"Sui RPC error: {body['error']}")

    coins = body.get("result", {}).get("data", [])
    coins.sort(key=lambda c: int(c.get("balance", 0)), reverse=True)
    return coins


async def get_balance(owner: str, coin_type: str) -> int:
    """Return the total balance (in base units) for ``owner`` and ``coin_type``."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "suix_getBalance",
        "params": [owner, coin_type],
    }
    try:
        async with httpx.AsyncClient(timeout=settings.ENOKI_TIMEOUT_SECONDS) as client:
            response = await client.post(settings.effective_sui_rpc_url, json=payload)
            response.raise_for_status()
            body = response.json()
    except httpx.HTTPError as exc:
        raise SuiBuildError(f"Failed to query balance from Sui RPC: {exc}") from exc

    if "error" in body:
        raise SuiBuildError(f"Sui RPC error: {body['error']}")

    return int(body.get("result", {}).get("totalBalance", 0))


async def get_sui_balance(owner: str) -> int:
    """Return the total SUI balance (in MIST) for ``owner``."""
    return await get_balance(owner, SUI_COIN_TYPE)


async def get_usdc_balance(owner: str) -> int:
    """Return the total USDC balance (in 1e6 base units) for ``owner``."""
    if not settings.USDC_COIN_TYPE:
        raise SuiBuildError("USDC_COIN_TYPE is not configured for this network.")
    return await get_balance(owner, settings.USDC_COIN_TYPE)


def _coin_input(coin: dict):
    from pysui.sui.sui_bcs import bcs

    coin_id = coin["coinObjectId"]
    objref = bcs.ObjectReference(
        bcs.Address.from_str(coin_id),
        int(coin["version"]),
        bcs.Digest.from_str(coin["digest"]),
    )
    key = bcs.BuilderArg("Object", bcs.Address.from_str(coin_id))
    return key, bcs.ObjectArg("ImmOrOwnedObject", objref)


def _build_transfer_kind_bytes(coins: list[dict], recipient: str, amount: int) -> str:
    from pysui.sui.sui_bcs import bcs
    from pysui.sui.sui_txn.transaction_builder import ProgrammableTransactionBuilder, PureInput
    from pysui.sui.sui_types.scalars import SuiU64

    builder = ProgrammableTransactionBuilder(compress_inputs=True)
    primary = _coin_input(coins[0])

    if int(coins[0]["balance"]) < amount and len(coins) > 1:
        builder.merge_coins(to_coin=primary, from_coins=[_coin_input(c) for c in coins[1:]])

    split_result = builder.split_coin(
        from_coin=primary, amounts=[PureInput.as_input(SuiU64(amount))]
    )
    builder.transfer_objects(
        recipient=PureInput.as_input(bcs.Address.from_str(recipient)),
        object_ref=[split_result],
    )
    kind = builder.finish_for_inspect()
    return base64.b64encode(kind.serialize()).decode()


async def build_transfer_kind_bytes(
    *, sender: str, recipient: str, amount: int, coin_type: str
) -> str:
    if amount <= 0:
        raise SuiBuildError("Transfer amount must be positive.")
    label = "SUI" if coin_type == SUI_COIN_TYPE else coin_type
    coins = await get_coins(sender, coin_type)
    if not coins:
        raise SuiBuildError(f"No {label} coins found for sender.")
    total = sum(int(c.get("balance", 0)) for c in coins)
    if total < amount:
        raise SuiBuildError(f"Insufficient {label} balance: have {total}, need {amount}.")
    try:
        return _build_transfer_kind_bytes(coins, recipient, amount)
    except SuiBuildError:
        raise
    except Exception as exc:
        logger.exception("Failed to build transfer transaction")
        raise SuiBuildError(f"Failed to build transaction: {exc}") from exc


async def build_sui_transfer(*, sender: str, recipient: str, amount: int) -> str:
    return await build_transfer_kind_bytes(
        sender=sender, recipient=recipient, amount=amount, coin_type=SUI_COIN_TYPE
    )


async def build_usdc_transfer(*, sender: str, recipient: str, amount: int) -> str:
    if not settings.USDC_COIN_TYPE:
        raise SuiBuildError("USDC_COIN_TYPE is not configured for this network.")
    return await build_transfer_kind_bytes(
        sender=sender, recipient=recipient, amount=amount, coin_type=settings.USDC_COIN_TYPE
    )
