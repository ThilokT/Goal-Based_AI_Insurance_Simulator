"""
Playwright-based scraper for ICICI Prudential Life Insurance products.
Scrapes product names, descriptions, features, and eligibility from the website.

Usage:
    python -m ai_services.scraper
"""
import asyncio
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional
import httpx

from playwright.async_api import async_playwright, Page, Browser
from rich.console import Console
from rich.progress import Progress

from ai_services.models import ScrapedProduct, ProductFeature, ProductCategory

console = Console()

# ── Category URL mapping ──────────────────────────────────
CATEGORY_URLS = {
    ProductCategory.OTHER: "https://www.iciciprulife.com/insurance-plans/buy-life-insurance-online.html",
}

# ── CSS Selectors (ADAPT THESE to the actual site) ───────
# These are examples — you MUST verify and update them by
# inspecting the actual ICICI Pru website
SELECTORS = {
    "product_cards": ".product-card, .plan-card, [class*='product']",
    "product_name": "h1, h2, h3, .product-title, .plan-name",
    "product_link": "a:has-text('Know More')",
    "description": ".product-description, .plan-desc, .overview p",
    "features_list": ".key-features li, .features-list li, .plan-features li",
    "eligibility_table": ".eligibility-table tr, .plan-details tr",
    "brochure_link": "a:has-text('Brochure'), a[download], a[href*='.pdf']",
}


