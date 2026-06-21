import asyncio
import logging
import time

import httpx

from src.config import settings
from src.errors import OnrampError

logger = logging.getLogger(__name__)

# Refresh the cached access token this many seconds before it actually expires.
_TOKEN_EXPIRY_MARGIN_SECONDS = 60


class TransakService:
    """Client for the Transak partner on-ramp API.

    Implements the two-step widget flow:
      1. Exchange the partner API key + secret for a short-lived access token
         (valid ~7 days), cached in-memory and refreshed as needed.
      2. Use that access token to create a single-use, 5-minute widget URL that
         the frontend loads to start a buy flow.
    """

    def __init__(self) -> None:
        self._access_token: str | None = None
        self._expires_at: float = 0.0
        self._lock = asyncio.Lock()

    async def _request(self, method: str, url: str, *, headers: dict, json: dict) -> dict:
        try:
            async with httpx.AsyncClient(timeout=settings.TRANSACK_TIMEOUT_SECONDS) as client:
                response = await client.request(method, url, headers=headers, json=json)
        except httpx.HTTPError as exc:
            logger.exception("Transak request error: %s %s", method, url)
            raise OnrampError(f"Transak request failed: {exc}") from exc

        if response.status_code >= 400:
            logger.error("Transak %s %s -> %s: %s", method, url, response.status_code, response.text)
            raise OnrampError(f"Transak returned {response.status_code}")

        return response.json().get("data", {})

    def _token_is_fresh(self) -> bool:
        return bool(self._access_token) and time.time() < self._expires_at - _TOKEN_EXPIRY_MARGIN_SECONDS

    async def _get_access_token(self, *, force_refresh: bool = False) -> str:
        if not force_refresh and self._token_is_fresh():
            return self._access_token  # type: ignore[return-value]

        async with self._lock:
            # Re-check inside the lock in case another coroutine just refreshed.
            if not force_refresh and self._token_is_fresh():
                return self._access_token  # type: ignore[return-value]

            if not settings.TRANSACK_API_KEY or not settings.TRANSACK_API_SECRET:
                raise OnrampError("Transak API credentials are not configured.")

            data = await self._request(
                "POST",
                f"{settings.effective_transak_auth_base_url}/refresh-token",
                headers={
                    "accept": "application/json",
                    "api-secret": settings.TRANSACK_API_SECRET,
                    "Content-Type": "application/json",
                },
                json={"apiKey": settings.TRANSACK_API_KEY},
            )
            token = data.get("accessToken")
            if not token:
                raise OnrampError("Transak did not return an access token.")

            self._access_token = token
            # expiresAt is a Unix timestamp in seconds; fall back to 7 days.
            self._expires_at = float(data.get("expiresAt", time.time() + 7 * 24 * 3600))
            return token

    async def create_widget_url(self, *, widget_params: dict) -> str:
        """Create a single-use Transak widget URL for the given query params.

        ``apiKey`` and ``referrerDomain`` are always injected; caller-supplied
        params (wallet address, fiat amount, etc.) are merged on top.
        """
        params = {
            "apiKey": settings.TRANSACK_API_KEY,
            "referrerDomain": settings.TRANSACK_REFERRER_DOMAIN,
            **{k: v for k, v in widget_params.items() if v is not None},
        }

        token = await self._get_access_token()
        try:
            data = await self._create_session(token, params)
        except OnrampError:
            # The cached token may have been revoked early; refresh once and retry.
            token = await self._get_access_token(force_refresh=True)
            data = await self._create_session(token, params)

        widget_url = data.get("widgetUrl")
        if not widget_url:
            raise OnrampError("Transak did not return a widget URL.")
        return widget_url

    async def _create_session(self, token: str, params: dict) -> dict:
        return await self._request(
            "POST",
            f"{settings.effective_transak_gateway_base_url}/auth/session",
            headers={"access-token": token, "Content-Type": "application/json"},
            json={"widgetParams": params},
        )
