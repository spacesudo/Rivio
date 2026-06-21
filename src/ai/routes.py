from fastapi import APIRouter, Depends

from src.auth.dependencies import get_current_user
from src.db.models import User

from .schemas import ChatRequest, ChatResponse
from .service import AiService

router = APIRouter(prefix="/ai", tags=["ai"])

_ai_service = AiService()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user: User = Depends(get_current_user),
) -> ChatResponse:
    """Send a chat message to the Rivio AI assistant.

    The full conversation history should be passed in ``messages`` so the
    assistant maintains context across turns. The user's live wallet balances
    are fetched and injected into the system prompt automatically.
    """
    reply = await _ai_service.chat(user=user, messages=body.messages)
    return ChatResponse(reply=reply)
