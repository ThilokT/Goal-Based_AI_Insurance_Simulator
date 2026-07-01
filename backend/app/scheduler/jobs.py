"""
APScheduler jobs — monthly product refresh.

Runs P3's DataPipeline to re-scrape and re-index products
on the 1st of each month at 2:00 AM.
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger("lifemap.scheduler")

scheduler = AsyncIOScheduler()


async def monthly_product_refresh():
    """
    Monthly job: re-scrape products and refresh vector embeddings.

    Calls P3's DataPipeline to update the products table and
    re-indexes the vector store with fresh embeddings.
    """
    logger.info("Starting monthly product refresh...")

    try:
        # Step 1: Run the data pipeline (scrape + validate + upsert)
        from ai_services.pipeline import DataPipeline
        pipeline = DataPipeline(use_seed=False)  # Run live scraper and PDF extraction
        summary = await pipeline.run()
        logger.info(f"Pipeline summary: {summary}")
        validated = pipeline.validated_products

        # Step 2: Re-index vector store
        from ai_services.vectorstore import get_vectorstore
        store = get_vectorstore()
        product_dicts = [p.model_dump(mode="json") for p in validated]
        count = store.index_products(product_dicts)
        logger.info(f"VectorStore: indexed {count} products")

        logger.info("Monthly product refresh completed successfully")

    except Exception as e:
        logger.error(f"Monthly product refresh failed: {e}")


def setup_scheduler():
    """Configure and return the APScheduler instance."""
    # Monthly refresh: 1st of every month at 2:00 AM
    scheduler.add_job(
        monthly_product_refresh,
        "cron",
        day=1,
        hour=2,
        minute=0,
        id="monthly_product_refresh",
        name="Monthly Product Refresh",
        replace_existing=True,
    )

    logger.info("APScheduler configured: monthly_product_refresh on 1st of month at 02:00")
    return scheduler
