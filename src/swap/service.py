import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.config import settings
from src.db.models import SwapRecord, TransactionStatus
from src.errors import SwapError
from src.swap.constants import get_coin, tradable_tokens


class SwapService:

    def __init__(self, network: str | None = None) -> None:
        self.network = network or settings.SUI_NETWORK

    def list_tokens(self) -> list[dict]:
        return tradable_tokens(self.network)

    def coin_meta(self, symbol: str) -> dict:
        meta = get_coin(self.network, symbol)
        if not meta:
            raise SwapError(f"Unsupported coin '{symbol}' on {self.network}.")
        return meta

    def validate_pair(self, from_coin: str, to_coin: str) -> tuple[dict, dict]:
        if from_coin.upper() == to_coin.upper():
            raise SwapError("from_coin and to_coin must be different.")
        return self.coin_meta(from_coin), self.coin_meta(to_coin)


class SwapRecordService:

    async def record_pending(
        self,
        *,
        user_id: uuid.UUID,
        from_coin: str,
        to_coin: str,
        amount_in: int,
        min_out: int,
        sender: str,
        digest: str,
        session: AsyncSession,
    ) -> SwapRecord:
        record = SwapRecord(
            uid=uuid.uuid4(),
            user_id=user_id,
            pool_key="7k-aggregator",
            from_coin=from_coin,
            to_coin=to_coin,
            amount_in=amount_in,
            min_out=min_out,
            sender=sender,
            status=TransactionStatus.SPONSORED,
            sui_digest=digest,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def get_by_digest(
        self, *, user_id: uuid.UUID, digest: str, session: AsyncSession
    ) -> SwapRecord | None:
        statement = select(SwapRecord).where(
            SwapRecord.user_id == user_id, SwapRecord.sui_digest == digest
        )
        result = await session.exec(statement)
        return result.first()

    async def mark_executed(
        self, *, record: SwapRecord, digest: str, session: AsyncSession
    ) -> SwapRecord:
        record.status = TransactionStatus.EXECUTED
        record.sui_digest = digest
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def mark_failed(
        self, *, record: SwapRecord, reason: str, session: AsyncSession
    ) -> SwapRecord:
        record.status = TransactionStatus.FAILED
        record.failure_reason = reason
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def list_for_user(
        self, *, user_id: uuid.UUID, limit: int, offset: int, session: AsyncSession
    ) -> list[SwapRecord]:
        statement = (
            select(SwapRecord)
            .where(SwapRecord.user_id == user_id)
            .order_by(SwapRecord.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.exec(statement)
        return list(result.all())
