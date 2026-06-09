"""
AI Guardrails — Financial Output Validation & Disclaimers.

Validates all financial outputs from the simulation and recommendation
engines to ensure amounts are sane, product IDs exist, and mandatory
financial disclaimers are appended.

Also implements the multi-provider fallback strategy for LLM calls.

Usage:
    from ai_services.guardrails import Guardrails
    guardrails = Guardrails()
    result = guardrails.validate_simulation(simulation_result)
"""
import time
from typing import Any, Callable

from rich.console import Console

from ai_services.models import (
    GuardrailResult,
    MultiGoalSimulationResult,
    SimulationResult,
    RankedProduct,
    WhatIfResult,
)

console = Console()

# ── Financial Disclaimers ─────────────────────────────────

STANDARD_DISCLAIMERS = [
    "All projections are estimates based on assumed rates of return and "
    "inflation. Actual results may vary significantly.",
    "Past performance does not guarantee future results. Investment in "
    "market-linked products is subject to market risks.",
    "Insurance is a subject matter of solicitation. Please read all "
    "scheme-related documents carefully before investing.",
    "Tax benefits are subject to changes in tax laws. Please consult "
    "a qualified tax advisor for personalized tax advice.",
    "This tool provides general financial guidance and does not "
    "constitute professional financial advice. Please consult a "
    "certified financial planner for personalised recommendations.",
]

PROJECTION_DISCLAIMER = (
    "⚠️ Disclaimer: The numbers shown are projections based on assumed "
    "rates ({inflation}% inflation, {returns}% returns). Actual results "
    "will vary based on market conditions and economic factors."
)

# ── Sanity Check Thresholds ───────────────────────────────

MAX_MONTHLY_SIP = 10_00_000          # ₹10L/month (unreasonable for most)
MIN_MONTHLY_SIP = 100                 # ₹100/month minimum
MAX_CORPUS = 100_00_00_00_000         # ₹1000 Cr (sanity limit)
MIN_CORPUS = 10_000                   # ₹10K minimum
MAX_COVERAGE_RATIO = 1.0
MIN_COVERAGE_RATIO = 0.0
MAX_INFLATION_RATE = 0.20             # 20% max
MIN_INFLATION_RATE = 0.01             # 1% min
MAX_RETURN_RATE = 0.25                # 25% max
MAX_YEARS = 80                        # 80 years horizon


