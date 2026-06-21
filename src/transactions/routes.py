from fastapi import APIRouter, Depends, Query, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from src import sui
from src.audit.service import AuditService
from src.auth.dependencies import AuthContext, enoki_client, get_auth_context
from src.config import settings
from src.db.main import get_session
from src.db.models import Asset
from src.errors import UserNotFoundError
from src.kyc.dependencies import require_verified_kyc
from src.transactions.schemas import (
    ExecuteTransferRequest,
    ExecuteTransferResponse,
    SponsoredTransactionResponse,
    TransactionResponse,
    TransferRequest,
)
from src.transactions.service import TransactionService

router = APIRouter(prefix="/transfers", tags=["transfers"])

transaction_service = TransactionService()
audit_service = AuditService()


async def _sponsor_and_record(
    *,
    kind_bytes: str,
    asset: Asset,
    body: TransferRequest,
    ctx: AuthContext,
    session: AsyncSession,
    request: Request,
) -> SponsoredTransactionResponse:
    sponsored = await enoki_client.sponsor_transaction(
        zklogin_jwt=ctx.token,
        transaction_block_kind_bytes=kind_bytes,
        allowed_addresses=[body.recipient, ctx.user.wallet_address],
    )
    await transaction_service.record_pending(
        user_id=ctx.user.uid,
        asset=asset,
        amount=body.amount,
        sender=ctx.user.wallet_address,
        recipient=body.recipient,
        digest=sponsored.digest,
        session=session,
    )
    await audit_service.log(
        action="transfer.sponsor",
        session=session,
        user_id=ctx.user.uid,
        detail={
            "asset": asset.value,
            "amount": body.amount,
            "recipient": body.recipient,
            "digest": sponsored.digest,
        },
        request=request,
    )
    return SponsoredTransactionResponse(
        digest=sponsored.digest, bytes=sponsored.bytes, network=settings.SUI_NETWORK
    )


@router.post("/sui", response_model=SponsoredTransactionResponse)
async def build_sui_transfer(
    body: TransferRequest,
    request: Request,
    ctx: AuthContext = Depends(require_verified_kyc),
    session: AsyncSession = Depends(get_session),
) -> SponsoredTransactionResponse:
    kind_bytes = await sui.build_sui_transfer(
        sender=ctx.user.wallet_address, recipient=body.recipient, amount=body.amount
    )
    return await _sponsor_and_record(
        kind_bytes=kind_bytes, asset=Asset.SUI, body=body, ctx=ctx, session=session, request=request
    )


@router.post("/usdc", response_model=SponsoredTransactionResponse)
async def build_usdc_transfer(
    body: TransferRequest,
    request: Request,
    ctx: AuthContext = Depends(require_verified_kyc),
    session: AsyncSession = Depends(get_session),
) -> SponsoredTransactionResponse:
    kind_bytes = await sui.build_usdc_transfer(
        sender=ctx.user.wallet_address, recipient=body.recipient, amount=body.amount
    )
    return await _sponsor_and_record(
        kind_bytes=kind_bytes,
        asset=Asset.USDC,
        body=body,
        ctx=ctx,
        session=session,
        request=request,
    )


@router.post("/execute", response_model=ExecuteTransferResponse)
async def execute_transfer(
    body: ExecuteTransferRequest,
    request: Request,
    ctx: AuthContext = Depends(require_verified_kyc),
    session: AsyncSession = Depends(get_session),
) -> ExecuteTransferResponse:
    tx = await transaction_service.get_by_digest(
        user_id=ctx.user.uid, digest=body.digest, session=session
    )
    if tx is None:
        raise UserNotFoundError("No sponsored transaction found for the given digest.")
    try:
        digest = await enoki_client.execute_transaction(body.digest, body.signature)
    except Exception as exc:
        await transaction_service.mark_failed(tx=tx, reason=str(exc), session=session)
        await audit_service.log(
            action="transfer.failed",
            session=session,
            user_id=ctx.user.uid,
            detail={"digest": body.digest, "reason": str(exc)},
            request=request,
        )
        raise
    await transaction_service.mark_executed(tx=tx, digest=digest, session=session)
    await audit_service.log(
        action="transfer.executed",
        session=session,
        user_id=ctx.user.uid,
        detail={"digest": digest},
        request=request,
    )
    return ExecuteTransferResponse(digest=digest)


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    ctx: AuthContext = Depends(get_auth_context),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[TransactionResponse]:
    txs = await transaction_service.list_for_user(
        user_id=ctx.user.uid, limit=limit, offset=offset, session=session
    )
    return [TransactionResponse.model_validate(tx) for tx in txs]
