from fastapi import APIRouter, Depends, Query, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from src.audit.service import AuditService
from src.auth.dependencies import AuthContext, enoki_client, get_auth_context
from src.config import settings
from src.db.main import get_session
from src.errors import UserNotFoundError
from src.kyc.dependencies import require_verified_kyc
from src.lending.schemas import (
    ExecuteLendingRequest,
    ExecuteLendingResponse,
    LendingAssetInfo,
    LendingAssetsResponse,
    LendingPositionResponse,
    SponsoredLendingResponse,
    SponsorLendingRequest,
)
from src.lending.service import LendingRecordService, LendingService

router = APIRouter(prefix="/lending", tags=["lending"])

lending_service = LendingService()
lending_record_service = LendingRecordService()
audit_service = AuditService()


@router.get("/assets", response_model=LendingAssetsResponse)
async def list_assets(
    ctx: AuthContext = Depends(get_auth_context),
) -> LendingAssetsResponse:
    return LendingAssetsResponse(
        network=lending_service.network,
        assets=[LendingAssetInfo(**a) for a in lending_service.list_assets()],
    )


@router.post("/sponsor", response_model=SponsoredLendingResponse)
async def sponsor_lending(
    body: SponsorLendingRequest,
    request: Request,
    ctx: AuthContext = Depends(require_verified_kyc),
    session: AsyncSession = Depends(get_session),
) -> SponsoredLendingResponse:
    lending_service.coin_meta(body.asset)

    sponsored = await enoki_client.sponsor_transaction(
        zklogin_jwt=ctx.token,
        transaction_block_kind_bytes=body.tx_bytes,
        allowed_addresses=[ctx.user.wallet_address],
    )
    await lending_record_service.record_pending(
        user_id=ctx.user.uid,
        action=body.action,
        asset=body.asset.upper(),
        amount=body.amount,
        sender=ctx.user.wallet_address,
        digest=sponsored.digest,
        session=session,
    )
    await audit_service.log(
        action="lending.sponsor",
        session=session,
        user_id=ctx.user.uid,
        detail={
            "lending_action": body.action.value,
            "asset": body.asset.upper(),
            "amount": body.amount,
            "digest": sponsored.digest,
        },
        request=request,
    )
    return SponsoredLendingResponse(
        digest=sponsored.digest,
        bytes=sponsored.bytes,
        network=settings.SUI_NETWORK,
        action=body.action,
        asset=body.asset.upper(),
        amount=body.amount,
    )


@router.post("/execute", response_model=ExecuteLendingResponse)
async def execute_lending(
    body: ExecuteLendingRequest,
    request: Request,
    ctx: AuthContext = Depends(require_verified_kyc),
    session: AsyncSession = Depends(get_session),
) -> ExecuteLendingResponse:
    record = await lending_record_service.get_by_digest(
        user_id=ctx.user.uid, digest=body.digest, session=session
    )
    if record is None:
        raise UserNotFoundError("No sponsored lending action found for the given digest.")
    try:
        digest = await enoki_client.execute_transaction(body.digest, body.signature)
    except Exception as exc:
        await lending_record_service.mark_failed(record=record, reason=str(exc), session=session)
        await audit_service.log(
            action="lending.failed",
            session=session,
            user_id=ctx.user.uid,
            detail={"digest": body.digest, "reason": str(exc)},
            request=request,
        )
        raise
    await lending_record_service.mark_executed(record=record, digest=digest, session=session)
    await audit_service.log(
        action="lending.executed",
        session=session,
        user_id=ctx.user.uid,
        detail={"digest": digest},
        request=request,
    )
    return ExecuteLendingResponse(digest=digest)


@router.get("/history", response_model=list[LendingPositionResponse])
async def lending_history(
    ctx: AuthContext = Depends(get_auth_context),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[LendingPositionResponse]:
    records = await lending_record_service.list_for_user(
        user_id=ctx.user.uid, limit=limit, offset=offset, session=session
    )
    return [LendingPositionResponse.model_validate(r) for r in records]
