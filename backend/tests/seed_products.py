import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
db = create_client(url, key)

# Define mock products
mock_products = [
    {
        "product_name": "Basic Term Life",
        "category": "term_insurance",
        "description": "A simple 10-year term life insurance policy."
    },
    {
        "product_name": "Premium Auto Protect",
        "category": "ulip",
        "description": "Comprehensive auto insurance with collision coverage."
    },
    {
        "product_name": "Family Health Plus",
        "category": "health",
        "description": "Family-wide health coverage including dental and vision."
    }
]

# Insert products
print("Inserting mock products...")
try:
    # Try inserting with description
    result = db.table("products").insert(mock_products).execute()
    print(f"[OK] Inserted {len(result.data)} products successfully.")
except Exception as e:
    print(f"Error with full data: {e}")
    # If description doesn't exist, try just name and category
    try:
        fallback_products = [{"product_name": p["product_name"], "category": p["category"]} for p in mock_products]
        result = db.table("products").insert(fallback_products).execute()
        print(f"[OK] Inserted {len(result.data)} products successfully (name and category only).")
    except Exception as e2:
        print(f"Fallback insert failed: {e2}")

# Verify by fetching
result = db.table("products").select("*").execute()
print(f"\nVerification - Found {len(result.data)} total products in table:")
for p in result.data:
    print(f" -> {p.get('product_name')} ({p.get('category')})")
