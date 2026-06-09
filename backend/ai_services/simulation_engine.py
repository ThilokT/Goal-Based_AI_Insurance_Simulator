"""
Financial Simulation Engine — Corpus, Inflation, & Gap Analysis.

Standalone NumPy-based engine for goal-based financial planning.
Calculates future corpus requirements, inflation-adjusted targets,
monthly savings needed, and identifies coverage gaps.

Supports both single-goal and multi-goal simulations.

Usage:
    from ai_services.simulation_engine import SimulationEngine
    engine = SimulationEngine()
    result = engine.simulate_goal(goal, user_age=30)
"""
import numpy as np
from datetime import datetime
from typing import Optional

from rich.console import Console

from ai_services.config import (
    DEFAULT_INFLATION_RATE,
    DEFAULT_RETURN_RATE,
    DEFAULT_RISK_FREE_RATE,
    DEFAULT_RETIREMENT_AGE,
    DEFAULT_LIFE_EXPECTANCY,
)
from ai_services.models import (
    FinancialGoal,
    SimulationResult,
    MultiGoalSimulationResult,
    UserProfile,
)

console = Console()


class SimulationEngine:
    """
    NumPy-based financial simulation engine for goal-based planning.

    Computes:
      - Future value of goals adjusted for inflation
      - Monthly SIP required to reach the target
      - Projected corpus based on current savings
      - Gap analysis (shortfall between projected and required)

    This is a standalone class. P2 wraps it in `/api/simulate`.
    """

    def __init__(
        self,
        inflation_rate: float = DEFAULT_INFLATION_RATE,
        expected_return: float = DEFAULT_RETURN_RATE,
        risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
        retirement_age: int = DEFAULT_RETIREMENT_AGE,
        life_expectancy: int = DEFAULT_LIFE_EXPECTANCY,
    ):
        """
        Initialize the simulation engine with financial assumptions.

        Args:
            inflation_rate: Annual inflation rate (default: 6%).
            expected_return: Expected annual return on investments (default: 10%).
            risk_free_rate: Risk-free return rate (default: 6.5%).
            retirement_age: Default retirement age.
            life_expectancy: Life expectancy for retirement calculations.
        """
        self.inflation_rate = inflation_rate
        self.expected_return = expected_return
        self.risk_free_rate = risk_free_rate
        self.retirement_age = retirement_age
        self.life_expectancy = life_expectancy

    # ── Core Financial Math ───────────────────────────────

    @staticmethod
    def future_value(present_value: float, rate: float, years: int) -> float:
        """
        Calculate the future value of a lump sum.

        FV = PV × (1 + r)^n

        Args:
            present_value: The current amount.
            rate: Annual growth rate (decimal, e.g., 0.06 for 6%).
            years: Number of years.

        Returns:
            The future value.
        """
        return float(present_value * np.power(1 + rate, years))

    @staticmethod
    def present_value(future_value: float, rate: float, years: int) -> float:
        """
        Calculate the present value of a future amount.

        PV = FV / (1 + r)^n

        Args:
            future_value: The future amount.
            rate: Annual discount rate.
            years: Number of years.

        Returns:
            The present value.
        """
        if years <= 0:
            return future_value
        return float(future_value / np.power(1 + rate, years))

    @staticmethod
    def monthly_sip_required(
        target_amount: float,
        annual_return: float,
        years: int,
    ) -> float:
        """
        Calculate the monthly SIP needed to accumulate a target amount.

        Uses the future value of an annuity formula:
        FV = PMT × [((1 + r)^n - 1) / r]

        Solving for PMT:
        PMT = FV × r / ((1 + r)^n - 1)

        Args:
            target_amount: The target corpus to accumulate.
            annual_return: Expected annual return rate.
            years: Investment horizon in years.

        Returns:
            Required monthly investment amount.
        """
        if years <= 0:
            return target_amount  # Need full amount immediately

        monthly_rate = annual_return / 12
        total_months = years * 12

        if monthly_rate == 0:
            return target_amount / total_months

        numerator = target_amount * monthly_rate
        denominator = np.power(1 + monthly_rate, total_months) - 1

        return float(numerator / denominator)

    @staticmethod
    def sip_future_value(
        monthly_amount: float,
        annual_return: float,
        years: int,
    ) -> float:
        """
        Calculate the future value of a monthly SIP.

        FV = PMT × [((1 + r)^n - 1) / r] × (1 + r)

        Args:
            monthly_amount: Monthly SIP amount.
            annual_return: Expected annual return.
            years: Number of years.

        Returns:
            Projected corpus from the SIP.
        """
        if years <= 0 or monthly_amount <= 0:
            return 0.0

        monthly_rate = annual_return / 12
        total_months = years * 12

        if monthly_rate == 0:
            return monthly_amount * total_months

        fv = monthly_amount * (
            (np.power(1 + monthly_rate, total_months) - 1) / monthly_rate
        ) * (1 + monthly_rate)

        return float(fv)

    def retirement_corpus_needed(
        self,
        current_age: int,
        monthly_expenses: float,
        retirement_age: Optional[int] = None,
        life_expectancy: Optional[int] = None,
    ) -> float:
        """
        Calculate the corpus needed at retirement to sustain current lifestyle.

        Accounts for inflation until retirement and draws down with
        risk-free returns during retirement.

        Args:
            current_age: Current age of the user.
            monthly_expenses: Current monthly expenses in INR.
            retirement_age: Age at which the user plans to retire.
            life_expectancy: Expected age at death.

        Returns:
            Required corpus at the time of retirement.
        """
        ret_age = retirement_age or self.retirement_age
        le = life_expectancy or self.life_expectancy

        years_to_retirement = ret_age - current_age
        retirement_years = le - ret_age

        if years_to_retirement <= 0 or retirement_years <= 0:
            return 0.0

        # Annual expenses today
        annual_expenses_today = monthly_expenses * 12

        # Inflation-adjusted annual expenses at retirement
        annual_expenses_at_retirement = self.future_value(
            annual_expenses_today, self.inflation_rate, years_to_retirement
        )

        # Corpus needed to sustain expenses during retirement
        # Using present value of annuity formula with real return
        real_return = (
            (1 + self.risk_free_rate) / (1 + self.inflation_rate)
        ) - 1

        if real_return <= 0:
            # If real return is 0 or negative, simple multiplication
            corpus = annual_expenses_at_retirement * retirement_years
        else:
            # PV of annuity: PMT × [(1 - (1+r)^-n) / r]
            corpus = annual_expenses_at_retirement * (
                (1 - np.power(1 + real_return, -retirement_years)) / real_return
            )

        return float(corpus)

    # ── Single Goal Simulation ────────────────────────────

    def simulate_goal(
        self,
        goal: FinancialGoal,
        user_age: int,
        current_savings: float = 0.0,
    ) -> SimulationResult:
        """
        Run a financial simulation for a single goal.

        Args:
            goal: The financial goal to simulate.
            user_age: Current age of the user.
            current_savings: Monthly amount currently being saved for this goal.

        Returns:
            SimulationResult with projections and gap analysis.
        """
        current_year = datetime.now().year
        years_remaining = max(1, goal.target_year - current_year)

        # Adjust return rate based on goal type (risk profiling)
        adjusted_return = self._get_adjusted_return(goal.goal_type, years_remaining)

        # Inflation-adjusted future value of the goal
        future_target = self.future_value(
            goal.target_amount, self.inflation_rate, years_remaining
        )

        # Monthly SIP required to reach the target
        monthly_required = self.monthly_sip_required(
            future_target, adjusted_return, years_remaining
        )

        # Projected corpus with current savings
        monthly_savings = current_savings or goal.monthly_contribution or 0.0
        projected_corpus = self.sip_future_value(
            monthly_savings, adjusted_return, years_remaining
        )

        # Gap analysis
        gap = max(0.0, future_target - projected_corpus)
        coverage_ratio = min(1.0, projected_corpus / future_target if future_target > 0 else 0.0)

        result = SimulationResult(
            goal_type=goal.goal_type,
            target_amount=goal.target_amount,
            future_value=round(future_target, 2),
            years_remaining=years_remaining,
            monthly_savings_required=round(monthly_required, 2),
            current_gap=round(gap, 2),
            projected_corpus=round(projected_corpus, 2),
            coverage_ratio=round(coverage_ratio, 4),
            inflation_rate=self.inflation_rate,
            expected_return=adjusted_return,
        )

        console.print(
            f"[cyan]Goal '{goal.goal_type}': "
            f"INR {future_target:,.0f} needed in {years_remaining}y, "
            f"SIP INR {monthly_required:,.0f}/mo, "
            f"coverage {coverage_ratio:.0%}[/cyan]"
        )

        return result

    def _get_adjusted_return(self, goal_type: str, years: int) -> float:
        """
        Adjust expected returns based on goal type and horizon.

        Shorter horizons and conservative goals get lower return assumptions.

        Args:
            goal_type: Type of financial goal.
            years: Years remaining to achieve the goal.

        Returns:
            Adjusted annual return rate.
        """
        # Conservative goals or short horizons → lower returns
        conservative_goals = {"protection", "health", "family_security", "debt_repayment"}
        moderate_goals = {"child_education", "home_purchase", "child_marriage"}

        if goal_type.lower() in conservative_goals or years <= 3:
            return self.risk_free_rate
        elif goal_type.lower() in moderate_goals or years <= 7:
            return (self.expected_return + self.risk_free_rate) / 2
        else:
            return self.expected_return

    # ── Multi-Goal Simulation ─────────────────────────────

    def simulate_all_goals(
        self,
        profile: UserProfile,
    ) -> MultiGoalSimulationResult:
        """
        Run simulations for ALL goals in a user profile simultaneously.

        Handles multi-goal interactions by:
          - Simulating each goal independently
          - Aggregating total monthly savings required
          - Computing total coverage gap

        Args:
            profile: The user's full profile with goals.

        Returns:
            MultiGoalSimulationResult with per-goal and aggregate data.
        """
        if not profile.age:
            raise ValueError("User age is required for simulation")

        if not profile.goals:
            raise ValueError("At least one goal is required for simulation")

        console.print(f"\n[bold cyan]>> Multi-Goal Simulation for age {profile.age}[/bold cyan]")

        goal_results = []
        for goal in profile.goals:
            # Distribute monthly contribution proportionally if not specified
            monthly_savings = goal.monthly_contribution or 0.0
            result = self.simulate_goal(goal, profile.age, monthly_savings)
            goal_results.append(result)

        # Sort by priority (lower number = higher priority)
        goal_results.sort(
            key=lambda r: next(
                (g.priority for g in profile.goals if g.goal_type == r.goal_type),
                5
            )
        )

        total_monthly = sum(r.monthly_savings_required for r in goal_results)
        total_gap = sum(r.current_gap for r in goal_results)

        result = MultiGoalSimulationResult(
            user_age=profile.age,
            total_monthly_savings_required=round(total_monthly, 2),
            total_gap=round(total_gap, 2),
            goals=goal_results,
        )

        console.print(
            f"\n[bold green]Total: INR {total_monthly:,.0f}/mo needed, "
            f"INR {total_gap:,.0f} gap[/bold green]\n"
        )

        return result

    def simulate_retirement(
        self,
        profile: UserProfile,
    ) -> SimulationResult:
        """
        Convenience method to simulate retirement as a standalone goal.

        Uses the user's monthly expenses to compute the retirement corpus,
        then runs a standard simulation.

        Args:
            profile: User profile with age and monthly expenses.

        Returns:
            SimulationResult for retirement goal.
        """
        if not profile.age or not profile.monthly_expenses:
            raise ValueError("Age and monthly_expenses required for retirement simulation")

        retirement_corpus = self.retirement_corpus_needed(
            current_age=profile.age,
            monthly_expenses=profile.monthly_expenses,
        )

        retirement_goal = FinancialGoal(
            goal_type="retirement",
            target_amount=retirement_corpus,
            target_year=datetime.now().year + (self.retirement_age - profile.age),
            priority=1,
        )

        return self.simulate_goal(retirement_goal, profile.age)


# ── CLI Entry Point ───────────────────────────────────────
def main():
    """Test the simulation engine with sample data."""
    engine = SimulationEngine()

    # Sample user profile
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
                goal_type="home_purchase",
                target_amount=5_000_000,
                target_year=2032,
                priority=2,
                monthly_contribution=15_000,
            ),
            FinancialGoal(
                goal_type="retirement",
                target_amount=30_000_000,
                target_year=2056,
                priority=3,
                monthly_contribution=20_000,
            ),
        ],
    )

    result = engine.simulate_all_goals(profile)

    console.print("\n[bold]Simulation Results:[/bold]")
    for goal in result.goals:
        console.print(f"\n  Goal: {goal.goal_type}")
        console.print(f"  Target (inflated): INR {goal.future_value:,.0f}")
        console.print(f"  Monthly SIP needed: INR {goal.monthly_savings_required:,.0f}")
        console.print(f"  Projected corpus: INR {goal.projected_corpus:,.0f}")
        console.print(f"  Coverage: {goal.coverage_ratio:.0%}")
        console.print(f"  Gap: INR {goal.current_gap:,.0f}")


if __name__ == "__main__":
    main()
