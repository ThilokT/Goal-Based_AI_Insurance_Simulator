"""
Chat router — SSE streaming endpoint wrapping P3's ChatService.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, ChatResponse, ExtractRequest
from app.services.chat_wrapper import stream_chat_response, extract_user_context
from app.services.conversation_service import ConversationService
from app.services.goal_service import GoalService
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, AI_RATE_LIMIT
from app.database import get_admin_client

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
    messages_history = []
    if not conversation_id:
        title = "New Conversation"
        if body.message and body.message != 'Hello, I want to plan my financial future.':
            title = body.message[:40] + ("..." if len(body.message) > 40 else "")
        conv = conv_service.create_conversation(user_id, title=title)
        conversation_id = conv["id"]
    else:
        conv_details = conv_service.get_conversation(conversation_id, user_id)
        if conv_details:
            messages_history = [{"role": m["role"], "content": m["content"]} for m in conv_details.get("messages", [])]
            if body.message and body.message != 'Hello, I want to plan my financial future.':
                if conv_details["conversation"].get("title") == "New Conversation":
                    new_title = body.message[:40] + ("..." if len(body.message) > 40 else "")
                    conv_service.update_title(conversation_id, new_title)

    # Save user message to DB
    conv_service.add_message(conversation_id, user_id, "user", body.message)

    # Fetch local conversation context to inject into AI context (do not fetch global profile automatically)
    conv_details_for_context = conv_service.get_conversation(conversation_id, user_id)
    user_profile = None
    if conv_details_for_context and conv_details_for_context.get("conversation"):
        user_profile = conv_details_for_context["conversation"].get("extracted_context")
        if not user_profile:
            user_profile = None

    # Stream response via P3's ChatService
    async def event_generator():
        full_response = ""
        async for event in stream_chat_response(conversation_id, body.message, history=messages_history, user_profile=user_profile):
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
    from ai_services.vectorstore import ProductVectorStore

    conv_service = ConversationService()
    user_id = user["user_id"]

    # Get or create conversation
    conversation_id = body.conversation_id
    messages_history = []
    if not conversation_id:
        title = "New Conversation"
        if body.message and body.message != 'Hello, I want to plan my financial future.':
            title = body.message[:40] + ("..." if len(body.message) > 40 else "")
        conv = conv_service.create_conversation(user_id, title=title)
        conversation_id = conv["id"]
    else:
        conv_details = conv_service.get_conversation(conversation_id, user_id)
        if conv_details:
            messages_history = [{"role": m["role"], "content": m["content"]} for m in conv_details.get("messages", [])]
            if body.message and body.message != 'Hello, I want to plan my financial future.':
                if conv_details["conversation"].get("title") == "New Conversation":
                    new_title = body.message[:40] + ("..." if len(body.message) > 40 else "")
                    conv_service.update_title(conversation_id, new_title)

    # Save user message
    conv_service.add_message(conversation_id, user_id, "user", body.message)

    # RAG: Fetch relevant product context based on user's message
    try:
        vectorstore = ProductVectorStore()
        results = vectorstore.search_products(body.message, n_results=3)
        product_context = ""
        if results:
            context_parts = []
            for r in results:
                context_parts.append(f"Product: {r.product_name} ({r.category})\nDetails: {r.chunk_text}")
            product_context = "\n\n".join(context_parts)
    except Exception:
        product_context = None

    # Get response
    chat = get_chat_service()
    if messages_history:
        chat.load_history(conversation_id, messages_history)
        
    # Fetch local conversation context to inject into AI context
    conv_details_for_context = conv_service.get_conversation(conversation_id, user_id)
    user_profile = None
    if conv_details_for_context and conv_details_for_context.get("conversation"):
        user_profile = conv_details_for_context["conversation"].get("extracted_context")
        if not user_profile:
            user_profile = None

    response = chat.send_message(conversation_id, body.message, product_context=product_context, user_profile=user_profile)

    # Save assistant response
    conv_service.add_message(conversation_id, user_id, "assistant", response)

    return ChatResponse(
        response=response,
        conversation_id=conversation_id,
    )

@router.post(
    "/chat/extract",
    summary="Extract context from conversation",
    description="Extracts profile fields and goals from the conversation history and saves them to the DB.",
)
@limiter.limit(AI_RATE_LIMIT)
async def extract_context(
    request: Request,
    body: ExtractRequest,
    user: dict = Depends(get_current_user),
):
    conv_service = ConversationService()
    user_id = user["user_id"]
    
    conv_details = conv_service.get_conversation(body.conversation_id, user_id)
    if not conv_details:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = conv_details["messages"]
    formatted_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
    
    extracted_data = extract_user_context(user_id, formatted_messages)
    if not extracted_data:
        extracted_data = {}
        
    conv_service.update_context(body.conversation_id, extracted_data)
    
    details = []
    if extracted_data.get("full_name"):
        details.append(f"**Name**: {extracted_data['full_name']}")
    if extracted_data.get("age"):
        details.append(f"**Age**: {extracted_data['age']}")
    if extracted_data.get("city"):
        details.append(f"**City**: {str(extracted_data['city']).title()}")
    if extracted_data.get("annual_income"):
        try:
            val = float(extracted_data["annual_income"])
            details.append(f"**Annual Income**: ₹{val:,.0f}")
        except:
            details.append(f"**Annual Income**: ₹{extracted_data['annual_income']}")
    if extracted_data.get("monthly_expenses"):
        try:
            val = float(extracted_data["monthly_expenses"])
            details.append(f"**Monthly Expenses**: ₹{val:,.0f}")
        except:
            details.append(f"**Monthly Expenses**: ₹{extracted_data['monthly_expenses']}")
    if extracted_data.get("dependents") is not None:
        details.append(f"**Dependents**: {extracted_data['dependents']}")
    if extracted_data.get("risk_appetite"):
        details.append(f"**Risk Appetite**: {str(extracted_data['risk_appetite']).title()}")
    if extracted_data.get("goals"):
        goals_str = ", ".join([str(g.get("goal_type", "")) for g in extracted_data["goals"] if g.get("goal_type")])
        if goals_str:
            details.append(f"**Goals**: {goals_str}")

    # Validation for required fields
    missing_fields = []
    if not extracted_data.get("age"): missing_fields.append("**Age**: Your current age")
    if not extracted_data.get("city"): missing_fields.append("**City**: Your city of residence")
    if extracted_data.get("dependents") is None: missing_fields.append("**Dependents**: Your family structure (number of dependents)")
    if not extracted_data.get("annual_income"): missing_fields.append("**Annual Income**: Your approximate yearly income")
    if extracted_data.get("monthly_expenses") is None: missing_fields.append("**Monthly Expenses**: Your approximate monthly expenses")
    if extracted_data.get("existing_coverage") is None: missing_fields.append("**Existing Savings/Coverage**: Any existing savings or life insurance coverage you have")
    if not extracted_data.get("risk_appetite"): missing_fields.append("**Risk Appetite**: Your investment risk tolerance (e.g., conservative, moderate, aggressive)")
    if not extracted_data.get("goals"): 
        missing_fields.append("**Financial Goals**: Please tell me at least one specific goal (e.g., retirement, child education, buying a home) along with your estimated budget and the timeline/year you want to achieve it")
    else:
        for goal in extracted_data["goals"]:
            goal_type = str(goal.get("goal_type", "your goal")).replace("_", " ").title()
            if not goal.get("target_amount"):
                missing_fields.append(f"**{goal_type} Budget**: Your estimated target amount / budget for {goal_type.lower()}")
            if not goal.get("target_year"):
                missing_fields.append(f"**{goal_type} Timeline**: The year or age by which you want to achieve {goal_type.lower()}")
    
    if missing_fields:
        missing_list = "\n- ".join(missing_fields)
        
        if details:
            details_list = "\n- ".join(details)
            missing_msg = f"I've extracted the following information from our chat so far:\n- {details_list}\n\nHowever, to simulate your Life Journey, I still need a bit more information. Could you please provide the following missing details?\n\n- {missing_list}"
        else:
            missing_msg = f"I'd love to simulate your Life Journey, but I still need a bit more information. Could you please provide the following missing details?\n\n- {missing_list}"
            
        conv_service.add_message(body.conversation_id, user_id, "assistant", missing_msg)
        return {"status": "missing_info", "data": extracted_data, "message": missing_msg}
        
    details_list = "\n- ".join(details)
    confirmation_msg = f"I've successfully extracted the following information from our chat:\n- {details_list}\n\nYou can now check your Life Journey timeline."
        
    conv_service.add_message(body.conversation_id, user_id, "assistant", confirmation_msg)
    
    return {"status": "success", "data": extracted_data, "message": confirmation_msg}
