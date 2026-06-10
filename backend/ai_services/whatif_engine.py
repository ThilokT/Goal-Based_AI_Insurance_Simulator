"""
What-If Engine — Parameter Tweaking & Recalculation Pipeline.

Accepts baseline simulation parameters, applies user-defined tweaks
(e.g., higher savings, delayed retirement, different inflation),
and outputs a side-by-side comparison of baseline vs. modified results.

Usage:
    from ai_services.whatif_engine import WhatIfEngine
    engine = WhatIfEngine()
    result = engine.run_scenario(profile, scenario)
"""
from copy import deepcopy
from datetime import datetime

from rich.console import Console
from rich.table import Table

from ai_services.models import (
    UserProfile,
    FinancialGoal,
    MultiGoalSimulationResult,
    WhatIfScenario,
    WhatIfResult,
)
from ai_services.simulation_engine import SimulationEngine

console = Console()

# ── Predefined Scenario Templates ─────────────────────────

SCENARIO_TEMPLATES = {
    "delay_retirement_5y": {
        "name": "Delay Retirement by 5 Years",
        "description": "What if you retire 5 years later?",
        "modifier": lambda profile, engine: _delay_retirement(profile, engine, 5),
    },
    "increase_savings_20pct": {
        "name": "Increase Monthly Savings by 20%",
        "description": "What if you save 20% more each month?",
        "modifier": lambda profile, engine: _increase_savings(profile, 0.20),
    },
    "increase_savings_50pct": {
        "name": "Increase Monthly Savings by 50%",
        "description": "What if you save 50% more each month?",
        "modifier": lambda profile, engine: _increase_savings(profile, 0.50),
    },
    "higher_inflation": {
        "name": "Higher Inflation (8%)",
        "description": "What if inflation rises to 8%?",
        "modifier": lambda profile, engine: _set_inflation(engine, 0.08),
    },
    "lower_returns": {
        "name": "Conservative Returns (7%)",
        "description": "What if market returns are only 7%?",
        "modifier": lambda profile, engine: _set_returns(engine, 0.07),
    },
    "add_emergency_fund": {
        "name": "Add Emergency Fund Goal",
        "description": "What if you also build a 6-month emergency fund?",
        "modifier": lambda profile, engine: _add_emergency_fund(profile),
    },
}


# ── Modifier Functions ────────────────────────────────────

def _delay_retirement(profile: UserProfile, engine: SimulationEngine, years: int) -> tuple:
    """Delay retirement by N years."""
    new_profile = deepcopy(profile)
    new_engine = deepcopy(engine)
    new_engine.retirement_age += years
    for goal in new_profile.goals:
        if goal.goal_type == "retirement":
            goal.target_year += years
    return new_profile, new_engine


def _increase_savings(profile: UserProfile, pct_increase: float) -> tuple:
    """Increase all monthly contributions by a percentage."""
    new_profile = deepcopy(profile)
    for goal in new_profile.goals:
        if goal.monthly_contribution:
            goal.monthly_contribution *= (1 + pct_increase)
    return new_profile, None


def _set_inflation(engine: SimulationEngine, rate: float) -> tuple:
    """Override the inflation rate."""
    new_engine = deepcopy(engine)
    new_engine.inflation_rate = rate
    return None, new_engine


def _set_returns(engine: SimulationEngine, rate: float) -> tuple:
    """Override the expected return rate."""
    new_engine = deepcopy(engine)
    new_engine.expected_return = rate
    return None, new_engine


def _add_emergency_fund(profile: UserProfile) -> tuple:
    """Add a 6-month emergency fund goal."""
    new_profile = deepcopy(profile)
    monthly_expenses = profile.monthly_expenses or 50_000
    emergency_amount = monthly_expenses * 6

    new_profile.goals.append(FinancialGoal(
        goal_type="emergency_fund",
        target_amount=emergency_amount,
        target_year=datetime.now().year + 2,
        priority=1,
        notes="6-month emergency fund",
    ))
    return new_profile, None


