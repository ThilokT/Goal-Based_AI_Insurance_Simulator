# Real-Time AI Chat Streaming Implementation

The goal is to modify the AI chat to stream its responses in real-time as they become available from the LLM, instead of waiting for the complete response to finish generating before returning it. 

## User Review Required

Please review the proposed approach. Since the frontend is already capable of handling Server-Sent Events (SSE) and token chunks, the changes will be confined entirely to the backend logic. We will leverage the `stream=True` capability of the Gemini and Groq SDKs to stream tokens directly to the client.

## Open Questions

None at this time.

## Proposed Changes

### Backend AI Services

#### [MODIFY] [chat_service.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/ai_services/chat_service.py)
- Introduce a new `send_message_stream(user_id, message)` generator method.
- Add `_send_gemini_stream` and `_send_groq_stream` helper methods that use the `stream=True` parameter of their respective SDKs to yield response chunks.
- The `send_message_stream` method will iterate over the chunks, yield them to the caller, and concurrently accumulate the full response.
- Once the stream is complete, it will append the final accumulated response to the user's conversation history.

#### [MODIFY] [chat_wrapper.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/services/chat_wrapper.py)
- Update the `stream_chat_response` generator function to call `chat.send_message_stream(...)` instead of the synchronous `chat.send_message(...)`.
- Remove the artificial chunking delay that splits a resolved response. Instead, immediately yield `token` SSE events as the real chunks arrive from the `ChatService`.
- Emit a `done` SSE event with the full accumulated text once the stream finishes.

## Verification Plan

### Manual Verification
- Interact with the LifeMap Advisor chat in the frontend UI.
- Verify that the message text appears word-by-word/chunk-by-chunk in real time, rather than hanging and appearing all at once.
- Check the backend logs and ensure that conversation history is properly maintained and that context extraction still functions correctly.
