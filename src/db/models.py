import uuid
from datetime import date, datetime
from enum import Enum

import sqlalchemy.dialects.postgresql as pg
from sqlalchemy import BigInteger, ForeignKey, UniqueConstraint, func
from sqlmodel import Column, Field, Index, SQLModel


class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"


class OAuthProvider(str, Enum):
    GOOGLE = "google"
    APPLE = "apple"


class Asset(str, Enum):
    SUI = "sui"
    USDC = "usdc"


class TransactionType(str, Enum):
    SEND = "send"
    RECEIVE = "receive"
    DEPOSIT = "deposit"
    WITHDRAW = "withdraw"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    SPONSORED = "sponsored"
    EXECUTED = "executed"
    FAILED = "failed"


class KycStatus(str, Enum):
    NONE = "none"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class LendingAction(str, Enum):
    SUPPLY = "supply"
    WITHDRAW = "withdraw"
    BORROW = "borrow"
    REPAY = "repay"


class User(SQLModel, table=True):
    """A zkLogin user identity.

    Authentication is delegated to an OAuth provider (Google/Apple) via Enoki
    zkLogin on the frontend; the backend only verifies the resulting id_token.
    The Sui address is the user's zkLogin address (resolved via Enoki) and keys
    are self-custodial — the backend never holds them.
    """

    __tablename__ = "users"
    uid: uuid.UUID = Field(
        sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4)
    )
    # OAuth identity: (provider, subject) is globally unique.
    oauth_provider: OAuthProvider = Field(sa_column=Column(pg.VARCHAR(20), nullable=False))
    oauth_subject: str = Field(sa_column=Column(pg.VARCHAR(255), nullable=False))
    email: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(255), nullable=True))
    # zkLogin Sui address (self-custodial; resolved via Enoki).
    wallet_address: str = Field(sa_column=Column(pg.VARCHAR(255), nullable=False, unique=True))
    first_name: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(100), nullable=True))
    last_name: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(100), nullable=True))
    role: Role = Field(
        default=Role.USER,
        sa_column=Column(pg.VARCHAR(20), nullable=False, server_default=Role.USER.value),
    )
    account_restricted: bool = Field(
        default=False, sa_column=Column(pg.BOOLEAN, nullable=False, server_default="FALSE")
    )
    created_at: datetime = Field(
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            pg.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        )
    )

    __table_args__ = (
        UniqueConstraint("oauth_provider", "oauth_subject", name="uq_users_oauth_identity"),
        Index("ix_users_email", "email"),
        Index("ix_users_wallet_address", "wallet_address"),
    )


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"
    uid: uuid.UUID = Field(
        sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4)
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    )
    tx_type: TransactionType = Field(sa_column=Column(pg.VARCHAR(20), nullable=False))
    asset: Asset = Field(sa_column=Column(pg.VARCHAR(20), nullable=False))
    amount: int = Field(sa_column=Column(BigInteger, nullable=False))
    sender: str = Field(sa_column=Column(pg.VARCHAR(255), nullable=False))
    recipient: str = Field(sa_column=Column(pg.VARCHAR(255), nullable=False))
    status: TransactionStatus = Field(
        sa_column=Column(
            pg.VARCHAR(20), nullable=False, server_default=TransactionStatus.PENDING.value
        )
    )
    sui_digest: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(255), nullable=True))
    failure_reason: str | None = Field(default=None, sa_column=Column(pg.TEXT, nullable=True))
    created_at: datetime = Field(
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            pg.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        )
    )

    __table_args__ = (
        Index("ix_transactions_user_id", "user_id"),
        Index("ix_transactions_sui_digest", "sui_digest"),
    )


class SwapRecord(SQLModel, table=True):
    """A DeepBook swap initiated by a user.

    Unlike :class:`Transaction` (a single-asset send/receive), a swap involves
    an input and output coin, so it has its own table. Status reuses
    :class:`TransactionStatus` (SPONSORED -> EXECUTED/FAILED).
    """

    __tablename__ = "swap_records"
    uid: uuid.UUID = Field(
        sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4)
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    )
    pool_key: str = Field(sa_column=Column(pg.VARCHAR(50), nullable=False))
    from_coin: str = Field(sa_column=Column(pg.VARCHAR(20), nullable=False))
    to_coin: str = Field(sa_column=Column(pg.VARCHAR(20), nullable=False))
    amount_in: int = Field(sa_column=Column(BigInteger, nullable=False))
    min_out: int = Field(sa_column=Column(BigInteger, nullable=False, server_default="0"))
    sender: str = Field(sa_column=Column(pg.VARCHAR(255), nullable=False))
    status: TransactionStatus = Field(
        sa_column=Column(
            pg.VARCHAR(20), nullable=False, server_default=TransactionStatus.PENDING.value
        )
    )
    sui_digest: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(255), nullable=True))
    failure_reason: str | None = Field(default=None, sa_column=Column(pg.TEXT, nullable=True))
    created_at: datetime = Field(
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            pg.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        )
    )

    __table_args__ = (
        Index("ix_swap_records_user_id", "user_id"),
        Index("ix_swap_records_sui_digest", "sui_digest"),
    )


class LendingPosition(SQLModel, table=True):
    __tablename__ = "lending_positions"
    uid: uuid.UUID = Field(
        sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4)
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False)
    )
    action: LendingAction = Field(sa_column=Column(pg.VARCHAR(20), nullable=False))
    asset: str = Field(sa_column=Column(pg.VARCHAR(20), nullable=False))
    amount: int = Field(sa_column=Column(BigInteger, nullable=False))
    sender: str = Field(sa_column=Column(pg.VARCHAR(255), nullable=False))
    status: TransactionStatus = Field(
        sa_column=Column(
            pg.VARCHAR(20), nullable=False, server_default=TransactionStatus.PENDING.value
        )
    )
    sui_digest: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(255), nullable=True))
    failure_reason: str | None = Field(default=None, sa_column=Column(pg.TEXT, nullable=True))
    created_at: datetime = Field(
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            pg.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        )
    )

    __table_args__ = (
        Index("ix_lending_positions_user_id", "user_id"),
        Index("ix_lending_positions_sui_digest", "sui_digest"),
    )


class KycRecord(SQLModel, table=True):
    __tablename__ = "kyc_records"
    uid: uuid.UUID = Field(
        sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4)
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False, unique=True
        )
    )
    status: KycStatus = Field(
        sa_column=Column(pg.VARCHAR(20), nullable=False, server_default=KycStatus.NONE.value)
    )
    provider: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(50), nullable=True))
    reference_id: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(255), nullable=True))
    date_of_birth: date | None = Field(default=None, sa_column=Column(pg.DATE, nullable=True))
    country: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(2), nullable=True))
    risk_level: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(20), nullable=True))
    reviewed_at: datetime | None = Field(
        default=None, sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=True)
    )
    created_at: datetime = Field(
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            pg.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        )
    )


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"
    uid: uuid.UUID = Field(
        sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4)
    )
    user_id: uuid.UUID | None = Field(
        default=None,
        sa_column=Column(pg.UUID, ForeignKey("users.uid", ondelete="SET NULL"), nullable=True),
    )
    action: str = Field(sa_column=Column(pg.VARCHAR(100), nullable=False))
    detail: dict | None = Field(default=None, sa_column=Column(pg.JSONB, nullable=True))
    ip_address: str | None = Field(default=None, sa_column=Column(pg.VARCHAR(64), nullable=True))
    created_at: datetime = Field(
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    )

    __table_args__ = (Index("ix_audit_logs_user_id", "user_id"),)