class ICICIPruScraper:
    """Scrapes ICICI Prudential product data using Playwright."""

    def __init__(self, headless: bool = True):
        self.headless = headless
        self.products: list[ScrapedProduct] = []
        self.browser: Optional[Browser] = None

    async def start(self):
        """Initialize the browser."""
        pw = await async_playwright().start()
        self.browser = await pw.chromium.launch(headless=self.headless)
        console.print("[green]✅ Browser launched[/green]")

    async def close(self):
        """Close the browser."""
        if self.browser:
            await self.browser.close()
            console.print("[green]✅ Browser closed[/green]")

    async def _get_page(self) -> Page:
        """Create a new page with realistic headers."""
        context = await self.browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1920, "height": 1080},
            accept_downloads=True,
        )
        page = await context.new_page()
        return page

    async def scrape_category_page(
        self, category: ProductCategory, url: str
    ) -> list[str]:
        """
        Scrape a category listing page to get individual product URLs.
        Returns a list of product page URLs.
        """
        page = await self._get_page()
        product_urls = []

        try:
            console.print(f"[blue]📂 Scraping category: {category.value}[/blue]")
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)  # Let JS render

            # Find all product links on the listing page
            links = await page.query_selector_all(SELECTORS["product_link"])

            for link in links:
                href = await link.get_attribute("href")
                if href and not href.startswith("#"):
                    full_url = (
                        href if href.startswith("http")
                        else f"https://www.iciciprulife.com{href}"
                    )
                    if full_url not in product_urls:
                        product_urls.append(full_url)

            console.print(
                f"  Found [yellow]{len(product_urls)}[/yellow] product links"
            )

        except Exception as e:
            console.print(f"[red]❌ Error scraping {category.value}: {e}[/red]")
        finally:
            await page.close()

        return product_urls

    async def scrape_product_page(
        self, url: str, category: ProductCategory
    ) -> Optional[ScrapedProduct]:
        """
        Scrape an individual product page for details.
        Returns a validated ScrapedProduct or None on failure.
        """
        page = await self._get_page()

        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)

            # ── Product Name ──────────────────────────────
            name_el = await page.query_selector("h1")
            if not name_el:
                name_el = await page.query_selector(SELECTORS["product_name"])
            product_name = (
                (await name_el.text_content()).strip() if name_el else "Unknown"
            )

            # ── Description ───────────────────────────────
            desc_el = await page.query_selector(SELECTORS["description"])
            description = (
                (await desc_el.text_content()).strip()
                if desc_el
                else f"{product_name} — ICICI Prudential Life Insurance product."
            )
            # Ensure minimum length
            if len(description) < 20:
                description = (
                    f"{product_name} is a {category.value.replace('_', ' ')} "
                    f"product from ICICI Prudential Life Insurance."
                )

            # ── Features ──────────────────────────────────
            features = []
            feature_els = await page.query_selector_all(
                SELECTORS["features_list"]
            )
            for fel in feature_els[:15]:  # Cap at 15 features
                text = (await fel.text_content()).strip()
                if text and len(text) > 5:
                    # Try to split into name:value pairs
                    if ":" in text:
                        parts = text.split(":", 1)
                        features.append(
                            ProductFeature(
                                feature_name=parts[0].strip(),
                                feature_value=parts[1].strip(),
                            )
                        )
                    else:
                        features.append(
                            ProductFeature(
                                feature_name="Key Feature",
                                feature_value=text,
                            )
                        )

            # ── Eligibility ───────────────────────────────
            eligibility = {}
            elig_els = await page.query_selector_all(
                SELECTORS["eligibility_table"]
            )
            for row in elig_els:
                cells = await row.query_selector_all("td, th")
                if len(cells) >= 2:
                    key = (await cells[0].text_content()).strip().lower()
                    val = (await cells[1].text_content()).strip()
                    if key and val:
                        # Normalize key names
                        key = re.sub(r'\s+', '_', key)
                        eligibility[key] = val

            # ── Brochure Download ──────────────────────────────
            brochure_url = "Downloaded natively via Playwright"
            brochure_url = "Downloaded natively via Playwright"
            
            try:
                locator = page.locator("a:has-text('Brochure'), a:has-text('Download'), a[download], a[href*='.pdf']")
                if await locator.count() > 0:
                    clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', product_name.lower().replace(' ', '_'))
                    brochure_path = Path(__file__).parent.parent / "data" / "brochures" / f"{clean_name}.pdf"
                    brochure_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    async with page.expect_download(timeout=15000) as download_info:
                        # Force click bypasses visibility checks and prevents the 30s hang
                        await locator.first.click(timeout=5000, force=True)
                    
                    download = await download_info.value
                    await download.save_as(str(brochure_path))
                    console.print(f"  [green]⬇️ Downloaded native brochure: {brochure_path.name}[/green]")
                else:
                    brochure_url = None
            except Exception as e:
                # We catch timeouts and safely continue so the pipeline doesn't crash
                console.print(f"  [yellow]⚠️ Brochure not found or download timed out for {product_name}[/yellow]")
                brochure_url = None

            # ── Build & Validate ──────────────────────────
            product = ScrapedProduct(
                product_name=product_name,
                category=category,
                description=description,
                features=features,
                eligibility=eligibility,
                brochure_url=brochure_url,
                source_url=url,
            )

            console.print(f"  [green]✅ {product_name}[/green] ({len(features)} features)")
            return product

        except Exception as e:
            console.print(f"  [red]❌ Failed to scrape {url}: {e}[/red]")
            return None
        finally:
            await page.close()

    async def scrape_all(self) -> list[ScrapedProduct]:
        """
        Main entry point — scrapes all categories and all products.
        Returns list of validated ScrapedProduct objects.
        """
        console.print("\n[bold cyan]🕷️  Starting ICICI Pru Product Scraper[/bold cyan]\n")
        await self.start()

        all_products = []

        with Progress() as progress:
            task = progress.add_task(
                "Scraping categories...", total=len(CATEGORY_URLS)
            )

            for category, url in CATEGORY_URLS.items():
                product_urls = await self.scrape_category_page(category, url)

                for purl in product_urls:
                    product = await self.scrape_product_page(purl, category)
                    if product:
                        all_products.append(product)

                    # Be polite — wait between requests
                    await asyncio.sleep(1.5)

                progress.update(task, advance=1)

        await self.close()
        self.products = all_products
        console.print(
            f"\n[bold green]🎉 Scraped {len(all_products)} products total![/bold green]"
        )
        return all_products

    def save_to_json(self, filepath: str = "data/scraped_products.json"):
        """Save scraped products to a JSON file."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        data = [p.model_dump(mode="json") for p in self.products]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str, ensure_ascii=False)
        console.print(f"[green]💾 Saved {len(data)} products → {filepath}[/green]")


# ── CLI Entry Point ───────────────────────────────────────
async def main():
    scraper = ICICIPruScraper(headless=True)
    products = await scraper.scrape_all()
    scraper.save_to_json()

    # Print summary
    console.print("\n[bold]📊 Scrape Summary:[/bold]")
    from collections import Counter
    cats = Counter(p.category.value for p in products)
    for cat, count in cats.most_common():
        console.print(f"  {cat}: {count}")


if __name__ == "__main__":
    asyncio.run(main())