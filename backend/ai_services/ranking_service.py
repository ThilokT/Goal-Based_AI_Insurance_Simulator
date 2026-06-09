"""
Ranking Service — Composite Product Scoring Algorithm.

Takes simulation results and product matches, then scores and ranks
products based on multiple factors: similarity, goal coverage,
category fitness, and investment horizon alignment.

Usage:
    from ai_services.ranking_service import RankingService
    ranker = RankingService()
    ranked = ranker.rank_products(simulation, matches)
"""
from typing import Optional

from rich.console import Console
from rich.table import Table

from ai_services.models import (
    MultiGoalSimulationResult,
    ProductMatch,
    RankedProduct,
    SimulationResult,
)

console = Console()

# ── Category-Goal Affinity Matrix ─────────────────────────
# Defines how well each product category serves each goal type.
# Score from 0.0 (poor fit) to 1.0 (excellent fit).

CATEGORY_GOAL_AFFINITY = {
    "term_insurance": {
        "protection": 1.0,
        "family_security": 1.0,
        "debt_repayment": 0.9,
        "health": 0.3,
        "retirement": 0.1,
        "child_education": 0.1,
        "wealth_creation": 0.0,
    },
    "ulip": {
        "wealth_creation": 0.9,
        "retirement": 0.8,
        "child_education": 0.8,
        "home_purchase": 0.6,
        "protection": 0.3,
        "tax_saving": 0.7,
    },
    "savings": {
        "child_education": 0.8,
        "home_purchase": 0.7,
        "wealth_creation": 0.7,
        "retirement": 0.5,
        "tax_saving": 0.8,
        "regular_income": 0.6,
    },
    "retirement": {
        "retirement": 1.0,
        "regular_income": 0.9,
        "wealth_creation": 0.5,
        "legacy_planning": 0.4,
    },
    "child": {
        "child_education": 1.0,
        "child_marriage": 0.9,
        "protection": 0.5,
        "wealth_creation": 0.4,
    },
    "health": {
        "health": 1.0,
        "critical_illness": 1.0,
        "protection": 0.5,
        "family_security": 0.4,
    },
    "protection": {
        "protection": 1.0,
        "family_security": 0.9,
        "debt_repayment": 0.7,
    },
}

# Default affinity for unknown category-goal combinations
DEFAULT_AFFINITY = 0.2


