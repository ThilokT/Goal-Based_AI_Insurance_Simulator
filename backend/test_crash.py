import asyncio, os, sys
from ai_services.chat_service import ChatService
async def test():
    chat = ChatService()
    try:
        stream = chat.send_message_stream('user_123', os.environ['USER_TEXT'])
        for chunk in stream:
            pass
        print('SUCCESS')
    except Exception as e:
        print(f'ERROR: {type(e).__name__}: {e}')
asyncio.run(test())
