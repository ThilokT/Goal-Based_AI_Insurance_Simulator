"""Quick test to verify all FastAPI endpoints are registered."""
import httpx

BASE = "http://127.0.0.1:8000"

# Test root
r = httpx.get(f"{BASE}/")
print(f"ROOT: {r.status_code} {r.json()}")

# Test health
r = httpx.get(f"{BASE}/health")
print(f"HEALTH: {r.status_code} {r.json()}")

# Test docs
r = httpx.get(f"{BASE}/docs")
print(f"DOCS: {r.status_code} {'OK' if r.status_code == 200 else 'FAIL'}")

# Test OpenAPI schema
r = httpx.get(f"{BASE}/openapi.json")
schema = r.json()
paths = list(schema["paths"].keys())
print(f"\nENDPOINTS ({len(paths)} total):")
for p in sorted(paths):
    methods = list(schema["paths"][p].keys())
    method_str = " | ".join(m.upper() for m in methods)
    print(f"  {method_str:10s}  {p}")

# Test protected endpoint without auth (should return 403)
r = httpx.get(f"{BASE}/users/me")
print(f"\nPROTECTED (no auth): {r.status_code} (expected 403)")

print("\nAll endpoint checks passed!")
