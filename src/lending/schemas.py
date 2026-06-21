import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from src.db.models import LendingAction, TransactionStatus


class LendingAssetInfo(BaseModel):
    symbol: str
    type: str
    scalar: int


class LendingAssetsResponse(BaseModel):
    network: str
    assets: list[LendingAssetInfo]


class SponsorLendingRequest(BaseModel):
    tx_bytes: str = Field(..., description="Base64 onlyTransactionKind bytes from the Navi SDK")
    action: LendingAction = Field(..., examples=["supply"])
    asset: str = Field(..., examples=["USDC"])
    amount: int = Field(..., gt=0, examples=[1_000_000])


class SponsoredLendingResponse(BaseModel):
    digest: str
    bytes: str
    network: str
    action: LendingAction
    asset: str
    amount: int


class ExecuteLendingRequest(BaseModel):
    digest: str = Field(..., description="Digest from the sponsor step")
    signature: str = Field(..., description="User's zkLogin signature of the transaction bytes")


class ExecuteLendingResponse(BaseModel):
    digest: str


class LendingPositionResponse(BaseModel):
    uid: uuid.UUID
    action: LendingAction
    asset: str
    amount: int
    sender: str
    status: TransactionStatus
    sui_digest: str | None
    created_at: datetime

    class Config:
        from_attributes = True
