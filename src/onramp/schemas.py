from pydantic import BaseModel, Field


class OnrampWidgetRequest(BaseModel):
    """Optional widget configuration for a Transak buy flow.

    Sensible defaults are applied server-side: the wallet address falls back to
    the authenticated user's wallet, and the crypto currency/network default to
    USDC on Sui.
    """

    fiat_currency: str | None = Field(default=None, examples=["USD"])
    fiat_amount: float | None = Field(default=None, gt=0, examples=[100])
    crypto_currency_code: str = Field(default="USDC", examples=["USDC", "SUI"])
    network: str = Field(default="sui", examples=["sui"])
    wallet_address: str | None = Field(
        default=None,
        description="Defaults to the authenticated user's wallet address.",
    )
    redirect_url: str | None = None


class OnrampWidgetResponse(BaseModel):
    """A single-use Transak widget URL (expires 5 minutes after creation)."""

    widget_url: str
