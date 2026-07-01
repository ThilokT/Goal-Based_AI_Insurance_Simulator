"""
Product Matcher — Goal-to-Product Mapping via Vector Similarity.

Takes the user's extracted financial goals and uses ChromaDB semantic
search to find the most relevant insurance products.

Usage:
    from ai_services.product_matcher import ProductMatcher
    matcher = ProductMatcher()
    matches = matcher.match_products(goals)
"""
from typing import Optional

from rich.console import Console

from ai_services.models import FinancialGoal, ProductMatch
from ai_services.vectorstore import ProductVectorStore, get_vectorstore

console = Console()

# ── Goal-to-Query Mapping ─────────────────────────────────
# Maps goal types to natural language queries for better semantic search

GOAL_QUERY_MAP = {
    "retirement": "retirement pension plan with guaranteed income and long-term savings",
    "child_education": "child education plan for future college and school fees savings",
    "child_marriage": "child plan for marriage expenses and milestone payouts",
    "home_purchase": "savings plan for home purchase down payment and wealth creation",
    "wealth_creation": "ULIP or investment plan for long-term wealth creation and growth",
    "protection": "term insurance with high life cover and family protection",
    "family_security": "comprehensive term insurance for family financial security",
    "debt_repayment": "term insurance to cover outstanding home loan and liabilities",
    "health": "health insurance plan with critical illness and cancer cover",
    "critical_illness": "heart and cancer protection plan with lump sum payout",
    "regular_income": "guaranteed income plan with regular payouts after maturity",
    "tax_saving": "insurance plan with tax benefits under Section 80C and 10(10D)",
    "legacy_planning": "whole life plan with maturity benefit for estate and legacy",
}


class ProductMatcher:
    """
    Maps user financial goals to insurance products using vector similarity search.

    Builds search queries from goal types, runs them against the
    ChromaDB vector store, and returns ranked product matches.

    This is a standalone class. P2 wraps it in `/api/recommend`.
    """

    def __init__(self, vectorstore: Optional[ProductVectorStore] = None):
        """
        Initialize the product matcher.

        Args:
            vectorstore: An existing ProductVectorStore instance.
                         If None, creates a new one (loading from disk).
        """
        self.vectorstore = vectorstore or get_vectorstore()

    def _goal_to_query(self, goal: FinancialGoal) -> str:
        """
        Convert a FinancialGoal into a rich natural language query.

        Uses the GOAL_QUERY_MAP for known goal types, and falls back
        to a generic query for unknown types.

        Args:
            goal: The financial goal to convert.

        Returns:
            A natural language search query string.
        """
        base_query = GOAL_QUERY_MAP.get(
            goal.goal_type.lower(),
            f"insurance plan for {goal.goal_type.replace('_', ' ')}"
        )

        # Enrich query with goal context
        enrichments = []
        if goal.target_amount:
            if goal.target_amount >= 1_00_00_000:
                enrichments.append("high value")
            elif goal.target_amount <= 10_00_000:
                enrichments.append("affordable")

        from datetime import datetime
        years = goal.target_year - datetime.now().year
        if years <= 5:
            enrichments.append("short-term")
        elif years >= 20:
            enrichments.append("long-term")
        else:
            enrichments.append("medium-term")

        if goal.notes:
            enrichments.append(goal.notes)

        if enrichments:
            base_query += " " + " ".join(enrichments)

        return base_query

    def match_products(
        self,
        goals: list[FinancialGoal],
        n_results_per_goal: int = 15,
    ) -> list[ProductMatch]:
        """
        Find the best product matches for a list of financial goals.

        For each goal, runs a semantic search against the vector store
        and combines the results, deduplicating by product ID.

        Args:
            goals: List of user's financial goals.
            n_results_per_goal: Number of products to fetch per goal.

        Returns:
            Deduplicated list of ProductMatch objects, sorted by
            similarity score (highest first).
        """
        console.print(f"\n[bold cyan]🎯 Matching products for {len(goals)} goals[/bold cyan]")

        all_matches: dict[str, ProductMatch] = {}

        for goal in goals:
            query = self._goal_to_query(goal)
            console.print(f"  [dim]Query for '{goal.goal_type}': {query}[/dim]")

            results = self.vectorstore.search_products(
                query=query,
                n_results=n_results_per_goal,
            )

            # Group chunks by product_id to calculate density
            product_chunks = {}
            for match in results:
                if match.product_id not in product_chunks:
                    product_chunks[match.product_id] = []
                product_chunks[match.product_id].append(match)

            for product_id, chunks in product_chunks.items():
                # Find the best chunk score
                best_chunk = max(chunks, key=lambda c: c.similarity_score)
                density_score = best_chunk.similarity_score

                # Add a density bonus for multiple matching chunks
                if len(chunks) > 1:
                    density_bonus = (len(chunks) - 1) * 0.05
                    density_score = min(0.99, density_score + density_bonus)
                
                best_chunk.similarity_score = density_score

                if product_id in all_matches:
                    # Merge: keep higher score, accumulate matched goals
                    existing = all_matches[product_id]
                    if density_score > existing.similarity_score:
                        existing.similarity_score = density_score
                    if goal.goal_type not in existing.matched_goals:
                        existing.matched_goals.append(goal.goal_type)
                else:
                    best_chunk.matched_goals = [goal.goal_type]
                    all_matches[product_id] = best_chunk

        # Sort by similarity score (descending)
        sorted_matches = sorted(
            all_matches.values(),
            key=lambda m: m.similarity_score,
            reverse=True,
        )

        console.print(
            f"[green]✅ Found {len(sorted_matches)} unique product matches[/green]"
        )
        for m in sorted_matches[:5]:
            console.print(
                f"  [{m.similarity_score:.2%}] {m.product_name} → {m.matched_goals}"
            )

        return sorted_matches

    def match_from_profile(
        self,
        goals: list[FinancialGoal],
        n_results_per_goal: int = 15,
    ) -> list[ProductMatch]:
        """
        Convenience wrapper: extract goals from a UserProfile and match.

        Args:
            goals: Financial goals from UserProfile.
            n_results_per_goal: Products per goal.

        Returns:
            List of ProductMatch objects.
        """
        return self.match_products(goals, n_results_per_goal)


# ── CLI Entry Point ───────────────────────────────────────
def main():
    """Test the product matcher with sample goals."""
    from ai_services.models import FinancialGoal

    goals = [
        FinancialGoal(
            goal_type="child_education",
            target_amount=2_500_000,
            target_year=2040,
            priority=1,
        ),
        FinancialGoal(
            goal_type="retirement",
            target_amount=30_000_000,
            target_year=2056,
            priority=2,
        ),
        FinancialGoal(
            goal_type="protection",
            target_amount=10_000_000,
            target_year=2060,
            priority=3,
        ),
    ]

    matcher = ProductMatcher()
    matches = matcher.match_products(goals)

    console.print("\n[bold]Product Matches:[/bold]")
    for match in matches:
        console.print(
            f"  {match.product_name} ({match.category}) — "
            f"Score: {match.similarity_score:.2%} — "
            f"Goals: {match.matched_goals}"
        )


if __name__ == "__main__":
    main()
