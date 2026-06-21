import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.config import settings
from src.db.models import LendingAction, LendingPosition, TransactionStatus
from src.errors import LendingError
from src.lending.constants import get_coin, lendable_assets


class LendingService:
    def __init__(self, network: str | None = None) -> None:
        self.network = network or settings.SUI_NETWORK

    def list_assets(self) -> list[dict]:
        return lendable_assets(self.network)

    def coin_meta(self, symbol: str) -> dict:
        meta = get_coin(self.network, symbol)
        if not meta:
            raise LendingError(f"Unsupported asset '{symbol}' on {self.network}.")
        return meta


class LendingRecordService:
    async def record_pending(
        self,
        *,
        user_id: uuid.UUID,
        action: LendingAction,
        asset: str,
        amount: int,
        sender: str,
        digest: str,
        session: AsyncSession,
    ) -> LendingPosition:
        record = LendingPosition(
            uid=uuid.uuid4(),
            user_id=user_id,
            action=action,
            asset=asset,
            amount=amount,
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
    ) -> LendingPosition | None:
        statement = select(LendingPosition).where(
            LendingPosition.user_id == user_id, LendingPosition.sui_digest == digest
        )
        result = await session.exec(statement)
        return result.first()

    async def mark_executed(
        self, *, record: LendingPosition, digest: str, session: AsyncSession
    ) -> LendingPosition:
        record.status = TransactionStatus.EXECUTED
        record.sui_digest = digest
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def mark_failed(
        self, *, record: LendingPosition, reason: str, session: AsyncSession
    ) -> LendingPosition:
        record.status = TransactionStatus.FAILED
        record.failure_reason = reason
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def list_for_user(
        self, *, user_id: uuid.UUID, limit: int, offset: int, session: AsyncSession
    ) -> list[LendingPosition]:
        statement = (
            select(LendingPosition)
            .where(LendingPosition.user_id == user_id)
            .order_by(LendingPosition.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.exec(statement)
        return list(result.all())
