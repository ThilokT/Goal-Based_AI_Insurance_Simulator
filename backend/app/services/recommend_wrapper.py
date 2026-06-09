"""
Recommend wrapper — wraps P3's ProductMatcher + RankingService for /api/recommend.

Matches user goals to products via vector similarity, then ranks them.
"""
import logging
from ai_services.product_matcher import ProductMatcher
from ai_services.ranking_service import RankingService
from ai_services.simulation_engine import SimulationEngine
from ai_services.guardrails import Guardrails
from ai_services.models import FinancialGoal, UserProfile

logger = logging.getLogger("lifemap.recommend")

# Singletons
_matcher = None
_ranker = None
_engine = None
_guardrails = None


def _get_matcher() -> ProductMatcher:
    global _matcher
    if _matcher is None:
        _matcher = ProductMatcher()
    return _matcher


def _get_ranker() -> RankingService:
    global _ranker
    if _ranker is None:
        _ranker = RankingService()
    return _ranker


def _get_engine() -> SimulationEngine:
    global _engine
    if _engine is None:
        _engine = SimulationEngine()
    return _engine


def _get_guardrails() -> Guardrails:
    global _guardrails
    if _guardrails is None:
        _guardrails = Guardrails()
    return _guardrails


def get_recommendations(request_data: dict) -> dict:
    """
    Get ranked product recommendations for user goals.

    Args:
        request_data: dict with keys: goals (list[dict]), age, risk_appetite, n_results_per_goal.

    Returns:
        dict with ranked recommendations + disclaimers.
    """
    matcher = _get_matcher()
    ranker = _get_ranker()
    engine = _get_engine()
    guardrails = _get_guardrails()

    # Build goals from request
    goals = [
        FinancialGoal(
            goal_type=g["goal_type"],
            target_amount=g["target_amount"],
            target_year=g["target_year"],
            priority=g.get("priority", 1),
            monthly_contribution=g.get("monthly_contribution"),
        )
        for g in request_data["goals"]
    ]

    n_results = request_data.get("n_results_per_goal", 3)

    # Step 1: Match products via P3's ProductMatcher (vector similarity)
    matches = matcher.match_products(goals, n_results_per_goal=n_results)

    # Step 2: Run simulation to get coverage data for ranking
    profile = UserProfile(
        age=request_data.get("age", 30),
        risk_appetite=request_data.get("risk_appetite", "moderate"),
        goals=goals,
    )
    simulation = engine.simulate_all_goals(profile)

    # Step 3: Rank products via P3's RankingService
    ranked = ranker.rank_products(simulation, matches)

    # Step 4: Validate with guardrails
    guardrail_result = guardrails.validate_products(ranked)

    return {
        "recommendations": [r.model_dump() for r in ranked],
        "total": len(ranked),
        "disclaimers": guardrail_result.disclaimers,
    }
