from __future__ import annotations

TRADABLE: dict[str, list[str]] = {
    "mainnet": ["SUI", "USDC"],
    "testnet": ["SUI", "USDC"],
}

COINS: dict[str, dict[str, dict]] = {
    "mainnet": {
        "DEEP": {
            "type": "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
            "scalar": 1_000_000,
        },
        "SUI": {
            "type": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            "scalar": 1_000_000_000,
        },
        "USDC": {
            "type": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
            "scalar": 1_000_000,
        },
        "WUSDC": {
            "type": "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
            "scalar": 1_000_000,
        },
        "WETH": {
            "type": "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
            "scalar": 100_000_000,
        },
        "BETH": {
            "type": "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
            "scalar": 100_000_000,
        },
        "WBTC": {
            "type": "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN",
            "scalar": 100_000_000,
        },
        "WUSDT": {
            "type": "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
            "scalar": 1_000_000,
        },
        "NS": {
            "type": "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
            "scalar": 1_000_000,
        },
        "AUSD": {
            "type": "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
            "scalar": 1_000_000,
        },
    },
    "testnet": {
        "DEEP": {
            "type": "0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP",
            "scalar": 1_000_000,
        },
        "SUI": {
            "type": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            "scalar": 1_000_000_000,
        },
        "DBUSDC": {
            "type": "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC",
            "scalar": 1_000_000,
        },
        "DBUSDT": {
            "type": "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDT::DBUSDT",
            "scalar": 1_000_000,
        },
    },
}


def tradable_tokens(network: str) -> list[dict]:
    coins = COINS.get(network, {})
    out: list[dict] = []
    for symbol in TRADABLE.get(network, []):
        meta = coins.get(symbol)
        if not meta:
            continue
        out.append({"symbol": symbol, "type": meta["type"], "scalar": meta["scalar"]})
    return out


def get_coin(network: str, symbol: str) -> dict | None:
    return COINS.get(network, {}).get(symbol.upper())