class Guardrails:
    """
    Validation and safety layer for all financial AI outputs.

    Responsibilities:
      - Validate simulation outputs are within sane ranges
      - Ensure product IDs and categories are valid
      - Append mandatory financial disclaimers
      - Provide multi-provider LLM fallback wrapper

    This is a standalone class used by all other AI services.
    """

    def __init__(self, known_product_ids: list[str] | None = None):
        """
        Initialize the guardrails.

        Args:
            known_product_ids: Optional list of valid product IDs
                               for cross-referencing recommendations.
        """
        self.known_product_ids = set(known_product_ids or [])

    # ── Simulation Validation ─────────────────────────────

    def validate_simulation(
        self, result: MultiGoalSimulationResult
    ) -> GuardrailResult:
        """
        Validate a multi-goal simulation result.

        Checks:
          - Monthly SIP amounts are within sane ranges
          - Corpus values are within bounds
          - Coverage ratios are between 0 and 1
          - Inflation and return rates are reasonable

        Args:
            result: The simulation result to validate.

        Returns:
            GuardrailResult with validation status and any warnings.
        """
        warnings = []
        sanitized_goals = []
        is_valid = True

        for goal in result.goals:
            goal_warnings, sanitized_goal = self._validate_single_goal(goal)
            warnings.extend(goal_warnings)
            sanitized_goals.append(sanitized_goal)
            if goal_warnings:
                is_valid = False

        # Check aggregate values
        if result.total_monthly_savings_required > MAX_MONTHLY_SIP:
            warnings.append(
                f"Total monthly savings ₹{result.total_monthly_savings_required:,.0f} "
                f"exceeds reasonable threshold. Consider prioritising goals."
            )

        disclaimers = self._get_disclaimers(result)

        sanitized_data = result.model_dump()
        sanitized_data["goals"] = sanitized_goals

        return GuardrailResult(
            is_valid=is_valid,
            original_data=result.model_dump(),
            sanitized_data=sanitized_data,
            warnings=warnings,
            disclaimers=disclaimers,
        )

    def _validate_single_goal(
        self, goal: SimulationResult
    ) -> tuple[list[str], dict]:
        """Validate a single goal simulation and return warnings + sanitized data."""
        warnings = []
        data = goal.model_dump()

        # Monthly SIP check
        if goal.monthly_savings_required > MAX_MONTHLY_SIP:
            warnings.append(
                f"Goal '{goal.goal_type}': Monthly SIP ₹{goal.monthly_savings_required:,.0f} "
                f"is unusually high. This may indicate an unrealistic goal amount or timeline."
            )
            data["monthly_savings_required"] = MAX_MONTHLY_SIP

        if goal.monthly_savings_required < 0:
            warnings.append(
                f"Goal '{goal.goal_type}': Negative SIP detected — corrected to ₹0."
            )
            data["monthly_savings_required"] = 0

        # Corpus check
        if goal.future_value > MAX_CORPUS:
            warnings.append(
                f"Goal '{goal.goal_type}': Future value ₹{goal.future_value:,.0f} "
                f"exceeds ₹{MAX_CORPUS:,.0f} — verify inputs."
            )

        if goal.future_value < 0:
            warnings.append(
                f"Goal '{goal.goal_type}': Negative future value detected — corrected to ₹0."
            )
            data["future_value"] = 0

        # Coverage ratio check
        if not (MIN_COVERAGE_RATIO <= goal.coverage_ratio <= MAX_COVERAGE_RATIO):
            warnings.append(
                f"Goal '{goal.goal_type}': Coverage ratio {goal.coverage_ratio:.2f} "
                f"is outside valid range [0, 1] — clamped."
            )
            data["coverage_ratio"] = max(
                MIN_COVERAGE_RATIO,
                min(MAX_COVERAGE_RATIO, goal.coverage_ratio),
            )

        # Rate checks
        if goal.inflation_rate > MAX_INFLATION_RATE:
            warnings.append(
                f"Goal '{goal.goal_type}': Inflation rate {goal.inflation_rate:.1%} "
                f"is unusually high."
            )
        if goal.expected_return > MAX_RETURN_RATE:
            warnings.append(
                f"Goal '{goal.goal_type}': Expected return {goal.expected_return:.1%} "
                f"is unusually high."
            )

        # Years check
        if goal.years_remaining > MAX_YEARS:
            warnings.append(
                f"Goal '{goal.goal_type}': {goal.years_remaining} years is an "
                f"extremely long horizon."
            )

        return warnings, data

    # ── Product Validation ────────────────────────────────

    def validate_products(
        self, products: list[RankedProduct]
    ) -> GuardrailResult:
        """
        Validate ranked product recommendations.

        Checks:
          - Product IDs exist in the known product set (if provided)
          - Scores are within valid ranges
          - At least one product has a reasonable score

        Args:
            products: List of ranked products to validate.

        Returns:
            GuardrailResult.
        """
        warnings = []
        is_valid = True

        for product in products:
            # Verify product ID exists
            if self.known_product_ids and product.product_id not in self.known_product_ids:
                warnings.append(
                    f"Product '{product.product_name}' (ID: {product.product_id}) "
                    f"not found in known product database — may be outdated."
                )
                is_valid = False

            # Score range check
            if not (0 <= product.composite_score <= 100):
                warnings.append(
                    f"Product '{product.product_name}': Score {product.composite_score} "
                    f"is outside valid range [0, 100]."
                )
                is_valid = False

        # Check if best product has a reasonable score
        if products and products[0].composite_score < 20:
            warnings.append(
                "The best matching product has a low confidence score. "
                "The recommendations may not be highly relevant."
            )

        disclaimers = [
            STANDARD_DISCLAIMERS[2],  # Insurance solicitation disclaimer
            STANDARD_DISCLAIMERS[4],  # Not professional advice
        ]

        return GuardrailResult(
            is_valid=is_valid,
            original_data={"products": [p.model_dump() for p in products]},
            sanitized_data={"products": [p.model_dump() for p in products]},
            warnings=warnings,
            disclaimers=disclaimers,
        )

    # ── What-If Validation ────────────────────────────────

    def validate_whatif(self, result: WhatIfResult) -> GuardrailResult:
        """
        Validate a what-if comparison result.

        Args:
            result: WhatIfResult to validate.

        Returns:
            GuardrailResult.
        """
        warnings = []

        # Validate both baseline and modified simulations
        baseline_check = self.validate_simulation(result.baseline)
        modified_check = self.validate_simulation(result.modified)

        warnings.extend(
            [f"[Baseline] {w}" for w in baseline_check.warnings]
        )
        warnings.extend(
            [f"[Modified] {w}" for w in modified_check.warnings]
        )

        disclaimers = self._get_disclaimers(result.baseline)
        disclaimers.append(
            "What-if scenarios are hypothetical projections. They illustrate "
            "the potential impact of changes but do not predict actual outcomes."
        )

        return GuardrailResult(
            is_valid=baseline_check.is_valid and modified_check.is_valid,
            original_data=result.model_dump(),
            sanitized_data=result.model_dump(),
            warnings=warnings,
            disclaimers=disclaimers,
        )

    # ── Disclaimers ───────────────────────────────────────

    def _get_disclaimers(
        self, simulation: MultiGoalSimulationResult
    ) -> list[str]:
        """Generate context-aware disclaimers for a simulation."""
        disclaimers = list(STANDARD_DISCLAIMERS)

        # Add a projection-specific disclaimer with actual rates
        if simulation.goals:
            inflation = simulation.goals[0].inflation_rate * 100
            returns = simulation.goals[0].expected_return * 100
            disclaimers.insert(
                0,
                PROJECTION_DISCLAIMER.format(
                    inflation=inflation, returns=returns
                ),
            )

        return disclaimers

    def get_standard_disclaimers(self) -> list[str]:
        """Return the standard set of financial disclaimers."""
        return list(STANDARD_DISCLAIMERS)

    # ── Multi-Provider LLM Fallback ───────────────────────

    @staticmethod
    def with_fallback(
        primary_fn: Callable,
        fallback_fn: Callable,
        max_retries: int = 2,
        retry_delay: float = 1.0,
    ) -> Any:
        """
        Execute a function with automatic fallback on failure.

        Tries the primary function first. On rate-limit or transient
        errors, retries with exponential backoff. If all retries fail,
        falls back to the secondary function.

        Args:
            primary_fn: Primary function to call (e.g., Gemini).
            fallback_fn: Fallback function (e.g., Groq/Llama).
            max_retries: Number of retries before fallback.
            retry_delay: Initial delay between retries (seconds).

        Returns:
            The result from whichever function succeeds.

        Raises:
            RuntimeError: If both primary and fallback fail.
        """
        last_error = None

        # Try primary with retries
        for attempt in range(max_retries + 1):
            try:
                return primary_fn()
            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Only retry on rate-limit / transient errors
                is_retryable = any(
                    keyword in error_str
                    for keyword in ["rate", "429", "quota", "timeout", "503", "overloaded"]
                )

                if not is_retryable:
                    console.print(f"[red]❌ Primary failed (non-retryable): {e}[/red]")
                    break

                if attempt < max_retries:
                    delay = retry_delay * (2 ** attempt)
                    console.print(
                        f"[yellow]⚠️  Retry {attempt + 1}/{max_retries} "
                        f"in {delay:.1f}s: {e}[/yellow]"
                    )
                    time.sleep(delay)

        # Try fallback
        console.print("[cyan]🔄 Switching to fallback provider...[/cyan]")
        try:
            return fallback_fn()
        except Exception as fallback_error:
            raise RuntimeError(
                f"Both providers failed. Primary: {last_error}. "
                f"Fallback: {fallback_error}"
            )


# ── CLI Entry Point ───────────────────────────────────────
def main():
    """Test guardrails with sample data."""
    from ai_services.models import FinancialGoal, UserProfile
    from ai_services.simulation_engine import SimulationEngine

    engine = SimulationEngine()
    profile = UserProfile(
        age=30,
        annual_income=1_500_000,
        monthly_expenses=50_000,
        goals=[
            FinancialGoal(
                goal_type="retirement",
                target_amount=30_000_000,
                target_year=2056,
                priority=1,
                monthly_contribution=20_000,
            ),
        ],
    )

    simulation = engine.simulate_all_goals(profile)

    guardrails = Guardrails()
    result = guardrails.validate_simulation(simulation)

    console.print(f"\n[bold]Validation Result:[/bold]")
    console.print(f"  Valid: {result.is_valid}")
    console.print(f"  Warnings: {len(result.warnings)}")
    for w in result.warnings:
        console.print(f"    ⚠️  {w}")
    console.print(f"  Disclaimers: {len(result.disclaimers)}")
    for d in result.disclaimers:
        console.print(f"    📋 {d}")


if __name__ == "__main__":
    main()
