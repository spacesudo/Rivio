from __future__ import annotations

LENDABLE: dict[str, list[str]] = {
    "mainnet": ["SUI", "USDC"],
    "testnet": ["SUI", "USDC"],
}

COINS: dict[str, dict[str, dict]] = {
    "mainnet": {
        "SUI": {
            "type": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            "scalar": 1_000_000_000,
        },
        "USDC": {
            "type": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
            "scalar": 1_000_000,
        },
    },
    "testnet": {
        "SUI": {
            "type": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            "scalar": 1_000_000_000,
        },
        "USDC": {
            "type": "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
            "scalar": 1_000_000,
        },
    },
}


def lendable_assets(network: str) -> list[dict]:
    coins = COINS.get(network, {})
    out: list[dict] = []
    for symbol in LENDABLE.get(network, []):
        meta = coins.get(symbol)
        if not meta:
            continue
        out.append({"symbol": symbol, "type": meta["type"], "scalar": meta["scalar"]})
    return out


def get_coin(network: str, symbol: str) -> dict | None:
    return COINS.get(network, {}).get(symbol.upper())
