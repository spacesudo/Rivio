import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import (
    Asset,
    Transaction,
    TransactionStatus,
    TransactionType,
)


class TransactionService:
    async def record_pending(
        self,
        *,
        user_id: uuid.UUID,
        asset: Asset,
        amount: int,
        sender: str,
        recipient: str,
        digest: str,
        session: AsyncSession,
    ) -> Transaction:
        tx = Transaction(
            uid=uuid.uuid4(),
            user_id=user_id,
            tx_type=TransactionType.SEND,
            asset=asset,
            amount=amount,
            sender=sender,
            recipient=recipient,
            status=TransactionStatus.SPONSORED,
            sui_digest=digest,
        )
        session.add(tx)
        await session.commit()
        await session.refresh(tx)
        return tx

    async def get_by_digest(
        self, *, user_id: uuid.UUID, digest: str, session: AsyncSession
    ) -> Transaction | None:
        statement = select(Transaction).where(
            Transaction.user_id == user_id, Transaction.sui_digest == digest
        )
        result = await session.exec(statement)
        return result.first()

    async def mark_executed(
        self, *, tx: Transaction, digest: str, session: AsyncSession
    ) -> Transaction:
        tx.status = TransactionStatus.EXECUTED
        tx.sui_digest = digest
        session.add(tx)
        await session.commit()
        await session.refresh(tx)
        return tx

    async def mark_failed(
        self, *, tx: Transaction, reason: str, session: AsyncSession
    ) -> Transaction:
        tx.status = TransactionStatus.FAILED
        tx.failure_reason = reason
        session.add(tx)
        await session.commit()
        await session.refresh(tx)
        return tx

    async def list_for_user(
        self, *, user_id: uuid.UUID, limit: int, offset: int, session: AsyncSession
    ) -> list[Transaction]:
        statement = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.exec(statement)
        return list(result.all())
