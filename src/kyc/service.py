import uuid
from datetime import UTC, date, datetime

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import KycRecord, KycStatus

STUB_PROVIDER = "stub"


class KycService:
    async def get_by_user_id(self, user_id: uuid.UUID, session: AsyncSession) -> KycRecord | None:
        statement = select(KycRecord).where(KycRecord.user_id == user_id)
        result = await session.exec(statement)
        return result.first()

    async def is_verified(self, user_id: uuid.UUID, session: AsyncSession) -> bool:
        record = await self.get_by_user_id(user_id, session)
        return record is not None and record.status == KycStatus.VERIFIED

    async def submit(
        self,
        *,
        user_id: uuid.UUID,
        date_of_birth: date | None,
        country: str | None,
        provider: str,
        reference_id: str | None,
        session: AsyncSession,
    ) -> KycRecord:
        record = await self.get_by_user_id(user_id, session)
        if record is None:
            record = KycRecord(uid=uuid.uuid4(), user_id=user_id)

        record.provider = provider
        record.reference_id = reference_id
        record.date_of_birth = date_of_birth
        record.country = country
        record.status = KycStatus.PENDING

        status, risk_level = self._run_stub_screening(record)
        record.status = status
        record.risk_level = risk_level
        if status in (KycStatus.VERIFIED, KycStatus.REJECTED):
            record.reviewed_at = datetime.now(UTC)

        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def set_status(
        self,
        *,
        record: KycRecord,
        status: KycStatus,
        risk_level: str | None,
        session: AsyncSession,
    ) -> KycRecord:
        record.status = status
        if risk_level is not None:
            record.risk_level = risk_level
        if status in (KycStatus.VERIFIED, KycStatus.REJECTED):
            record.reviewed_at = datetime.now(UTC)
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    def _run_stub_screening(self, record: KycRecord) -> tuple[KycStatus, str]:
        return KycStatus.VERIFIED, "low"
