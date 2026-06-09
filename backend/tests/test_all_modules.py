"""Quick test script for all AI/ML modules (Phases 1-3)."""
import sys
import io

# Fix Windows encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from ai_services.models import FinancialGoal, UserProfile, ProductMatch, SimulationResult
from ai_services.simulation_engine import SimulationEngine
from ai_services.whatif_engine import WhatIfEngine
from ai_services.ranking_service import RankingService
from ai_services.guardrails import Guardrails
from ai_services.vectorstore import ProductVectorStore
from ai_services.product_matcher import ProductMatcher
from ai_services.models import WhatIfScenario

PASSED = 0
FAILED = 0


def test(name, fn):
    global PASSED, FAILED
    try:
        fn()
        print(f"  PASS: {name}")
        PASSED += 1
    except Exception as e:
        print(f"  FAIL: {name} -> {e}")
        FAILED += 1


# ── 1. Simulation Engine ────────────────────────────────

print("\n=== 1. Simulation Engine ===")

engine = SimulationEngine()

def test_future_value():
    fv = engine.future_value(100_000, 0.06, 10)
    assert 179_000 < fv < 180_000, f"FV={fv}"

def test_sip_required():
    sip = engine.monthly_sip_required(10_000_000, 0.10, 20)
    assert 10_000 < sip < 20_000, f"SIP={sip}"

def test_single_goal():
    goal = FinancialGoal(goal_type="retirement", target_amount=10_000_000, target_year=2050, priority=1)
    result = engine.simulate_goal(goal, user_age=30)
    assert result.future_value > 0
    assert 0 <= result.coverage_ratio <= 1

def test_multi_goal():
    profile = UserProfile(
        age=30, annual_income=1_500_000, monthly_expenses=50_000,
        goals=[
            FinancialGoal(goal_type="child_education", target_amount=2_500_000, target_year=2040, priority=1, monthly_contribution=10_000),
            FinancialGoal(goal_type="retirement", target_amount=30_000_000, target_year=2056, priority=2, monthly_contribution=20_000),
        ],
    )
    result = engine.simulate_all_goals(profile)
    assert len(result.goals) == 2
    assert result.total_monthly_savings_required > 0

test("future_value calculation", test_future_value)
test("monthly_sip_required", test_sip_required)
test("single goal simulation", test_single_goal)
test("multi-goal simulation", test_multi_goal)


# ── 2. What-If Engine ────────────────────────────────────

print("\n=== 2. What-If Engine ===")

whatif = WhatIfEngine()
profile = UserProfile(
    age=30, annual_income=1_500_000, monthly_expenses=50_000,
    goals=[
        FinancialGoal(goal_type="child_education", target_amount=2_500_000, target_year=2040, priority=1, monthly_contribution=10_000),
        FinancialGoal(goal_type="retirement", target_amount=30_000_000, target_year=2056, priority=2, monthly_contribution=20_000),
    ],
)

def test_whatif_template():
    result = whatif.run_template(profile, "delay_retirement_5y")
    assert result.scenario_name == "Delay Retirement by 5 Years"
    assert result.baseline is not None
    assert result.modified is not None

def test_whatif_custom():
    scenario = WhatIfScenario(
        scenario_name="Higher Inflation Test",
        modified_params={"inflation_rate": 0.08}
    )
    result = whatif.run_scenario(profile, scenario)
    assert result.delta_total_gap != 0

def test_list_templates():
    templates = whatif.list_templates()
    assert len(templates) >= 5

test("template scenario", test_whatif_template)
test("custom scenario", test_whatif_custom)
test("list templates", test_list_templates)


# ── 3. Ranking Service ───────────────────────────────────

print("\n=== 3. Ranking Service ===")

ranker = RankingService()

def test_ranking():
    sim = engine.simulate_all_goals(profile)
    matches = [
        ProductMatch(product_name="ICICI Pru Smart Kid", product_id="icici-pru-smart-kid", category="child", similarity_score=0.92, matched_goals=["child_education"], description="Child plan", key_benefits=["Waiver"]),
        ProductMatch(product_name="ICICI Pru Easy Retirement", product_id="icici-pru-easy-retirement", category="retirement", similarity_score=0.88, matched_goals=["retirement"], description="Pension plan", key_benefits=["Boosters"]),
        ProductMatch(product_name="ICICI Pru Signature", product_id="icici-pru-signature", category="ulip", similarity_score=0.85, matched_goals=["child_education", "retirement"], description="ULIP", key_benefits=["Zero charges"]),
    ]
    ranked = ranker.rank_products(sim, matches)
    assert len(ranked) == 3
    assert ranked[0].rank == 1
    assert ranked[0].composite_score >= ranked[1].composite_score

test("product ranking", test_ranking)


# ── 4. Guardrails ─────────────────────────────────────────

print("\n=== 4. Guardrails ===")

guardrails = Guardrails(known_product_ids=["icici-pru-smart-kid", "icici-pru-easy-retirement"])

def test_simulation_guardrails():
    sim = engine.simulate_all_goals(profile)
    result = guardrails.validate_simulation(sim)
    assert result.is_valid
    assert len(result.disclaimers) > 0

def test_product_guardrails():
    products_to_validate = ranker.rank_products(engine.simulate_all_goals(profile), [
        ProductMatch(product_name="ICICI Pru Smart Kid", product_id="icici-pru-smart-kid", category="child", similarity_score=0.92, matched_goals=["child_education"], description="Child plan"),
        ProductMatch(product_name="Unknown Product", product_id="unknown-id", category="other", similarity_score=0.5, matched_goals=["test"], description="Unknown"),
    ])
    result = guardrails.validate_products(products_to_validate)
    assert len(result.warnings) > 0  # unknown-id should trigger warning

def test_fallback_utility():
    result = Guardrails.with_fallback(
        primary_fn=lambda: "primary_result",
        fallback_fn=lambda: "fallback_result",
    )
    assert result == "primary_result"

test("simulation guardrails", test_simulation_guardrails)
test("product guardrails", test_product_guardrails)
test("fallback utility", test_fallback_utility)


# ── 5. VectorStore + Product Matcher ──────────────────────

print("\n=== 5. VectorStore & Product Matcher ===")

def test_vectorstore_search():
    store = ProductVectorStore()
    results = store.search_products("child education savings plan", n_results=3)
    assert len(results) > 0
    assert results[0].similarity_score > 0.5

def test_product_matcher():
    matcher = ProductMatcher()
    goals = [
        FinancialGoal(goal_type="child_education", target_amount=2_500_000, target_year=2040, priority=1),
        FinancialGoal(goal_type="retirement", target_amount=30_000_000, target_year=2056, priority=2),
    ]
    matches = matcher.match_products(goals, n_results_per_goal=2)
    assert len(matches) > 0

test("vectorstore search", test_vectorstore_search)
test("product matcher", test_product_matcher)


# ── 6. Pipeline (seed mode) ──────────────────────────────

print("\n=== 6. Pipeline (seed data) ===")

def test_pipeline_seed():
    from ai_services.pipeline import DataPipeline
    pipeline = DataPipeline(use_seed=True)
    data = pipeline.load_seed_data()
    assert len(data) >= 7
    validated = pipeline.validate_products(data)
    assert len(validated) >= 5  # at least some should pass

test("pipeline seed load + validate", test_pipeline_seed)


# ── Summary ───────────────────────────────────────────────

print(f"\n{'='*50}")
print(f"RESULTS: {PASSED} passed, {FAILED} failed out of {PASSED+FAILED} tests")
print(f"{'='*50}")
