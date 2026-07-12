import asyncio
import sys
import json
sys.path.insert(0, ".")

from app.services.product_service import ProductService

async def main():
    service = ProductService()
    res = service.list_products(limit=1)
    if res['products']:
        print(json.dumps(res['products'][0], indent=2))

if __name__ == "__main__":
    asyncio.run(main())
