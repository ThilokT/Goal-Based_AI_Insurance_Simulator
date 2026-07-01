"""
Conversations router — CRUD for chat sessions.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from app.schemas.chat import ConversationResponse, ConversationDetailResponse, MessageResponse, ConversationRenameRequest
from app.services.conversation_service import ConversationService
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, CRUD_RATE_LIMIT

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


@router.get(
    "",
    response_model=list[ConversationResponse],
    summary="List conversations",
    description="Returns all chat sessions for the authenticated user.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def list_conversations(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """List all conversations."""
    service = ConversationService()
    return service.list_conversations(user["user_id"])


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get a conversation with messages",
    description="Returns a conversation and all its messages.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def get_conversation(
    request: Request,
    conversation_id: str,
    limit: int = Query(None, description="Number of messages to return"),
    offset: int = Query(None, description="Offset for pagination"),
    user: dict = Depends(get_current_user),
):
    """Get a conversation with all messages."""
    service = ConversationService()
    result = service.get_conversation(conversation_id, user["user_id"], limit=limit, offset=offset)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return ConversationDetailResponse(
        conversation=ConversationResponse(**result["conversation"]),
        messages=[MessageResponse(**m) for m in result["messages"]],
    )


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def create_conversation(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Create a new chat conversation."""
    service = ConversationService()
    conv = service.create_conversation(user["user_id"])
    return ConversationResponse(**conv)


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def delete_conversation(
    request: Request,
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a conversation (soft-delete)."""
    service = ConversationService()
    success = service.delete_conversation(conversation_id, user["user_id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

@router.patch(
    "/{conversation_id}",
    response_model=ConversationResponse,
    summary="Rename a conversation",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def rename_conversation(
    request: Request,
    conversation_id: str,
    body: ConversationRenameRequest,
    user: dict = Depends(get_current_user),
):
    """Rename a conversation."""
    service = ConversationService()
    existing = service.get_conversation(conversation_id, user["user_id"])
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    service.update_title(conversation_id, body.title)
    updated = service.get_conversation(conversation_id, user["user_id"])
    return ConversationResponse(**updated["conversation"])

@router.put(
    "/{conversation_id}/context",
    response_model=dict,
    summary="Overwrite conversation context",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def update_conversation_context(
    request: Request,
    conversation_id: str,
    context: dict,
    user: dict = Depends(get_current_user),
):
    """Overwrite the isolated context for this chat."""
    service = ConversationService()
    existing = service.get_conversation(conversation_id, user["user_id"])
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    service.update_context(conversation_id, context)
    return {"status": "success", "context": context}

