"""
Scenario wrapper — wraps P3's WhatIfEngine for /api/scenarios.

Handles both predefined templates and custom what-if parameters.
"""
import logging
from ai_services.whatif_engine import WhatIfEngine
from ai_services.models import FinancialGoal, UserProfile, WhatIfScenario

logger = logging.getLogger("lifemap.scenarios")

_whatif = None


def get_whatif_engine() -> WhatIfEngine:
    global _whatif
    if _whatif is None:
        _whatif = WhatIfEngine()
    return _whatif


def run_scenario(request_data: dict) -> dict:
    """
    Run a what-if scenario comparison.

    Args:
        request_data: dict with:
            - profile: user profile + goals (same as SimulateRequest)
            - template: optional predefined template key
            - custom_params: optional dict of parameter overrides
            - scenario_name: optional display name

    Returns:
        dict with baseline, modified, deltas, and summary.
    """
    whatif = get_whatif_engine()

    profile_data = request_data["profile"]

    # Build UserProfile
    goals = [
        FinancialGoal(
            goal_type=g["goal_type"],
            target_amount=g["target_amount"],
            target_year=g["target_year"],
            priority=g.get("priority", 1),
            monthly_contribution=g.get("monthly_contribution"),
        )
        for g in profile_data["goals"]
    ]

    profile = UserProfile(
        age=profile_data["age"],
        annual_income=profile_data.get("annual_income"),
        monthly_expenses=profile_data.get("monthly_expenses"),
        dependents=profile_data.get("dependents"),
        risk_appetite=profile_data.get("risk_appetite", "moderate"),
        goals=goals,
    )

    # Run template or custom scenario
    template = request_data.get("template")
    if template:
        result = whatif.run_template(profile, template)
    else:
        custom_params = request_data.get("custom_params", {})
        scenario_name = request_data.get("scenario_name", "Custom Scenario")
        scenario = WhatIfScenario(
            scenario_name=scenario_name,
            modified_params=custom_params,
        )
        result = whatif.run_scenario(profile, scenario)

    # Serialize
    return {
        "scenario_name": result.scenario_name,
        "baseline": {
            "user_age": result.baseline.user_age,
            "total_monthly_savings_required": result.baseline.total_monthly_savings_required,
            "total_gap": result.baseline.total_gap,
            "goals": [g.model_dump() for g in result.baseline.goals],
        },
        "modified": {
            "user_age": result.modified.user_age,
            "total_monthly_savings_required": result.modified.total_monthly_savings_required,
            "total_gap": result.modified.total_gap,
            "goals": [g.model_dump() for g in result.modified.goals],
        },
        "delta_monthly_savings": result.delta_monthly_savings,
        "delta_total_gap": result.delta_total_gap,
        "summary": result.summary,
    }


def list_templates() -> list[dict]:
    """Return the list of available what-if templates."""
    whatif = get_whatif_engine()
    return whatif.list_templates()
