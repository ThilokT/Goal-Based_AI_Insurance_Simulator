import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    os.makedirs("data/brochures", exist_ok=True)
    async with async_playwright() as p:
        # Launching headless to test if it works in background
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()
        print("Navigating...")
        await page.goto("https://www.iciciprulife.com/insurance-plans/buy-life-insurance-online.html", timeout=60000)
        await page.wait_for_timeout(5000)
        
        try:
            print("Trying to find and click a Brochure link...")
            # Let's find ANY visible Brochure link
            brochure_btn = page.locator("a:has-text('Brochure')").first
            
            if await brochure_btn.is_visible():
                print("Found Brochure button! Clicking and waiting for download...")
                async with page.expect_download(timeout=30000) as download_info:
                    await brochure_btn.click()
                
                download = await download_info.value
                file_path = f"data/brochures/{download.suggested_filename}"
                await download.save_as(file_path)
                print(f"✅ Success! Downloaded: {file_path}")
            else:
                print("❌ No visible Brochure button found.")
                
        except Exception as e:
            print(f"Error during download interception: {e}")
            
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
