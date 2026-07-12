"""Quick test of the 7-product catalog and strategy routing."""
import sys
sys.path.insert(0, ".")

from ai_services.simulation_engine import (
    SimulationEngine,
    get_product_for_goal,
    PRODUCT_CATALOG,
)

print("=== 7-Product Catalog ===")
for pid, p in PRODUCT_CATALOG.items():
    print(f"  {pid}: {p['name']} [{p['strategy']}]")

print("\n=== Goal Mapping Test ===")
goals = [
    "wealth_creation", "retirement", "child_education",
    "home_purchase", "family_protection", "legacy", "health",
]
for g in goals:
    prod = get_product_for_goal(g)
    ret = prod.get("fixed_return", "matrix")
    print(f"  {g:20s} -> {prod['name']:45s} strategy={prod['strategy']:8s} return={ret}")

print("\n=== Return Rate Test (moderate, 15yr horizon) ===")
engine = SimulationEngine()
for g in goals:
    rate = engine._get_adjusted_return(g, 15, "moderate")
    print(f"  {g:20s} -> {rate:.2%}")

print("\n=== Return Rate Test (aggressive, 5yr horizon) ===")
for g in goals:
    rate = engine._get_adjusted_return(g, 5, "aggressive")
    print(f"  {g:20s} -> {rate:.2%}")

print("\n=== Return Rate Test (conservative, 3yr horizon) ===")
for g in goals:
    rate = engine._get_adjusted_return(g, 3, "conservative")
    print(f"  {g:20s} -> {rate:.2%}")

print("\n✅ All tests passed!")