class WhatIfEngine:
    """
    What-If Recalculation Pipeline.

    Compares a baseline simulation against modified scenarios to
    help users understand the impact of financial decisions.

    This is a standalone class. P2 wraps it in `/api/scenarios`.
    """

    def __init__(self, simulation_engine: SimulationEngine | None = None):
        """
        Initialize the What-If engine.

        Args:
            simulation_engine: Base simulation engine instance.
                               If None, creates a default one.
        """
        self.engine = simulation_engine or SimulationEngine()

    def run_scenario(
        self,
        profile: UserProfile,
        scenario: WhatIfScenario,
    ) -> WhatIfResult:
        """
        Run a what-if scenario by applying parameter tweaks and comparing.

        Args:
            profile: The user's current profile.
            scenario: The what-if scenario with modified parameters.

        Returns:
            WhatIfResult with baseline vs. modified comparison.
        """
        console.print(
            f"\n[bold cyan]🔮 Running What-If: '{scenario.scenario_name}'[/bold cyan]"
        )

        # Step 1: Run baseline simulation
        baseline = self.engine.simulate_all_goals(profile)

        # Step 2: Apply modifications
        modified_profile = deepcopy(profile)
        modified_engine = deepcopy(self.engine)

        params = scenario.modified_params

        # Apply parameter overrides
        if "inflation_rate" in params:
            modified_engine.inflation_rate = params["inflation_rate"]
        if "expected_return" in params:
            modified_engine.expected_return = params["expected_return"]
        if "retirement_age" in params:
            modified_engine.retirement_age = params["retirement_age"]
        if "life_expectancy" in params:
            modified_engine.life_expectancy = params["life_expectancy"]
        if "savings_increase_pct" in params:
            for goal in modified_profile.goals:
                if goal.monthly_contribution:
                    goal.monthly_contribution *= (1 + params["savings_increase_pct"])
        if "remove_goal" in params:
            modified_profile.goals = [
                g for g in modified_profile.goals
                if g.goal_type != params["remove_goal"]
            ]
        if "add_goal" in params:
            try:
                new_goal = FinancialGoal(**params["add_goal"])
                modified_profile.goals.append(new_goal)
            except Exception as e:
                console.print(f"[yellow]⚠️  Could not add goal: {e}[/yellow]")

        # Step 3: Run modified simulation
        modified = modified_engine.simulate_all_goals(modified_profile)

        # Step 4: Compute deltas
        delta_savings = (
            modified.total_monthly_savings_required
            - baseline.total_monthly_savings_required
        )
        delta_gap = modified.total_gap - baseline.total_gap

        # Step 5: Generate summary
        summary = self._generate_summary(
            scenario.scenario_name, baseline, modified, delta_savings, delta_gap
        )

        result = WhatIfResult(
            scenario_name=scenario.scenario_name,
            baseline=baseline,
            modified=modified,
            delta_monthly_savings=round(delta_savings, 2),
            delta_total_gap=round(delta_gap, 2),
            summary=summary,
        )

        self._print_comparison(result)
        return result

    def run_template(
        self,
        profile: UserProfile,
        template_key: str,
    ) -> WhatIfResult:
        """
        Run a predefined scenario template.

        Args:
            profile: User profile.
            template_key: Key from SCENARIO_TEMPLATES.

        Returns:
            WhatIfResult.
        """
        if template_key not in SCENARIO_TEMPLATES:
            available = ", ".join(SCENARIO_TEMPLATES.keys())
            raise ValueError(
                f"Unknown template '{template_key}'. Available: {available}"
            )

        template = SCENARIO_TEMPLATES[template_key]
        console.print(
            f"\n[bold cyan]🔮 Template: '{template['name']}'[/bold cyan]"
        )

        # Run baseline
        baseline = self.engine.simulate_all_goals(profile)

        # Apply template modifier
        modified_profile, modified_engine = template["modifier"](profile, self.engine)
        final_profile = modified_profile or profile
        final_engine = modified_engine or self.engine

        # Run modified simulation
        modified = final_engine.simulate_all_goals(final_profile)

        delta_savings = (
            modified.total_monthly_savings_required
            - baseline.total_monthly_savings_required
        )
        delta_gap = modified.total_gap - baseline.total_gap

        summary = self._generate_summary(
            template["name"], baseline, modified, delta_savings, delta_gap
        )

        result = WhatIfResult(
            scenario_name=template["name"],
            baseline=baseline,
            modified=modified,
            delta_monthly_savings=round(delta_savings, 2),
            delta_total_gap=round(delta_gap, 2),
            summary=summary,
        )

        self._print_comparison(result)
        return result

    def list_templates(self) -> list[dict]:
        """Return available scenario templates."""
        return [
            {"key": k, "name": v["name"], "description": v["description"]}
            for k, v in SCENARIO_TEMPLATES.items()
        ]

    # ── Summary & Display ─────────────────────────────────

    def _generate_summary(
        self,
        scenario_name: str,
        baseline: MultiGoalSimulationResult,
        modified: MultiGoalSimulationResult,
        delta_savings: float,
        delta_gap: float,
    ) -> str:
        """Generate a human-readable comparison summary."""
        parts = [f"Scenario: {scenario_name}"]

        if delta_savings < 0:
            parts.append(
                f"✅ Monthly savings requirement decreases by ₹{abs(delta_savings):,.0f}"
            )
        elif delta_savings > 0:
            parts.append(
                f"⚠️ Monthly savings requirement increases by ₹{delta_savings:,.0f}"
            )
        else:
            parts.append("Monthly savings requirement unchanged")

        if delta_gap < 0:
            parts.append(
                f"✅ Total funding gap reduces by ₹{abs(delta_gap):,.0f}"
            )
        elif delta_gap > 0:
            parts.append(
                f"⚠️ Total funding gap increases by ₹{delta_gap:,.0f}"
            )
        else:
            parts.append("Total funding gap unchanged")

        return " | ".join(parts)

    def _print_comparison(self, result: WhatIfResult):
        """Print a rich comparison table."""
        table = Table(title=f"What-If: {result.scenario_name}")
        table.add_column("Metric", style="cyan")
        table.add_column("Baseline", style="white")
        table.add_column("Modified", style="yellow")
        table.add_column("Delta", style="green")

        table.add_row(
            "Monthly Savings Required",
            f"₹{result.baseline.total_monthly_savings_required:,.0f}",
            f"₹{result.modified.total_monthly_savings_required:,.0f}",
            f"₹{result.delta_monthly_savings:+,.0f}",
        )
        table.add_row(
            "Total Gap",
            f"₹{result.baseline.total_gap:,.0f}",
            f"₹{result.modified.total_gap:,.0f}",
            f"₹{result.delta_total_gap:+,.0f}",
        )
        table.add_row(
            "Number of Goals",
            str(len(result.baseline.goals)),
            str(len(result.modified.goals)),
            "",
        )

        console.print(table)
        console.print(f"\n[dim]{result.summary}[/dim]\n")


# ── CLI Entry Point ───────────────────────────────────────
def main():
    """Test what-if scenarios."""
    from ai_services.models import UserProfile, FinancialGoal

    profile = UserProfile(
        age=30,
        annual_income=1_500_000,
        monthly_expenses=50_000,
        dependents=2,
        risk_appetite="moderate",
        goals=[
            FinancialGoal(
                goal_type="child_education",
                target_amount=2_500_000,
                target_year=2040,
                priority=1,
                monthly_contribution=10_000,
            ),
            FinancialGoal(
                goal_type="retirement",
                target_amount=30_000_000,
                target_year=2056,
                priority=2,
                monthly_contribution=20_000,
            ),
        ],
    )

    engine = WhatIfEngine()

    # Run predefined templates
    console.print("\n[bold]Available Templates:[/bold]")
    for t in engine.list_templates():
        console.print(f"  • {t['key']}: {t['description']}")

    engine.run_template(profile, "delay_retirement_5y")
    engine.run_template(profile, "increase_savings_50pct")


if __name__ == "__main__":
    main()
