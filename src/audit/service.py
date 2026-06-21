import logging
import uuid

from fastapi import Request
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import AuditLog

logger = logging.getLogger(__name__)


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


class AuditService:
    async def log(
        self,
        *,
        action: str,
        session: AsyncSession,
        user_id: uuid.UUID | None = None,
        detail: dict | None = None,
        request: Request | None = None,
    ) -> None:
        entry = AuditLog(
            uid=uuid.uuid4(),
            user_id=user_id,
            action=action,
            detail=detail,
            ip_address=client_ip(request),
        )
        try:
            session.add(entry)
            await session.commit()
        except Exception:
            await session.rollback()
            logger.warning("Failed to write audit log for action=%s", action, exc_info=True)
