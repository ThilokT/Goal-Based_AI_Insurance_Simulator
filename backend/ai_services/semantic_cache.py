import time
import numpy as np
from rich.console import Console

console = Console()

class SemanticCache:
    """
    Caches LLM answers based on semantic similarity of the user's question.
    Saves LLM tokens and time for repeated generic questions (e.g., 'What is ULIP?').
    """
    def __init__(self, threshold: float = 0.92):
        self.threshold = threshold
        self.cache = {}
        self.model = None  # Lazy load

        # In a real distributed system, we'd store embeddings in Redis + VectorStore
        # For this simulator, an in-memory dict works for demonstration.
        console.print(f"[dim]🧠 SemanticCache initialized (threshold: {threshold})[/dim]")

    def _get_model(self):
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
            except ImportError:
                console.print("[yellow]⚠️ sentence-transformers not found, semantic cache disabled[/yellow]")
                self.model = False
        return self.model

    def get(self, user_id: str, question: str) -> str | None:
        """Check if a semantically similar question exists in cache for this user."""
        model = self._get_model()
        if not model or len(self.cache) == 0:
            return None

        q_embedding = model.encode(question)
        
        for cache_key, (cached_emb, cached_answer, ts) in self.cache.items():
            cached_user_id, cached_q = cache_key
            if cached_user_id != user_id:
                continue

            # Cosine similarity
            similarity = np.dot(q_embedding, cached_emb) / (
                np.linalg.norm(q_embedding) * np.linalg.norm(cached_emb)
            )
            
            if similarity > self.threshold:
                console.print(f"[green]🟢 Semantic Cache HIT! (sim: {similarity:.3f})[/green]")
                return cached_answer
                
        return None

    def set(self, user_id: str, question: str, answer: str):
        """Store the question embedding and answer in the cache for this user."""
        model = self._get_model()
        if not model:
            return
            
        # Only cache short user messages to avoid caching long context dumps
        if len(question) < 300:
            embedding = model.encode(question)
            self.cache[(user_id, question)] = (embedding, answer, time.time())
            console.print(f"[dim]💾 Saved to Semantic Cache for {user_id}[/dim]")
