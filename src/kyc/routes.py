from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.dependencies import AuthContext, get_auth_context
from src.db.main import get_session
from src.errors import UserNotFoundError
from src.kyc.schemas import KycResponse, KycSubmitRequest
from src.kyc.service import STUB_PROVIDER, KycService

router = APIRouter(prefix="/kyc", tags=["kyc"])

kyc_service = KycService()


@router.get("", response_model=KycResponse)
async def get_kyc(
    ctx: AuthContext = Depends(get_auth_context),
    session: AsyncSession = Depends(get_session),
) -> KycResponse:
    record = await kyc_service.get_by_user_id(ctx.user.uid, session)
    if record is None:
        raise UserNotFoundError("No KYC record found. Submit verification to begin.")
    return KycResponse.model_validate(record)


@router.post("", response_model=KycResponse)
async def submit_kyc(
    body: KycSubmitRequest,
    ctx: AuthContext = Depends(get_auth_context),
    session: AsyncSession = Depends(get_session),
) -> KycResponse:
    record = await kyc_service.submit(
        user_id=ctx.user.uid,
        date_of_birth=body.date_of_birth,
        country=body.country,
        provider=STUB_PROVIDER,
        reference_id=body.reference_id,
        session=session,
    )
    return KycResponse.model_validate(record)
