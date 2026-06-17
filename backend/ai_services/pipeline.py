"""
Data pipeline: Scrape → Validate → Upsert to Supabase.

This module orchestrates the end-to-end data flow:
  1. Run the Playwright scraper (or load from seed data as fallback)
  2. Validate each product against Pydantic models
  3. Upsert validated products into the Supabase `products` table

Usage:
    python -m ai_services.pipeline
"""
import asyncio
import json
from pathlib import Path
from typing import Optional
from datetime import datetime

from rich.console import Console
from rich.table import Table
from pydantic import ValidationError

from ai_services.models import ScrapedProduct, ProductCategory, ProductFeature
from ai_services.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

console = Console()

SEED_DATA_PATH = Path(__file__).parent.parent / "data" / "seed_products.json"
SCRAPED_DATA_PATH = Path(__file__).parent.parent / "data" / "scraped_products.json"


class DataPipeline:
    """
    Orchestrates the product data pipeline:
    scrape → validate → transform → upsert to Supabase.

    This is a standalone class. The Backend Developer (P2) can call
    `pipeline.run()` from an API route or a scheduled job.
    """

    def __init__(self, use_seed: bool = False):
        """
        Args:
            use_seed: If True, skip scraping and load from seed_products.json.
        """
        self.use_seed = use_seed
        self.raw_products: list[dict] = []
        self.validated_products: list[ScrapedProduct] = []
        self.failed_validations: list[dict] = []
        self._supabase_client = None

    def _get_supabase_client(self):
        """Lazy-initialize the Supabase client."""
        if self._supabase_client is None:
            if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
                console.print("[yellow]⚠️  Supabase credentials not set — skipping DB upsert[/yellow]")
                return None
            from supabase import create_client
            self._supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        return self._supabase_client

    # ── Step 1: Load Data ─────────────────────────────────

    def load_seed_data(self) -> list[dict]:
        """Load curated seed products from JSON file."""
        if not SEED_DATA_PATH.exists():
            console.print(f"[red]❌ Seed data not found at {SEED_DATA_PATH}[/red]")
            return []

        with open(SEED_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        console.print(f"[green]📦 Loaded {len(data)} products from seed data[/green]")
        return data

    async def load_scraped_data(self) -> list[dict]:
        """Run the Playwright scraper and return raw product dicts."""
        try:
            from ai_services.scraper import ICICIPruScraper
            # Running headed so we can see what Playwright is doing
            scraper = ICICIPruScraper(headless=False)
            products = await scraper.scrape_all()
            scraper.save_to_json(str(SCRAPED_DATA_PATH))
            return [p.model_dump(mode="json") for p in products]
        except Exception as e:
            console.print(f"[red]❌ Scraper failed: {e}[/red]")
            console.print("[yellow]⚠️  Falling back to seed data...[/yellow]")
            return self.load_seed_data()

    # ── Step 2: Validate ──────────────────────────────────

    def _normalize_seed_to_scraped(self, raw: dict) -> dict:
        """
        Transform seed_products.json format into ScrapedProduct-compatible format.
        Seed data has a simpler schema, so we adapt it here.
        """
        features = []
        for benefit in raw.get("key_benefits", []):
            features.append({
                "feature_name": "Key Benefit",
                "feature_value": benefit,
            })

        # Map seed category strings to ProductCategory enum values
        category_map = {
            "Term Insurance": ProductCategory.TERM,
            "ULIP": ProductCategory.ULIP,
            "Endowment": ProductCategory.SAVINGS,
            "Retirement": ProductCategory.RETIREMENT,
            "Child Plan": ProductCategory.CHILD,
            "Health Insurance": ProductCategory.HEALTH,
            "Guaranteed Income": ProductCategory.SAVINGS,
        }

        return {
            "product_name": raw.get("name", "Unknown"),
            "product_code": raw.get("product_id"),
            "category": category_map.get(raw.get("category", ""), ProductCategory.OTHER).value,
            "description": raw.get("description", "Insurance product from ICICI Prudential."),
            "features": features,
            "eligibility": {
                "min_entry_age": str(raw.get("min_age", "N/A")),
                "max_entry_age": str(raw.get("max_age", "N/A")),
                "min_policy_term": str(raw.get("policy_term_min", "N/A")),
                "max_policy_term": str(raw.get("policy_term_max", "N/A")),
            },
            "source_url": f"https://www.iciciprulife.com/{raw.get('product_id', 'unknown')}",
            "goals_supported": raw.get("goals_supported", []),
        }

    def validate_products(self, raw_products: list[dict]) -> list[ScrapedProduct]:
        """
        Validate raw product dicts against the ScrapedProduct model.
        Returns only successfully validated products.
        """
        validated = []
        failed = []

        for raw in raw_products:
            try:
                # If it's seed data, normalize first
                if "name" in raw and "product_name" not in raw:
                    raw = self._normalize_seed_to_scraped(raw)

                product = ScrapedProduct(**raw)
                validated.append(product)
            except ValidationError as e:
                failed.append({"data": raw, "errors": str(e)})
                console.print(
                    f"[yellow]⚠️  Validation failed for "
                    f"'{raw.get('product_name', raw.get('name', 'unknown'))}': "
                    f"{e.error_count()} errors[/yellow]"
                )

        self.validated_products = validated
        self.failed_validations = failed

        console.print(
            f"[green]✅ Validated: {len(validated)}[/green] | "
            f"[red]❌ Failed: {len(failed)}[/red]"
        )
        return validated

    # ── Step 3: Transform for DB ──────────────────────────

    def _to_db_record(self, product: ScrapedProduct) -> dict:
        """
        Transform a validated ScrapedProduct into a flat dict
        suitable for Supabase insert.
        """
        # Generate a product_id if product_code is missing
        pid = product.product_code if product.product_code else product.product_name.lower().replace(" ", "-").replace("/", "")
        
        return {
            "product_id": pid,
            "name": product.product_name,
            "product_code": product.product_code,
            "category": product.category.value,
            "description": product.description,
            "features": json.dumps(
                [f.model_dump() for f in product.features], ensure_ascii=False
            ),
            "eligibility": json.dumps(product.eligibility, ensure_ascii=False),
            "brochure_url": product.brochure_url,
            "source_url": product.source_url,
            "last_scraped": product.last_scraped.isoformat(),
            "is_active": product.is_active,
        }

    # ── Step 4: Upsert to Supabase ────────────────────────

    def upsert_to_supabase(
        self, products: list[ScrapedProduct], table: str = "products"
    ) -> dict:
        """
        Upsert validated products into the Supabase table.
        Uses product_code as the conflict key for deduplication.

        Returns:
            dict with counts of inserted/updated/failed records.
        """
        client = self._get_supabase_client()
        if client is None:
            return {"inserted": 0, "failed": 0, "skipped_no_client": True}

        results = {"inserted": 0, "failed": 0, "errors": []}

        for product in products:
            record = self._to_db_record(product)
            try:
                client.table(table).upsert(
                    record, on_conflict="product_id"
                ).execute()
                results["inserted"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(
                    {"product": product.product_name, "error": str(e)}
                )
                console.print(
                    f"[red]❌ DB upsert failed for '{product.product_name}': {e}[/red]"
                )

        console.print(
            f"[green]📤 Upserted {results['inserted']} products to Supabase[/green]"
        )
        return results

    # ── Main Pipeline ─────────────────────────────────────

    async def run(self) -> dict:
        """
        Execute the full pipeline: load → validate → upsert.

        Returns:
            Summary dict with counts and any errors.
        """
        console.print("\n[bold cyan]🔄 Starting Data Pipeline[/bold cyan]\n")

        # Step 1: Load raw data
        if self.use_seed:
            self.raw_products = self.load_seed_data()
            validated = self.validate_products(self.raw_products)
        else:
            # Step 1.5: Extract deeply from downloaded/manual PDFs
            from ai_services.pdf_extractor import PDFExtractor
            extractor = PDFExtractor()
            brochure_dir = Path(__file__).parent.parent / "data" / "brochures"
            
            pdf_products = []
            if brochure_dir.exists():
                console.print(f"\n[bold cyan]📚 Processing PDFs in {brochure_dir.name}...[/bold cyan]")
                for pdf_file in brochure_dir.glob("*.pdf"):
                    product = extractor.extract_product_from_pdf(str(pdf_file))
                    if product:
                        pdf_products.append(product)
            
            validated = pdf_products
            self.raw_products = [p.model_dump(mode="json") for p in pdf_products]
            self.validated_products = validated

        if not validated:
            console.print("[red]❌ No valid products to process. Pipeline aborted.[/red]")
            return {"status": "error", "message": "No data loaded"}

        # Step 3: Upsert to DB
        db_result = self.upsert_to_supabase(validated)

        # Step 4: Index to VectorStore
        from ai_services.vectorstore import ProductVectorStore
        store = ProductVectorStore()
        product_dicts = [p.model_dump(mode="json") for p in validated]
        indexed_count = store.index_products(product_dicts)

        # Summary
        summary = {
            "status": "success",
            "raw_count": len(self.raw_products),
            "validated_count": len(validated),
            "failed_validations": len(self.failed_validations),
            "db_result": db_result,
            "indexed_count": indexed_count,
        }

        self._print_summary(summary)
        return summary

    def _print_summary(self, summary: dict):
        """Print a rich table summarizing the pipeline run."""
        table = Table(title="Pipeline Summary")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        table.add_row("Raw Products Loaded", str(summary["raw_count"]))
        table.add_row("Validated Successfully", str(summary["validated_count"]))
        table.add_row("Validation Failures", str(summary["failed_validations"]))
        table.add_row("DB Inserts", str(summary["db_result"].get("inserted", 0)))
        table.add_row("DB Failures", str(summary["db_result"].get("failed", 0)))
        table.add_row("Vector DB Indexed", str(summary.get("indexed_count", 0)))
        console.print(table)


# ── CLI Entry Point ───────────────────────────────────────
async def main():
    """Run the pipeline from command line."""
    import argparse
    parser = argparse.ArgumentParser(description="LifeMap Data Pipeline")
    parser.add_argument(
        "--seed", action="store_true",
        help="Use seed data instead of running the scraper"
    )
    args = parser.parse_args()

    pipeline = DataPipeline(use_seed=args.seed)
    await pipeline.run()


if __name__ == "__main__":
    asyncio.run(main())
