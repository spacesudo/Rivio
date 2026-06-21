import logging
from dataclasses import dataclass

import httpx

from src.config import settings
from src.errors import EnokiError, InvalidTokenError, TokenExpiredError

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ZkLoginInfo:
    address: str
    salt: str
    public_key: str | None = None


@dataclass(slots=True)
class SponsoredTransaction:
    digest: str
    bytes: str


class EnokiClient:
    """Async client for the Enoki (Mysten Labs) HTTP API.

    Uses a private API key as a bearer token for server-side calls.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        network: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.api_key = api_key or settings.ENOKI_PRIVATE_API_KEY
        self.base_url = (base_url or settings.ENOKI_BASE_URL).rstrip("/")
        self.network = network or settings.SUI_NETWORK
        self.timeout = timeout or settings.ENOKI_TIMEOUT_SECONDS

    def _headers(self, zklogin_jwt: str | None = None) -> dict[str, str]:
        if not self.api_key:
            raise EnokiError("Enoki API key is not configured (ENOKI_PRIVATE_API_KEY).")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if zklogin_jwt:
            headers["zklogin-jwt"] = zklogin_jwt
        return headers

    async def _request(self, method: str, path: str, *, headers: dict, json: dict | None = None):
        url = f"{self.base_url}/v1{path}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(method, url, headers=headers, json=json)
        except httpx.HTTPError as exc:
            logger.exception("Enoki request error: %s %s", method, path)
            raise EnokiError(f"Enoki request failed: {exc}") from exc

        if response.status_code >= 400:
            logger.error("Enoki %s %s -> %s: %s", method, path, response.status_code, response.text)
            # When we forwarded a user's zkLogin id_token, a 401/403 from Enoki
            # is an auth failure on that token (expired/invalid), not a gateway
            # error. Surface it as a 401 so the client knows to re-authenticate.
            if response.status_code in (401, 403) and "zklogin-jwt" in headers:
                if "expired" in response.text.lower():
                    raise TokenExpiredError("zkLogin id_token has expired")
                raise InvalidTokenError("Enoki rejected the zkLogin id_token")
            raise EnokiError(f"Enoki returned {response.status_code}: {response.text}")

        return response.json().get("data", {})

    async def get_zklogin_info(self, zklogin_jwt: str) -> ZkLoginInfo:
        """Resolve a user's zkLogin Sui address from their OAuth id_token."""
        data = await self._request("GET", "/zklogin", headers=self._headers(zklogin_jwt))
        address = data.get("address")
        if not address:
            raise EnokiError("Enoki did not return a zkLogin address.")
        return ZkLoginInfo(
            address=address, salt=data.get("salt", ""), public_key=data.get("publicKey")
        )

    async def sponsor_transaction(
        self,
        *,
        zklogin_jwt: str,
        transaction_block_kind_bytes: str,
        network: str | None = None,
        allowed_addresses: list[str] | None = None,
        allowed_move_call_targets: list[str] | None = None,
    ) -> SponsoredTransaction:
        """Create a sponsored transaction from `onlyTransactionKind` bytes.

        Returns the full transaction bytes + digest for the user to sign.
        """
        body: dict = {
            "network": network or self.network,
            "transactionBlockKindBytes": transaction_block_kind_bytes,
        }
        if allowed_addresses:
            body["allowedAddresses"] = allowed_addresses
        if allowed_move_call_targets:
            body["allowedMoveCallTargets"] = allowed_move_call_targets

        data = await self._request(
            "POST",
            "/transaction-blocks/sponsor",
            headers=self._headers(zklogin_jwt),
            json=body,
        )
        if not data.get("bytes") or not data.get("digest"):
            raise EnokiError("Enoki sponsor response missing bytes/digest.")
        return SponsoredTransaction(digest=data["digest"], bytes=data["bytes"])

    async def execute_transaction(self, digest: str, signature: str) -> str:
        """Submit a user-signed sponsored transaction for execution.

        Returns the executed transaction digest.
        """
        data = await self._request(
            "POST",
            f"/transaction-blocks/sponsor/{digest}",
            headers=self._headers(),
            json={"signature": signature},
        )
        return data.get("digest", digest)
