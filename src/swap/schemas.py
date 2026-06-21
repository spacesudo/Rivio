import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from src.db.models import TransactionStatus


class SwapTokenInfo(BaseModel):
    symbol: str
    type: str
    scalar: int


class SwapTokensResponse(BaseModel):
    network: str
    tokens: list[SwapTokenInfo]


class SponsorSwapRequest(BaseModel):
    """Sponsor a swap whose transaction was built client-side by the aggregator.

    ``tx_bytes`` is the base64 ``onlyTransactionKind`` payload produced by the
    7K SDK (``tx.build({ onlyTransactionKind: true })``). The coin/amount fields
    are metadata used only for history (amounts are in each coin's base units).
    """

    tx_bytes: str = Field(..., description="Base64 onlyTransactionKind bytes from the 7K SDK")
    from_coin: str = Field(..., examples=["SUI"])
    to_coin: str = Field(..., examples=["USDC"])
    amount_in: int = Field(..., gt=0, examples=[1_000_000_000])
    min_out: int = Field(default=0, ge=0, examples=[0])


class SponsoredSwapResponse(BaseModel):
    """Returned to the client to sign with their zkLogin key."""

    digest: str
    bytes: str
    network: str
    from_coin: str
    to_coin: str
    amount_in: int
    min_out: int


class ExecuteSwapRequest(BaseModel):
    digest: str = Field(..., description="Digest from the sponsor step")
    signature: str = Field(..., description="User's zkLogin signature of the transaction bytes")


class ExecuteSwapResponse(BaseModel):
    digest: str


class SwapRecordResponse(BaseModel):
    uid: uuid.UUID
    pool_key: str
    from_coin: str
    to_coin: str
    amount_in: int
    min_out: int
    sender: str
    status: TransactionStatus
    sui_digest: str | None
    created_at: datetime

    class Config:
        from_attributes = True
