# Quick test script — save as backend/tests/test_supabase.py
import os
from dotenv import load_dotenv
from supabase import create_client
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
db = create_client(url, key)
# Fetch products
result = db.table("products").select("*").execute()
print(f"[OK] Connected! Found {len(result.data)} products")
for p in result.data:
    print(f" -> {p['product_name']} ({p['category']})")