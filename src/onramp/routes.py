from fastapi import APIRouter, Depends

from src.auth.dependencies import AuthContext, get_auth_context
from src.onramp.schemas import OnrampWidgetRequest, OnrampWidgetResponse
from src.onramp.service import TransakService

router = APIRouter(prefix="/onramp", tags=["onramp"])

transak_service = TransakService()


@router.post("/widget", response_model=OnrampWidgetResponse)
async def create_widget(
    body: OnrampWidgetRequest | None = None,
    ctx: AuthContext = Depends(get_auth_context),
) -> OnrampWidgetResponse:
    """Create a Transak widget URL for the authenticated user to buy crypto.

    The URL is single-use and expires 5 minutes after creation, so the frontend
    should request a fresh one for each buy flow.
    """
    body = body or OnrampWidgetRequest()
    widget_params = {
        "cryptoCurrencyCode": body.crypto_currency_code,
        "network": body.network,
        "walletAddress": body.wallet_address or ctx.user.wallet_address,
        "fiatCurrency": body.fiat_currency,
        "fiatAmount": body.fiat_amount,
        "redirectURL": body.redirect_url,
    }
    widget_url = await transak_service.create_widget_url(widget_params=widget_params)
    return OnrampWidgetResponse(widget_url=widget_url)
