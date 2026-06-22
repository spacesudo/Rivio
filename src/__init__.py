from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.ai.routes import router as ai_router
from src.auth.routes import router as auth_router
from src.config import settings
from src.errors import register_all_errors
from src.kyc.routes import router as kyc_router
from src.lending.routes import router as lending_router
from src.onramp.routes import router as onramp_router
from src.swap.routes import router as swap_router
from src.transactions.routes import router as transactions_router
from src.wallet.routes import router as wallet_router

API_PREFIX = "/api/v1"


app = FastAPI(
    title="Velo API",
    version="0.1.0",
    description="Velo backend API.",
)

register_all_errors(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(kyc_router, prefix=API_PREFIX)
app.include_router(transactions_router, prefix=API_PREFIX)
app.include_router(wallet_router, prefix=API_PREFIX)
app.include_router(onramp_router, prefix=API_PREFIX)
app.include_router(swap_router, prefix=API_PREFIX)
app.include_router(lending_router, prefix=API_PREFIX)
app.include_router(ai_router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
