import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from src.db.models import OAuthProvider, Role


class UserResponseModel(BaseModel):
    uid: uuid.UUID
    oauth_provider: OAuthProvider
    email: str | None
    wallet_address: str
    first_name: str | None
    last_name: str | None
    role: Role
    account_restricted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserUpdateModel(BaseModel):
    """Editable user profile fields.

    All fields are optional so the model can be used for partial (PATCH)
    updates. Identity-bound fields (OAuth provider/subject, wallet address,
    role, restriction flags) are intentionally not user-editable.
    """

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = Field(default=None, max_length=255)

    class Config:
        extra = "forbid"
