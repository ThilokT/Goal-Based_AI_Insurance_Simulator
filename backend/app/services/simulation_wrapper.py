"""
Simulation wrapper — wraps P3's SimulationEngine + Guardrails for /api/simulate.

Builds UserProfile from request data, runs simulation, validates with guardrails.
"""
import logging
from ai_services.simulation_engine import SimulationEngine
from ai_services.guardrails import Guardrails
from ai_services.models import FinancialGoal, UserProfile

logger = logging.getLogger("lifemap.simulate")

# Singleton instances
_engine = None
_guardrails = None


def get_engine() -> SimulationEngine:
    global _engine
    if _engine is None:
        _engine = SimulationEngine()
    return _engine


def get_guardrails() -> Guardrails:
    global _guardrails
    if _guardrails is None:
        _guardrails = Guardrails()
    return _guardrails


def run_simulation(request_data: dict) -> dict:
    """
    Run a multi-goal simulation from API request data.

    Args:
        request_data: dict with keys: age, goals (list), optional profile fields.

    Returns:
        dict with simulation results + guardrail disclaimers/warnings.
    """
    engine = get_engine()
    guardrails = get_guardrails()

    # Build P3's UserProfile model
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

    profile = UserProfile(
        age=request_data["age"],
        annual_income=request_data.get("annual_income"),
        monthly_expenses=request_data.get("monthly_expenses"),
        dependents=request_data.get("dependents"),
        risk_appetite=request_data.get("risk_appetite", "moderate"),
        goals=goals,
    )

    # Run simulation via P3's engine
    result = engine.simulate_all_goals(profile)

    # Validate with guardrails
    guardrail_result = guardrails.validate_simulation(result)

    # Convert to serializable dict
    return {
        "user_age": result.user_age,
        "total_monthly_savings_required": result.total_monthly_savings_required,
        "total_gap": result.total_gap,
        "goals": [g.model_dump() for g in result.goals],
        "disclaimers": guardrail_result.disclaimers,
        "warnings": guardrail_result.warnings,
        "timestamp": result.timestamp.isoformat() if result.timestamp else None,
    }
