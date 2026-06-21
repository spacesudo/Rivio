import asyncio
import logging

import jwt
from jwt import PyJWKClient

from src.config import settings
from src.db.models import OAuthProvider
from src.errors import InvalidTokenError, TokenExpiredError, UnsupportedProviderError

logger = logging.getLogger(__name__)

# OAuth issuer -> provider metadata. Google emits two issuer spellings.
_GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs"
_APPLE_JWKS = "https://appleid.apple.com/auth/keys"

_ISSUERS: dict[str, dict] = {
    "https://accounts.google.com": {"provider": OAuthProvider.GOOGLE, "jwks": _GOOGLE_JWKS},
    "accounts.google.com": {"provider": OAuthProvider.GOOGLE, "jwks": _GOOGLE_JWKS},
    "https://appleid.apple.com": {"provider": OAuthProvider.APPLE, "jwks": _APPLE_JWKS},
}

# Cache one PyJWKClient per JWKS endpoint (it caches keys internally).
_jwk_clients: dict[str, PyJWKClient] = {}


def _audience_for(provider: OAuthProvider) -> str:
    if provider is OAuthProvider.GOOGLE:
        return settings.GOOGLE_CLIENT_ID
    if provider is OAuthProvider.APPLE:
        return settings.APPLE_CLIENT_ID
    raise UnsupportedProviderError(f"No audience configured for provider {provider}")


def _jwk_client(jwks_url: str) -> PyJWKClient:
    client = _jwk_clients.get(jwks_url)
    if client is None:
        client = PyJWKClient(jwks_url)
        _jwk_clients[jwks_url] = client
    return client


def _verify_sync(token: str) -> tuple[OAuthProvider, dict]:
    """Verify an OAuth id_token's signature and standard claims (blocking)."""
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
    except jwt.PyJWTError as exc:
        raise InvalidTokenError("Malformed token") from exc

    issuer = unverified.get("iss")
    meta = _ISSUERS.get(issuer)
    if meta is None:
        raise UnsupportedProviderError(f"Unsupported token issuer: {issuer!r}")

    provider: OAuthProvider = meta["provider"]
    audience = _audience_for(provider)
    if not audience:
        raise UnsupportedProviderError(
            f"{provider.value} client id is not configured on the server"
        )

    try:
        signing_key = _jwk_client(meta["jwks"]).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience=audience,
            issuer=issuer,
            leeway=settings.JWT_LEEWAY_SECONDS,
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError("Token has expired") from exc
    except jwt.PyJWTError as exc:
        logger.warning("OAuth token verification failed: %s", exc)
        raise InvalidTokenError(str(exc)) from exc

    return provider, claims


async def verify_oauth_jwt(token: str) -> tuple[OAuthProvider, dict]:
    """Verify a Google/Apple zkLogin id_token.

    Runs the (blocking) JWKS fetch + signature verification in a worker thread.

    Args:
        token: The raw OAuth id_token (JWT) presented by the client.

    Returns:
        A tuple of the detected ``OAuthProvider`` and the verified claims.

    Raises:
        InvalidTokenError: If the token is malformed or fails verification.
        TokenExpiredError: If the token has expired.
        UnsupportedProviderError: If the issuer/provider is not supported/configured.
    """
    return await asyncio.to_thread(_verify_sync, token)
