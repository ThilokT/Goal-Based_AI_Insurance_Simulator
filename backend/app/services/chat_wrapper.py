"""
Chat wrapper — wraps P3's ChatService for the /api/chat endpoint.

Instantiates ChatService, calls send_message(), and yields tokens
for SSE streaming responses.
"""
import logging
import json
from typing import AsyncGenerator
from ai_services.chat_service import ChatService
from ai_services.vectorstore import ProductVectorStore

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
    
    # RAG: Fetch relevant product context based on user's message
    try:
        vectorstore = ProductVectorStore()
        results = vectorstore.search_products(message, n_results=3)
        product_context = ""
        if results:
            context_parts = []
            for r in results:
                context_parts.append(f"Product: {r.product_name} ({r.category})\nDetails: {r.chunk_text}")
            product_context = "\n\n".join(context_parts)
    except Exception as e:
        logger.warning(f"Failed to fetch product context: {e}")
        product_context = None

    try:
        full_response = ""
        stream = chat.send_message_stream(user_id, message, user_profile=user_profile, product_context=product_context)

        import re
        import asyncio

        for chunk in stream:
            if not chunk:
                continue
            full_response += chunk
            
            # Split chunk into tokens (keeping spaces) to simulate smooth token streaming
            tokens = re.split(r'(\s+)', chunk)
            for token in tokens:
                if token:
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                    await asyncio.sleep(0.02)

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
