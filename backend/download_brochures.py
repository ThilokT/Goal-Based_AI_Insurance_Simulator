import asyncio
from playwright.async_api import async_playwright
import httpx
from pathlib import Path

async def main():
    url = "https://www.iciciprulife.com/insurance-plans/buy-life-insurance-online.html?UID-1403"
    
    brochures_dir = Path("data/brochures")
    brochures_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Starting browser to navigate to {url}...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=60000)
            print("Page loaded. Extracting links...")
            await page.wait_for_timeout(3000)
            
            # Find all links on the page that end in .pdf or contain 'brochure' in text
            links = await page.evaluate('''() => {
                const anchors = Array.from(document.querySelectorAll('a'));
                return anchors
                    .filter(a => a.href.toLowerCase().includes('.pdf'))
                    .map(a => a.href);
            }''')
            
            # Filter out empty and get unique valid links
            unique_links = list(set([l for l in links if l and l.startswith("http")]))
            print(f"Found {len(unique_links)} unique PDF links hidden in the page.")
            
            # Download the first 5 unique PDFs found
            async with httpx.AsyncClient(verify=False) as client:
                for i, href in enumerate(unique_links[:5]):
                    print(f"Downloading {i+1}/5: {href}")
                    try:
                        resp = await client.get(href, timeout=30.0)
                        if resp.status_code == 200:
                            filename = href.split('/')[-1].split('?')[0]
                            if not filename.endswith('.pdf'):
                                filename = f"plan_{i+1}.pdf"
                            
                            file_path = brochures_dir / filename
                            with open(file_path, "wb") as f:
                                f.write(resp.content)
                            print(f"Successfully saved to {file_path}")
                        else:
                            print(f"Failed. Status: {resp.status_code}")
                    except Exception as e:
                        print(f"Error downloading {href}: {e}")
                        
        except Exception as e:
            print(f"Error: {e}")
            
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
