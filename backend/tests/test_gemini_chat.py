"""Quick smoke test — does Gemini respond?"""
import google.generativeai as genai
from ai_services.config import CHAT_MODEL

def test_gemini_chat():
    model = genai.GenerativeModel(CHAT_MODEL)
    response = model.generate_content(
        "You are an insurance advisor. In one sentence, what is a ULIP?"
    )
    print(f"[OK] Chat Response: {response.text}")
    assert len(response.text) > 10, "Response too short"

if __name__ == "__main__":
    test_gemini_chat()
    print("[SUCCESS] Gemini Chat API is working!")