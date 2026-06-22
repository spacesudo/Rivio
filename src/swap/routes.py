from fastapi import APIRouter, Depends, Query, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from src.audit.service import AuditService
from src.auth.dependencies import AuthContext, enoki_client, get_auth_context
from src.config import settings
from src.db.main import get_session
from src.db.models import TransactionStatus
from src.errors import UserNotFoundError
from src.kyc.dependencies import require_verified_kyc
from src.swap.schemas import (
    ExecuteSwapRequest,
    ExecuteSwapResponse,
    SponsoredSwapResponse,
    SponsorSwapRequest,
    SwapRecordResponse,
    SwapTokenInfo,
    SwapTokensResponse,
)
from src.swap.service import SwapRecordService, SwapService

router = APIRouter(prefix="/swap", tags=["swap"])

swap_service = SwapService()
swap_record_service = SwapRecordService()
audit_service = AuditService()


@router.get("/tokens", response_model=SwapTokensResponse)
async def list_tokens(
    ctx: AuthContext = Depends(get_auth_context),
) -> SwapTokensResponse:
    return SwapTokensResponse(
        network=swap_service.network,
        tokens=[SwapTokenInfo(**t) for t in swap_service.list_tokens()],
    )


@router.post("/sponsor", response_model=SponsoredSwapResponse)
async def sponsor_swap(
    body: SponsorSwapRequest,
    request: Request,
    ctx: AuthContext = Depends(require_verified_kyc),
    session: AsyncSession = Depends(get_session),
) -> SponsoredSwapResponse:
    swap_service.validate_pair(body.from_coin, body.to_coin)

    sponsored = await enoki_client.sponsor_transaction(
        zklogin_jwt=ctx.token,
        transaction_block_kind_bytes=body.tx_bytes,
        allowed_addresses=[ctx.user.wallet_address],
    )
    await swap_record_service.record_pending(
        user_id=ctx.user.uid,
        from_coin=body.from_coin.upper(),
        to_coin=body.to_coin.upper(),
        amount_in=body.amount_in,
        min_out=body.min_out,
        sender=ctx.user.wallet_address,
        digest=sponsored.digest,
        session=session,
    )
    await audit_service.log(
        action="swap.sponsor",
        session=session,
        user_id=ctx.user.uid,
        detail={
            "from_coin": body.from_coin.upper(),
            "to_coin": body.to_coin.upper(),
            "amount_in": body.amount_in,
            "min_out": body.min_out,
            "digest": sponsored.digest,
        },
        request=request,
    )
    return SponsoredSwapResponse(
        digest=sponsored.digest,
        bytes=sponsored.bytes,
        network=settings.SUI_NETWORK,
        from_coin=body.from_coin.upper(),
        to_coin=body.to_coin.upper(),
        amount_in=body.amount_in,
        min_out=body.min_out,
    )


@router.post("/execute", response_model=ExecuteSwapResponse)
async def execute_swap(
    body: ExecuteSwapRequest,
    request: Request,
    ctx: AuthContext = Depends(require_verified_kyc),
    session: AsyncSession = Depends(get_session),
) -> ExecuteSwapResponse:
    record = await swap_record_service.get_by_digest(
        user_id=ctx.user.uid, digest=body.digest, session=session
    )
    if record is None:
        raise UserNotFoundError("No sponsored swap found for the given digest.")
    if record.status == TransactionStatus.EXECUTED:
        return ExecuteSwapResponse(digest=record.sui_digest or body.digest)
    try:
        digest = await enoki_client.execute_transaction(body.digest, body.signature)
    except Exception as exc:
        await swap_record_service.mark_failed(record=record, reason=str(exc), session=session)
        await audit_service.log(
            action="swap.failed",
            session=session,
            user_id=ctx.user.uid,
            detail={"digest": body.digest, "reason": str(exc)},
            request=request,
        )
        raise
    await swap_record_service.mark_executed(record=record, digest=digest, session=session)
    await audit_service.log(
        action="swap.executed",
        session=session,
        user_id=ctx.user.uid,
        detail={"digest": digest},
        request=request,
    )
    return ExecuteSwapResponse(digest=digest)


@router.get("/history", response_model=list[SwapRecordResponse])
async def swap_history(
    ctx: AuthContext = Depends(get_auth_context),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[SwapRecordResponse]:
    records = await swap_record_service.list_for_user(
        user_id=ctx.user.uid, limit=limit, offset=offset, session=session
    )
    return [SwapRecordResponse.model_validate(r) for r in records]
