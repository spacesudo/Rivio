from fastapi import Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.dependencies import AuthContext, get_auth_context
from src.db.main import get_session
from src.errors import KycRequiredError
from src.kyc.service import KycService

kyc_service = KycService()


async def require_verified_kyc(
    ctx: AuthContext = Depends(get_auth_context),
    session: AsyncSession = Depends(get_session),
) -> AuthContext:
    if not await kyc_service.is_verified(ctx.user.uid, session):
        raise KycRequiredError("KYC verification is required for this action.")
    return ctx
