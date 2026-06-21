import asyncio
from decimal import Decimal

from openai import AsyncOpenAI

from src import sui
from src.config import settings
from src.db.models import User

from .schemas import ChatMessage

_SYSTEM_TEMPLATE = """\
You are Rivio AI, a helpful and concise financial assistant embedded in the Rivio crypto wallet app.
Rivio is built on the Sui blockchain and supports SUI and USDC.

User context:
- Name: {name}
- Wallet address: {wallet_address}
- SUI balance: {sui_balance} SUI
- USDC balance: {usdc_balance} USDC

You can help the user with:
- Checking and explaining their balances
- Sending SUI or USDC to another address
- Swapping between SUI and USDC
- Borrowing/lending via Navi Protocol
- General Sui blockchain and DeFi questions

Keep replies short and clear — this is a mobile chat interface.
Never reveal private keys or seed phrases. Never make up wallet addresses or transaction hashes.
If you don't know something, say so honestly.
"""


def _to_decimal(base_units: int, decimals: int) -> Decimal:
    return Decimal(base_units) / (Decimal(10) ** decimals)


class AiService:
    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def chat(self, user: User, messages: list[ChatMessage]) -> str:
        sui_balance_units, usdc_balance_units = await asyncio.gather(
            sui.get_sui_balance(user.wallet_address),
            sui.get_usdc_balance(user.wallet_address) if settings.USDC_COIN_TYPE else _zero(),
        )

        name = " ".join(filter(None, [user.first_name, user.last_name])) or user.email or "there"
        system_prompt = _SYSTEM_TEMPLATE.format(
            name=name,
            wallet_address=user.wallet_address,
            sui_balance=_to_decimal(sui_balance_units, sui.SUI_DECIMALS),
            usdc_balance=_to_decimal(usdc_balance_units, sui.USDC_DECIMALS),
        )

        openai_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            role = "assistant" if msg.role == "ai" else "user"
            openai_messages.append({"role": role, "content": msg.content})

        response = await self._client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=openai_messages,
            max_tokens=512,
            temperature=0.7,
        )

        return response.choices[0].message.content or ""


async def _zero() -> int:
    return 0
