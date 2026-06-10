"""Quick smoke test — can we generate embeddings?"""
import google.generativeai as genai
from ai_services.config import EMBEDDING_MODEL

def test_embedding():
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content="retirement planning with guaranteed income",
        task_type="retrieval_document"
    )
    embedding = result['embedding']
    print(f"[OK] Embedding dimension: {len(embedding)}")
    print(f"[OK] First 5 values: {embedding[:5]}")
    assert len(embedding) > 100, "Embedding dimension too low"

if __name__ == "__main__":
    test_embedding()
    print("[SUCCESS] Gemini Embedding API is working!")