"""
Product service — CRUD operations on the products table.
Uses admin client (service key) since products table is not user-scoped.
"""
import logging
from typing import Optional
from app.database import get_admin_client
from app.services.cache_decorator import cached, clear_cache

logger = logging.getLogger("lifemap.products")


class ProductService:
    """CRUD for insurance products in Supabase."""

    def __init__(self):
        self.client = get_admin_client()
        self.table = "products"

    @cached(ttl_seconds=3600, key_prefix="products")
    def list_products(
        self,
        category: Optional[str] = None,
        is_active: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """List products with optional category filter."""
        query = self.client.table(self.table).select("*", count="exact")

        if category:
            query = query.eq("category", category)
        if is_active is not None:
            query = query.eq("is_active", is_active)

        response = query.order("name").range(offset, offset + limit - 1).execute()

        return {
            "products": response.data or [],
            "total": response.count or 0,
        }

    @cached(ttl_seconds=3600, key_prefix="products")
    def get_product(self, product_id: str) -> Optional[dict]:
        """Get a single product by its product_id."""
        response = (
            self.client.table(self.table)
            .select("*")
            .eq("product_id", product_id)
            .single()
            .execute()
        )
        return response.data

    def create_product(self, data: dict) -> dict:
        """Create or upsert a product."""
        response = (
            self.client.table(self.table)
            .upsert(data, on_conflict="product_id")
            .execute()
        )
        clear_cache("products")
        return response.data[0] if response.data else {}

    def bulk_upsert(self, products: list[dict]) -> int:
        """Bulk upsert products (used by scraper pipeline)."""
        if not products:
            return 0

        response = (
            self.client.table(self.table)
            .upsert(products, on_conflict="product_id")
            .execute()
        )
        clear_cache("products")
        return len(response.data) if response.data else 0

    def delete_product(self, product_id: str) -> bool:
        """Soft-delete a product by setting is_active to false."""
        response = (
            self.client.table(self.table)
            .update({"is_active": False})
            .eq("product_id", product_id)
            .execute()
        )
        clear_cache("products")
        return bool(response.data)
