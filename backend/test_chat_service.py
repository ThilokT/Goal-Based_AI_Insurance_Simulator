import asyncio
from ai_services.chat_service import ChatService

async def test():
    chat = ChatService()
    try:
        # Create the generator
        stream = chat.send_message_stream("test_user_123", "Explain endowment policies to me")
        
        # Iterate over it just like chat_wrapper.py does
        for chunk in stream:
            print("CHUNK:", chunk)
            
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
