import logging
import time

import httpx

logger = logging.getLogger(__name__)

COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
COINGECKO_IDS: dict[str, str] = {
    "SUI": "sui",
    "USDC": "usd-coin",
}

_TTL_SECONDS = 60.0
_TIMEOUT_SECONDS = 10.0

_cache: dict[str, tuple[float, float]] = {}


async def get_usd_prices(symbols: list[str]) -> dict[str, float | None]:
    now = time.monotonic()
    out: dict[str, float | None] = {}
    stale: list[str] = []
    for symbol in symbols:
        cached = _cache.get(symbol)
        if cached and now - cached[1] < _TTL_SECONDS:
            out[symbol] = cached[0]
        else:
            stale.append(symbol)

    if stale:
        ids = ",".join(COINGECKO_IDS[s] for s in stale if s in COINGECKO_IDS)
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    COINGECKO_URL, params={"ids": ids, "vs_currencies": "usd"}
                )
                response.raise_for_status()
                data = response.json()
            for symbol in stale:
                price = data.get(COINGECKO_IDS.get(symbol, ""), {}).get("usd")
                if price is not None:
                    _cache[symbol] = (float(price), now)
                    out[symbol] = float(price)
        except httpx.HTTPError as exc:
            logger.warning("Price fetch failed, serving cached/None: %s", exc)

    for symbol in symbols:
        if symbol not in out:
            cached = _cache.get(symbol)
            out[symbol] = cached[0] if cached else None
    return out
