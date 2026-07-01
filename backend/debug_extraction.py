import sys
import traceback
import json
import asyncio

from app.services.chat_wrapper import extract_user_context

def main():
    messages = [
        {"role": "user", "content": "my name is lucky , my age is 27"},
        {"role": "assistant", "content": "Hello Lucky! It's great to connect with you. So, at 27, you're looking to plan your finances – that's a very smart move!\nTo get started, what's on your mind today regarding your financial planning or insurance? Are you looking to protect your family, save for a specific goal, or simply explore your options? 💡"},
        {"role": "user", "content": "I want a financial plan"},
        {"role": "assistant", "content": "Lucky, I'd be happy to help you create a personalized financial plan. To get started, I'll need to know a bit more about your current financial situation and goals.\nLet's break it down into smaller steps. Here are some key pieces of information that will help me"}
    ]
    
    with open("extraction_debug.log", "w", encoding="utf-8") as f:
        try:
            f.write("Starting extraction...\n")
            result = extract_user_context("test_user", messages)
            f.write("Extraction finished successfully.\n")
            f.write(json.dumps(result, indent=2))
        except Exception as e:
            f.write(f"Extraction failed with exception:\n{e}\n")
            f.write(traceback.format_exc())

if __name__ == "__main__":
    main()
