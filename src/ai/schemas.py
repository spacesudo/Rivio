from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|ai|assistant)$")
    content: str = Field(..., min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=20)

    @field_validator("messages")
    @classmethod
    def validate_messages(cls, messages: list[ChatMessage]) -> list[ChatMessage]:
        total = sum(len(m.content) for m in messages)
        if total > 10000:
            raise ValueError("Combined message length exceeds 10,000 characters.")
        return messages


class ChatResponse(BaseModel):
    reply: str
    role: str = "ai"