class RankingService:
    """
    Scores and ranks product recommendations using a composite algorithm.

    Scoring factors (configurable weights):
      - Similarity Score (from vector search)     — default 40%
      - Goal Coverage (how many user goals match) — default 30%
      - Category Fit (affinity matrix lookup)      — default 30%

    This is a standalone class. P2 wraps it in the recommendation pipeline.
    """

    def __init__(
        self,
        weight_similarity: float = 0.40,
        weight_goal_coverage: float = 0.30,
        weight_category_fit: float = 0.30,
    ):
        """
        Initialize the ranking service with scoring weights.

        Args:
            weight_similarity: Weight for vector similarity score (0-1).
            weight_goal_coverage: Weight for goal coverage score (0-1).
            weight_category_fit: Weight for category fitness score (0-1).
        """
        total = weight_similarity + weight_goal_coverage + weight_category_fit
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1.0, got {total}")

        self.weight_similarity = weight_similarity
        self.weight_goal_coverage = weight_goal_coverage
        self.weight_category_fit = weight_category_fit

    def _compute_goal_coverage_score(
        self,
        matched_goals: list[str],
        total_goals: int,
    ) -> float:
        """
        Compute how many of the user's goals this product covers.

        Args:
            matched_goals: Goals this product matched against.
            total_goals: Total number of user goals.

        Returns:
            Score between 0.0 and 1.0.
        """
        if total_goals == 0:
            return 0.0
        return min(1.0, len(matched_goals) / total_goals)

    def _compute_category_fit_score(
        self,
        category: str,
        matched_goals: list[str],
    ) -> float:
        """
        Look up the category-goal affinity matrix to score fitness.

        Returns the average affinity score across all matched goals.

        Args:
            category: Product category.
            matched_goals: Goals this product was matched to.

        Returns:
            Average affinity score (0.0-1.0).
        """
        if not matched_goals:
            return DEFAULT_AFFINITY

        affinities = CATEGORY_GOAL_AFFINITY.get(category, {})
        scores = [
            affinities.get(goal.lower(), DEFAULT_AFFINITY)
            for goal in matched_goals
        ]
        return sum(scores) / len(scores)

    def _generate_reasoning(
        self,
        product: ProductMatch,
        similarity_score: float,
        goal_coverage_score: float,
        category_fit_score: float,
        composite_score: float,
    ) -> str:
        """Generate a human-readable explanation for the ranking."""
        parts = []

        if similarity_score >= 0.8:
            parts.append("Strong semantic match to your goals")
        elif similarity_score >= 0.6:
            parts.append("Good alignment with your requirements")

        if goal_coverage_score >= 0.6:
            parts.append(
                f"covers {len(product.matched_goals)} of your goals"
            )

        if category_fit_score >= 0.8:
            parts.append(
                f"'{product.category}' is an excellent category fit"
            )
        elif category_fit_score >= 0.5:
            parts.append(
                f"'{product.category}' is a suitable category"
            )

        if not parts:
            parts.append("Potential match worth considering")

        return ". ".join(parts) + "."

    def rank_products(
        self,
        simulation: MultiGoalSimulationResult,
        matches: list[ProductMatch],
    ) -> list[RankedProduct]:
        """
        Score and rank product matches based on simulation context.

        Args:
            simulation: The user's multi-goal simulation results.
            matches: Product matches from the vector store.

        Returns:
            List of RankedProduct objects, sorted by composite score.
        """
        console.print(
            f"\n[bold cyan]🏆 Ranking {len(matches)} products[/bold cyan]"
        )

        total_goals = len(simulation.goals)
        ranked_products = []

        for match in matches:
            # Factor 1: Similarity (already normalized 0-1)
            sim_score = match.similarity_score

            # Factor 2: Goal coverage
            goal_cov = self._compute_goal_coverage_score(
                match.matched_goals, total_goals
            )

            # Factor 3: Category fitness
            cat_fit = self._compute_category_fit_score(
                match.category, match.matched_goals
            )

            # Composite score (weighted sum, scaled to 0-100)
            composite = (
                sim_score * self.weight_similarity
                + goal_cov * self.weight_goal_coverage
                + cat_fit * self.weight_category_fit
            ) * 100

            reasoning = self._generate_reasoning(
                match, sim_score, goal_cov, cat_fit, composite
            )

            ranked_products.append(RankedProduct(
                product_name=match.product_name,
                product_id=match.product_id,
                category=match.category,
                rank=0,  # Will be set after sorting
                composite_score=round(composite, 2),
                similarity_score=round(sim_score, 4),
                goal_coverage_score=round(goal_cov, 4),
                category_fit_score=round(cat_fit, 4),
                matched_goals=match.matched_goals,
                description=match.description,
                key_benefits=match.key_benefits,
                reasoning=reasoning,
            ))

        # Sort by composite score (descending) and assign ranks
        ranked_products.sort(key=lambda p: p.composite_score, reverse=True)
        for i, product in enumerate(ranked_products):
            product.rank = i + 1

        self._print_rankings(ranked_products)
        return ranked_products

    def _print_rankings(self, ranked: list[RankedProduct]):
        """Print a formatted ranking table."""
        table = Table(title="Product Rankings")
        table.add_column("#", style="bold", width=3)
        table.add_column("Product", style="cyan")
        table.add_column("Category", style="dim")
        table.add_column("Score", style="green", justify="right")
        table.add_column("Sim", style="dim", justify="right")
        table.add_column("Goals", style="dim", justify="right")
        table.add_column("Fit", style="dim", justify="right")

        for p in ranked[:10]:
            table.add_row(
                str(p.rank),
                p.product_name[:30],
                p.category,
                f"{p.composite_score:.1f}",
                f"{p.similarity_score:.2f}",
                f"{p.goal_coverage_score:.2f}",
                f"{p.category_fit_score:.2f}",
            )

        console.print(table)


# ── CLI Entry Point ───────────────────────────────────────
def main():
    """Test the ranking service with mock data."""
    from ai_services.models import FinancialGoal

    # Mock simulation result
    simulation = MultiGoalSimulationResult(
        user_age=30,
        total_monthly_savings_required=45_000,
        total_gap=15_000_000,
        goals=[
            SimulationResult(
                goal_type="child_education",
                target_amount=2_500_000,
                future_value=4_500_000,
                years_remaining=15,
                monthly_savings_required=15_000,
                current_gap=3_000_000,
                projected_corpus=1_500_000,
                coverage_ratio=0.33,
                inflation_rate=0.06,
                expected_return=0.085,
            ),
            SimulationResult(
                goal_type="retirement",
                target_amount=30_000_000,
                future_value=96_000_000,
                years_remaining=30,
                monthly_savings_required=30_000,
                current_gap=12_000_000,
                projected_corpus=84_000_000,
                coverage_ratio=0.875,
                inflation_rate=0.06,
                expected_return=0.10,
            ),
        ],
    )

    # Mock product matches
    matches = [
        ProductMatch(
            product_name="ICICI Pru Smart Kid",
            product_id="icici-pru-smart-kid",
            category="child",
            similarity_score=0.92,
            matched_goals=["child_education"],
            description="A child education plan...",
            key_benefits=["Waiver of premium", "Milestone withdrawals"],
        ),
        ProductMatch(
            product_name="ICICI Pru Easy Retirement",
            product_id="icici-pru-easy-retirement",
            category="retirement",
            similarity_score=0.88,
            matched_goals=["retirement"],
            description="A unit-linked pension plan...",
            key_benefits=["Pension boosters", "Capital guarantee"],
        ),
        ProductMatch(
            product_name="ICICI Pru Signature",
            product_id="icici-pru-signature",
            category="ulip",
            similarity_score=0.85,
            matched_goals=["child_education", "retirement"],
            description="A ULIP for wealth creation...",
            key_benefits=["Zero charges", "Wealth boosters"],
        ),
    ]

    ranker = RankingService()
    ranked = ranker.rank_products(simulation, matches)


if __name__ == "__main__":
    main()
