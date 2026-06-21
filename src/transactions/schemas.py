import re
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from src.db.models import Asset, TransactionStatus, TransactionType

_SUI_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{1,64}$")


class TransferRequest(BaseModel):
    """Request to build + sponsor a transfer.

    ``amount`` is in the coin's base units (MIST for SUI; 1e6 base units for USDC).
    """

    recipient: str = Field(..., examples=["0xabc123..."])
    amount: int = Field(..., gt=0, examples=[1000000])

    @field_validator("recipient")
    @classmethod
    def validate_recipient(cls, v: str) -> str:
        if not _SUI_ADDRESS_RE.match(v):
            raise ValueError("recipient must be a valid 0x-prefixed Sui address")
        return v


class SponsoredTransactionResponse(BaseModel):
    """Returned to the client to sign with their zkLogin key."""

    digest: str
    bytes: str
    network: str


class ExecuteTransferRequest(BaseModel):
    digest: str = Field(..., description="Digest from the sponsor step")
    signature: str = Field(..., description="User's zkLogin signature of the transaction bytes")


class ExecuteTransferResponse(BaseModel):
    digest: str


class TransactionResponse(BaseModel):
    uid: uuid.UUID
    tx_type: TransactionType
    asset: Asset
    amount: int
    sender: str
    recipient: str
    status: TransactionStatus
    sui_digest: str | None
    created_at: datetime

    class Config:
        from_attributes = True
