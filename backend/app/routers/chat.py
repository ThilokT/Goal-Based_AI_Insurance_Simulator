"""
Chat router — SSE streaming endpoint wrapping P3's ChatService.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_wrapper import stream_chat_response, extract_user_context
from app.services.conversation_service import ConversationService
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, AI_RATE_LIMIT

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post(
    "/chat",
    summary="Send a chat message (SSE streaming)",
    description=(
        "Send a message to the AI insurance advisor. "
        "Returns a Server-Sent Events stream with the response. "
        "Automatically creates a conversation if conversation_id is not provided."
    ),
)
@limiter.limit(AI_RATE_LIMIT)
async def chat(
    request: Request,
    body: ChatRequest,
    user: dict = Depends(get_current_user),
):
    """
    SSE streaming chat endpoint.

    The response is a stream of events:
    - type: "token" — a chunk of the AI response
    - type: "done" — final full response + metadata
    - type: "error" — if something went wrong
    """
    conv_service = ConversationService()
    user_id = user["user_id"]

    # Get or create conversation
    conversation_id = body.conversation_id
    if not conversation_id:
        conv = conv_service.create_conversation(user_id)
        conversation_id = conv["id"]

    # Save user message to DB
    conv_service.add_message(conversation_id, user_id, "user", body.message)

    # Stream response via P3's ChatService
    async def event_generator():
        full_response = ""
        async for event in stream_chat_response(user_id, body.message):
            # Capture the full response from "done" events
            if '"type": "done"' in event:
                import json
                try:
                    data = json.loads(event.replace("data: ", "").strip())
                    full_response = data.get("content", "")
                except (json.JSONDecodeError, ValueError):
                    pass
            yield event

        # After streaming is done, save assistant response to DB
        if full_response:
            conv_service.add_message(
                conversation_id, user_id, "assistant", full_response
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Conversation-Id": conversation_id,
        },
    )


@router.post(
    "/chat/sync",
    response_model=ChatResponse,
    summary="Send a chat message (non-streaming)",
    description="Send a message and get the full response at once (not streamed).",
)
@limiter.limit(AI_RATE_LIMIT)
async def chat_sync(
    request: Request,
    body: ChatRequest,
    user: dict = Depends(get_current_user),
):
    """Non-streaming chat endpoint for clients that don't support SSE."""
    from app.services.chat_wrapper import get_chat_service

    conv_service = ConversationService()
    user_id = user["user_id"]

    # Get or create conversation
    conversation_id = body.conversation_id
    if not conversation_id:
        conv = conv_service.create_conversation(user_id)
        conversation_id = conv["id"]

    # Save user message
    conv_service.add_message(conversation_id, user_id, "user", body.message)

    # Get response
    chat = get_chat_service()
    response = chat.send_message(user_id, body.message)

    # Save assistant response
    conv_service.add_message(conversation_id, user_id, "assistant", response)

    return ChatResponse(
        response=response,
        conversation_id=conversation_id,
    )
