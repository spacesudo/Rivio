from dataclasses import dataclass

from fastapi import Depends, Request
from fastapi.security import HTTPBearer
from sqlmodel.ext.asyncio.session import AsyncSession

from src.audit.service import AuditService
from src.db.main import get_session
from src.db.models import OAuthProvider, User
from src.enoki import EnokiClient
from src.errors import AccountRestrictedError, UserNotAuthenticatedError

from .service import UserService
from .utils import verify_oauth_jwt

user_service = UserService()
enoki_client = EnokiClient()
audit_service = AuditService()

_bearer = HTTPBearer(auto_error=False)


@dataclass(slots=True)
class AuthContext:
    user: User
    token: str
    provider: OAuthProvider
    claims: dict


async def get_access_token(request: Request) -> str:
    creds = await _bearer(request)
    if creds is None or not creds.credentials:
        raise UserNotAuthenticatedError("Missing bearer token")
    return creds.credentials


async def get_auth_context(
    request: Request,
    token: str = Depends(get_access_token),
    session: AsyncSession = Depends(get_session),
) -> AuthContext:
    provider, claims = await verify_oauth_jwt(token)
    user = await user_service.get_user_by_identity(provider, claims["sub"], session)
    if user is None:
        zklogin = await enoki_client.get_zklogin_info(token)
        user, created = await user_service.get_or_create_user(
            provider=provider,
            claims=claims,
            wallet_address=zklogin.address,
            session=session,
        )
        if created:
            await audit_service.log(
                action="auth.signup",
                session=session,
                user_id=user.uid,
                detail={"provider": provider.value},
                request=request,
            )

    if user.account_restricted:
        raise AccountRestrictedError()

    return AuthContext(user=user, token=token, provider=provider, claims=claims)


async def get_current_user(ctx: AuthContext = Depends(get_auth_context)) -> User:
    return ctx.user
