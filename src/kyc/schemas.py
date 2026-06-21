import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from src.db.models import KycStatus


class KycSubmitRequest(BaseModel):
    date_of_birth: date | None = None
    country: str | None = Field(default=None, min_length=2, max_length=2)
    reference_id: str | None = None


class KycResponse(BaseModel):
    uid: uuid.UUID
    status: KycStatus
    provider: str | None
    country: str | None
    risk_level: str | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
