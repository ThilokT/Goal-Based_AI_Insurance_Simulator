"""
Chat wrapper — wraps P3's ChatService for the /api/chat endpoint.

Instantiates ChatService, calls send_message(), and yields tokens
for SSE streaming responses.
"""
import logging
import json
from typing import AsyncGenerator
from ai_services.chat_service import ChatService

logger = logging.getLogger("lifemap.chat")

# Singleton instance — shared across requests (has per-user memory internally)
_chat_service = None


def get_chat_service() -> ChatService:
    """Lazy singleton for the ChatService."""
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service


async def stream_chat_response(
    user_id: str,
    message: str,
    user_profile: dict = None,
) -> AsyncGenerator[str, None]:
    """
    Generator that yields SSE-formatted events for a chat response.

    Events:
        - data: {"type": "token", "content": "..."} — streamed text chunk
        - data: {"type": "done", "content": "..."} — final full response
        - data: {"type": "error", "message": "..."} — on failure
    """
    chat = get_chat_service()

    try:
        full_response = ""
        stream = chat.send_message_stream(user_id, message, user_profile=user_profile)

        for chunk in stream:
            if not chunk:
                continue
            full_response += chunk
            yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

        if not full_response:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Empty response from AI'})}\n\n"
            return

        # Final done event with full response
        yield f"data: {json.dumps({'type': 'done', 'content': full_response})}\n\n"

    except Exception as e:
        logger.error(f"Chat error for user {user_id}: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


def extract_user_context(user_id: str, messages: list[dict]) -> dict:
    """
    Use P3's ChatService to extract structured user context from conversation.

    Returns:
        dict with extracted profile fields (age, income, goals, etc.)
    """
    chat = get_chat_service()
    try:
        profile = chat.extract_context_from_messages(messages)
        if profile:
            return profile.model_dump(exclude_none=True)
        return {}
    except Exception as e:
        logger.error(f"Context extraction failed: {e}")
        return {}
