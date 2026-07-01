"""
ChromaDB vector store for insurance product semantic search.

Generates Gemini embeddings for product descriptions, indexes them in
a persistent ChromaDB collection, and exposes a `search_products(query)`
function for similarity-based retrieval.

Usage:
    python -m ai_services.vectorstore
"""
import json
from pathlib import Path
from typing import Optional

import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
from rich.console import Console

from ai_services.config import (
    CHROMA_COLLECTION_NAME,
    CHROMA_PERSIST_DIR,
)
from ai_services.models import ScrapedProduct, ProductMatch

from functools import lru_cache
from app.services.cache_decorator import cached

console = Console()


@lru_cache(maxsize=1)
def get_vectorstore():
    """Lazy singleton for the ProductVectorStore."""
    return ProductVectorStore()


class ProductVectorStore:
    """
    Manages a ChromaDB collection of insurance product embeddings.

    Responsibilities:
      - Generate text embeddings via Gemini
      - Index products into ChromaDB with metadata
      - Perform semantic similarity search

    This is a standalone class. P2 wraps it in API endpoints.
    """

    def __init__(
        self,
        persist_dir: str = CHROMA_PERSIST_DIR,
        collection_name: str = CHROMA_COLLECTION_NAME,
    ):
        """
        Initialize the vector store.

        Args:
            persist_dir: Directory to persist ChromaDB data.
            collection_name: Name of the ChromaDB collection.
        """
        self.persist_dir = persist_dir
        self.collection_name = collection_name
        Path(persist_dir).mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # cosine similarity
        )
        
        console.print("[dim]⏳ Loading local embedding model (all-MiniLM-L6-v2)...[/dim]")
        self.embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        console.print(
            f"[green]✅ ChromaDB collection '{collection_name}' ready "
            f"({self.collection.count()} documents)[/green]"
        )

    # ── Embedding Generation ──────────────────────────────

    def _generate_embedding(self, text: str) -> list[float]:
        """
        Generate an embedding vector for a text string.
        """
        return self.embeddings_model.embed_documents([text])[0]

    def _generate_query_embedding(self, query: str) -> list[float]:
        """
        Generate an embedding optimised for retrieval queries.
        """
        return self.embeddings_model.embed_query(query)

    def _generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a batch of strings locally."""
        # No sleep needed for local model!
        return self.embeddings_model.embed_documents(texts)

    def _product_to_text(self, product: dict) -> str:
        """
        Convert a product dict into a rich text string for embedding.
        Combines name, category, description, features, and goals
        to maximise semantic signal.

        Args:
            product: Product data dictionary.

        Returns:
            A concatenated text string for embedding.
        """
        parts = [
            f"Product: {product.get('product_name', product.get('name', ''))}",
            f"Category: {product.get('category', '')}",
            f"Description: {product.get('description', '')}",
        ]

        # Add features
        features = product.get("features", [])
        if features:
            if isinstance(features[0], dict):
                feat_texts = [
                    f"{f.get('feature_name', '')}: {f.get('feature_value', '')}"
                    for f in features
                ]
            else:
                feat_texts = features
            parts.append("Features: " + "; ".join(feat_texts))

        # Add key benefits (from seed data format)
        benefits = product.get("key_benefits", [])
        if benefits:
            parts.append("Benefits: " + "; ".join(benefits))

        # Add supported goals
        goals = product.get("goals_supported", [])
        if goals:
            parts.append("Goals Supported: " + ", ".join(goals))

        return "\n".join(parts)

    # ── Indexing ──────────────────────────────────────────

    def index_products(self, products: list[dict]) -> int:
        """
        Generate embeddings and index a list of products into ChromaDB.

        Args:
            products: List of product dicts (seed or scraped format).

        Returns:
            Number of products successfully indexed.
        """
        console.print(f"\n[cyan]📥 Indexing {len(products)} products into ChromaDB...[/cyan]")

        ids = []
        documents = []
        embeddings = []
        metadatas = []

        for i, product in enumerate(products):
            product_id = product.get(
                "product_code",
                product.get("product_id", f"product_{i}")
            )

            # Skip if already indexed
            existing = self.collection.get(where={"product_id": product_id})
            if existing and existing["ids"]:
                console.print(f"  [dim]⏭️  Skipping '{product.get('product_name', product.get('name', ''))}' (already indexed)[/dim]")
                continue

            # Fallback to _product_to_text if raw_chunks is missing (e.g. seed data)
            raw_chunks = product.get("raw_chunks", [])
            if not raw_chunks:
                raw_chunks = [self._product_to_text(product)]

            batch_size = 50
            for i in range(0, len(raw_chunks), batch_size):
                batch_texts = raw_chunks[i:i + batch_size]
                try:
                    batch_embeddings = self._generate_embeddings_batch(batch_texts)
                    for j, embedding in enumerate(batch_embeddings):
                        chunk_idx = i + j
                        chunk_id = f"{product_id}_chunk_{chunk_idx}"
                        ids.append(chunk_id)
                        documents.append(batch_texts[j])
                        embeddings.append(embedding)
                        metadatas.append({
                            "product_id": product_id,
                            "product_name": product.get("product_name", product.get("name", "Unknown")),
                            "category": product.get("category", "other"),
                            "description": product.get("description", "")[:500],
                            "goals_supported": json.dumps(product.get("goals_supported", [])),
                            "key_benefits": json.dumps(
                                product.get("key_benefits", [b.get("feature_value", "") for b in product.get("features", []) if isinstance(b, dict)])
                            ),
                        })
                except Exception as e:
                    console.print(f"  [red]❌ Embedding failed for product {product_id} batch {i}: {e}[/red]")

            console.print(
                f"  [green]✅ Embedded: {product.get('product_name', product.get('name', ''))} ({len(raw_chunks)} chunks)[/green]"
            )

        if ids:
            self.collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            console.print(
                f"\n[bold green]🎉 Indexed {len(ids)} new products. "
                f"Total in collection: {self.collection.count()}[/bold green]"
            )

        return len(ids)

    # ── Semantic Search ───────────────────────────────────

    @cached(ttl_seconds=1800, key_prefix="vectorstore")
    def search_products(
        self,
        query: str,
        n_results: int = 15,
        category_filter: Optional[str] = None,
    ) -> list[ProductMatch]:
        """
        Perform semantic similarity search on the product collection.

        Args:
            query: Natural language search query (e.g., "best plan for retirement").
            n_results: Maximum number of results to return.
            category_filter: Optional category to filter results by.

        Returns:
            List of ProductMatch objects, ordered by similarity score (highest first).
        """
        query_embedding = self._generate_query_embedding(query)

        where_filter = None
        if category_filter:
            where_filter = {"category": category_filter}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        matches = []
        if results and results["ids"] and results["ids"][0]:
            for i, product_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i]
                distance = results["distances"][0][i]

                # ChromaDB cosine distance: 0 = identical, 2 = opposite
                # Convert to similarity score: 1 - (distance / 2)
                similarity = max(0.0, 1.0 - (distance / 2.0))

                try:
                    benefits = json.loads(metadata.get("key_benefits", "[]"))
                except (json.JSONDecodeError, TypeError):
                    benefits = []

                try:
                    goals = json.loads(metadata.get("goals_supported", "[]"))
                except (json.JSONDecodeError, TypeError):
                    goals = []

                matches.append(ProductMatch(
                    product_name=metadata.get("product_name", "Unknown"),
                    product_id=metadata.get("product_id", product_id),
                    category=metadata.get("category", "other"),
                    similarity_score=round(similarity, 4),
                    matched_goals=goals,
                    description=metadata.get("description", ""),
                    key_benefits=benefits,
                ))

        console.print(
            f"[cyan]🔍 Search '{query}' → {len(matches)} results[/cyan]"
        )
        return matches

    def get_all_products(self) -> list[dict]:
        """Return all indexed products and their metadata."""
        result = self.collection.get(include=["metadatas", "documents"])
        products = []
        for i, pid in enumerate(result["ids"]):
            products.append({
                "id": pid,
                "metadata": result["metadatas"][i],
                "document": result["documents"][i],
            })
        return products

    def delete_collection(self):
        """Delete the entire collection (useful for re-indexing)."""
        self.client.delete_collection(self.collection_name)
        console.print(f"[yellow]🗑️  Deleted collection '{self.collection_name}'[/yellow]")


# ── CLI Entry Point ───────────────────────────────────────
def main():
    """Index seed products and test search."""
    seed_path = Path(__file__).parent.parent / "data" / "seed_products.json"
    with open(seed_path, "r", encoding="utf-8") as f:
        products = json.load(f)

    store = get_vectorstore()
    store.index_products(products)

    # Test queries
    test_queries = [
        "I want to save for my child's education",
        "best term insurance with high cover",
        "retirement planning with guaranteed income",
    ]
    for query in test_queries:
        console.print(f"\n{'='*60}")
        results = store.search_products(query, n_results=3)
        for match in results:
            console.print(
                f"  [{match.similarity_score:.2%}] {match.product_name} "
                f"({match.category})"
            )


if __name__ == "__main__":
    main()
