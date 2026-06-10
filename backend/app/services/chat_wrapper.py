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
        # Get the full response (ChatService handles memory internally)
        response = chat.send_message(user_id, message)

        if not response:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Empty response from AI'})}\n\n"
            return

        # Simulate streaming by chunking the response
        # (P3's ChatService returns full text; real streaming can be added later)
        words = response.split()
        chunk_size = 5  # Send 5 words at a time for smooth UX
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i : i + chunk_size])
            yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

        # Final done event with full response
        yield f"data: {json.dumps({'type': 'done', 'content': response})}\n\n"

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
        profile = chat.extract_context(messages)
        if profile:
            return profile.model_dump(exclude_none=True)
        return {}
    except Exception as e:
        logger.error(f"Context extraction failed: {e}")
        return {}
