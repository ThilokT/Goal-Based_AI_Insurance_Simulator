"""Chat request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = Field(None, description="Existing conversation ID to continue")


class ConversationRenameRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    extracted_context: Optional[dict] = None


class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    summary: Optional[str] = None
    extracted_context: Optional[dict] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: Optional[str] = None


class ConversationDetailResponse(BaseModel):
    conversation: ConversationResponse
    messages: list[MessageResponse]
