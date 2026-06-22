# Enable AI Assistant to Explain Specific Plans (RAG)

The goal is to upgrade the "LifeMap Advisor" chatbot from being just a generic advisor to a fully knowledgeable assistant that can answer specific questions about the insurance plans in the database.

## Proposed Changes

### 1. Update `ai_services/chat_service.py`
- Modify the `SYSTEM_PROMPT` to remove the strict restriction against recommending/explaining specific plans, and instead instruct the AI to use provided `PRODUCT CONTEXT` to answer specific questions.
- Update the `send_message` and `send_message_stream` methods (including the Groq and Gemini internal methods) to accept a new `product_context` string parameter.
- Inject the `product_context` into the LLM's message history alongside the user's profile.

### 2. Update `app/services/chat_wrapper.py`
- Import `ProductVectorStore` to access the local ChromaDB.
- Intercept the user's chat message before sending it to the AI.
- Perform a fast semantic search on the vector database using the user's message as the query (e.g. `vectorstore.search_products(message, n_results=3)`).
- Format the retrieved chunks into a single string and pass it as the `product_context` to the `ChatService`.

## Implemented Changes (Completed)

The following changes were successfully implemented to bring RAG to the chat assistant:

1. **`ai_services/chat_service.py`**:
   - Modified `SYSTEM_PROMPT` to allow explaining specific plans if `PRODUCT CONTEXT` is provided.
   - Updated `_send_gemini`, `_send_gemini_stream`, `_send_groq`, `_send_groq_stream` and the main `send_message` methods to accept `product_context`.
   - Injected the context into the prompt: `PRODUCT CONTEXT from database: ... Please use this information to answer the user's latest question if relevant.`

2. **`app/services/chat_wrapper.py`** (Streaming Chat Endpoint):
   - Imported `ProductVectorStore`.
   - Added logic to execute `vectorstore.search_products(message, n_results=3)` dynamically using the incoming chat message.
   - Formatted the matched results into a string and passed it to `chat.send_message_stream(..., product_context=product_context)`.

3. **`app/routers/chat.py`** (Non-Streaming Chat Endpoint):
   - Mirrored the context fetching logic for the `/chat/sync` endpoint by directly querying the `ProductVectorStore` before sending the message to `chat.send_message`.

Because the backend is running with hot-reload (`--reload`), these changes took effect immediately without needing a restart. The AI can now explain specific insurance plans!
