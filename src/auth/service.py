import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import OAuthProvider, User
from src.errors import UserUpdateError


class UserService:
    """User service for zkLogin identity persistence."""

    async def get_user_by_identity(
        self, provider: OAuthProvider, subject: str, session: AsyncSession
    ) -> User | None:
        """Get a user by their (provider, subject) OAuth identity."""
        statement = select(User).where(
            User.oauth_provider == provider, User.oauth_subject == subject
        )
        result = await session.exec(statement)
        return result.first()

    async def get_user_by_id(self, user_id: uuid.UUID, session: AsyncSession) -> User | None:
        """Get a user by primary key."""
        statement = select(User).where(User.uid == user_id)
        result = await session.exec(statement)
        return result.first()

    async def get_user_by_email(self, email: str, session: AsyncSession) -> User | None:
        """Get a user by email address."""
        statement = select(User).where(User.email == email)
        result = await session.exec(statement)
        return result.first()

    async def get_or_create_user(
        self,
        *,
        provider: OAuthProvider,
        claims: dict,
        wallet_address: str,
        session: AsyncSession,
    ) -> tuple[User, bool]:
        """Get an existing zkLogin user or create one from verified claims.

        This is the backend equivalent of "login or signup": the first time we
        see a verified identity we persist it together with its zkLogin Sui
        address. Returns ``(user, created)``.

        Args:
            provider: The verified OAuth provider.
            claims: The verified id_token claims (must include ``sub``).
            wallet_address: The user's zkLogin Sui address (from Enoki).
            session: The database session.
        """
        subject = claims["sub"]
        user = await self.get_user_by_identity(provider, subject, session)
        if user is not None:
            # Keep email/address/name fresh in case they changed or were missing.
            updated = False
            email = claims.get("email")
            if email and user.email != email:
                user.email = email
                updated = True
            if wallet_address and user.wallet_address != wallet_address:
                user.wallet_address = wallet_address
                updated = True
            given = claims.get("given_name")
            family = claims.get("family_name")
            if given and not user.first_name:
                user.first_name = given
                updated = True
            if family and not user.last_name:
                user.last_name = family
                updated = True
            if updated:
                await session.commit()
                await session.refresh(user)
            return user, False

        user = User(
            uid=uuid.uuid4(),
            oauth_provider=provider,
            oauth_subject=subject,
            email=claims.get("email"),
            first_name=claims.get("given_name"),
            last_name=claims.get("family_name"),
            wallet_address=wallet_address,
        )
        session.add(user)
        try:
            await session.commit()
        except IntegrityError:
            # A concurrent request created the same identity first
            # (e.g. parallel /auth/me + /kyc on first login). Fall back
            # to the now-existing row instead of failing with a 500.
            await session.rollback()
            existing = await self.get_user_by_identity(provider, subject, session)
            if existing is not None:
                return existing, False
            raise
        await session.refresh(user)
        return user, True

    async def update_user(self, user: User, user_data: dict, session: AsyncSession) -> User:
        """
        Update a user with the provided data.

        Args:
            user: The user to update.
            user_data: The data to update the user with.
            session: The database session.
        """
        try:
            for key, value in user_data.items():
                setattr(user, key, value)
            await session.commit()
            await session.refresh(user)
            return user
        except Exception as e:
            await session.rollback()
            raise UserUpdateError() from e
