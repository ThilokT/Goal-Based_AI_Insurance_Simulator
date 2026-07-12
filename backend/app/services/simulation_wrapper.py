"""
Simulation wrapper — wraps SimulationEngine + Guardrails for /api/simulate.

Builds UserProfile from request data, runs simulation with what-if params,
validates with guardrails, and attaches product recommendations per goal.
"""
import logging
from ai_services.simulation_engine import SimulationEngine, get_product_for_goal
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

    Accepts what-if parameters:
      - inflation_rate: Override inflation rate
      - existing_savings: Lump sum already saved
      - annual_increment_percent: Annual SIP step-up rate
      - retirement_age: Target retirement age
      - child_education_abroad: 2.2x multiplier for education goals
      - expected_return_override: Override expected return rate

    Returns:
        dict with simulation results, product recommendations,
        and guardrail disclaimers/warnings.
    """
    engine = get_engine()
    guardrails = get_guardrails()

    # Build goals
    goals = [
        FinancialGoal(
            goal_type=g["goal_type"],
            target_amount=g["target_amount"],
            target_year=g["target_year"],
            priority=g.get("priority", 1),
            monthly_contribution=g.get("monthly_contribution"),
            existing_savings=g.get("existing_savings"),
            risk_override=g.get("risk_override"),
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

    # Extract what-if overrides
    inflation_override = request_data.get("inflation_rate")
    existing_savings = request_data.get("existing_savings", 0.0) or 0.0
    annual_increment = request_data.get("annual_increment_percent", 0.0) or 0.0
    retirement_age = request_data.get("retirement_age", 60)
    child_education_abroad = request_data.get("child_education_abroad", False)
    return_override = request_data.get("expected_return_override")
    enable_sip = request_data.get("enable_sip", True)

    # Run simulation with what-if params
    result = engine.simulate_all_goals(
        profile,
        existing_savings=existing_savings,
        annual_increment=annual_increment,
        inflation_override=inflation_override,
        return_override=return_override,
        child_education_abroad=child_education_abroad,
        retirement_age_override=retirement_age,
        enable_sip=enable_sip,
    )

    # Validate with guardrails
    guardrail_result = guardrails.validate_simulation(result)

    # Build response with product recommendations
    goal_dicts = []
    for g in result.goals:
        goal_data = g.model_dump()
        # Attach recommended product
        product = get_product_for_goal(g.goal_type)
        goal_data["recommended_product_name"] = product["name"]
        goal_data["recommended_product_category"] = product["category"]
        goal_data["recommended_product_id"] = product["id"]
        goal_dicts.append(goal_data)

    return {
        "user_age": result.user_age,
        "total_monthly_savings_required": result.total_monthly_savings_required,
        "total_gap": result.total_gap,
        "goals": goal_dicts,
        "disclaimers": guardrail_result.disclaimers,
        "warnings": guardrail_result.warnings,
        "timestamp": result.timestamp.isoformat() if result.timestamp else None,
    }
