"""
Financial Simulation Engine — Corpus, Inflation, & Gap Analysis.

Enhanced NumPy-based engine for goal-based financial planning.
Uses brochure-backed return rates from ICICI Prudential products,
risk-appetite-aware blended returns, stepped-up SIP calculations,
existing savings compounding, and wealth booster projections.

Supports both single-goal and multi-goal simulations with what-if overrides.

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

# ── Brochure-Backed Return Rate Matrix ────────────────────
# Derived from ICICI Pru Signature brochure fund data:
#   - Equity funds (Multi Cap Growth, Focus 50): ~12-14% gross, ~11% net of 1.35% FMC
#   - Balanced funds (Multi Cap Balanced, Active Allocation): ~9-10% net
#   - Debt funds (Income Fund, Secure Opps): ~7-8% net
#   - Money Market: ~5-6% net
#
# Life Cycle Strategy 2 age-based allocation:
#   Age ≤25: 80% equity / 20% debt
#   26-35:   75% / 25%
#   36-45:   65% / 35%
#   46-55:   55% / 45%
#   56-65:   45% / 55%
#   66+:     35% / 65%

# Net returns after 1.35% FMC deduction
EQUITY_RETURN_NET = 0.11        # ~12.35% gross - 1.35% FMC
BALANCED_RETURN_NET = 0.09      # ~10.35% gross - 1.35% FMC
DEBT_RETURN_NET = 0.07          # ~8.35% gross - 1.35% FMC

# Risk appetite → blended return by investment horizon
RETURN_MATRIX = {
    # (risk_appetite, horizon_bucket) → blended_annual_return
    ("conservative", "short"):  0.065,    # Mostly debt: Income Fund + FD
    ("conservative", "medium"): 0.070,    # 25% equity, 75% debt
    ("conservative", "long"):   0.075,    # 30% equity, 70% debt

    ("moderate", "short"):      0.070,    # 40% equity, 60% debt
    ("moderate", "medium"):     0.085,    # 55% equity, 45% debt (Life Cycle age 46-55)
    ("moderate", "long"):       0.090,    # 65% equity, 35% debt (Life Cycle age 36-45)

    ("aggressive", "short"):    0.080,    # 60% equity, 40% debt
    ("aggressive", "medium"):   0.100,    # 75% equity, 25% debt (Life Cycle age 26-35)
    ("aggressive", "long"):     0.110,    # 80% equity, 20% debt (Focus 50 / Multi Cap Growth)
}

# Wealth Booster: 3.25% of average fund value, every 5 years from year 10
# Source: IPru Signature brochure — "Wealth Boosters at the end of every 5th
#         policy year starting from the end of 10th policy year"
WEALTH_BOOSTER_RATE = 0.0325
WEALTH_BOOSTER_START_YEAR = 10
WEALTH_BOOSTER_INTERVAL = 5

# Goal → Product mapping from seed_products.json
GOAL_PRODUCT_MAP = {
    "retirement":         {"name": "ICICI Pru Easy Retirement",              "category": "Retirement",       "id": "icici-pru-easy-retirement"},
    "retirement_planning":{"name": "ICICI Pru Easy Retirement",              "category": "Retirement",       "id": "icici-pru-easy-retirement"},
    "child_education":    {"name": "ICICI Pru Smart Kid",                    "category": "Child Plan",       "id": "icici-pru-smart-kid"},
    "home_purchase":      {"name": "ICICI Pru Guaranteed Wealth Protector",  "category": "Endowment",        "id": "icici-pru-guaranteed-wealth-protector"},
    "family_protection":  {"name": "ICICI Pru iProtect Smart",              "category": "Term Insurance",   "id": "icici-pru-i-protect-smart"},
    "protection":         {"name": "ICICI Pru iProtect Smart",              "category": "Term Insurance",   "id": "icici-pru-i-protect-smart"},
    "wealth_creation":    {"name": "ICICI Pru Signature",                   "category": "ULIP",             "id": "icici-pru-signature"},
    "child_marriage":     {"name": "ICICI Pru Smart Kid",                    "category": "Child Plan",       "id": "icici-pru-smart-kid"},
    "legacy":             {"name": "ICICI Pru Gold",                        "category": "Guaranteed Income", "id": "icici-pru-gold"},
    "health":             {"name": "ICICI Pru Heart / Cancer Protect",      "category": "Health Insurance", "id": "icici-pru-heart-cancer-protect"},
    "travel":             {"name": "ICICI Pru Guaranteed Wealth Protector",  "category": "Endowment",        "id": "icici-pru-guaranteed-wealth-protector"},
    "business_fund":      {"name": "ICICI Pru Signature",                   "category": "ULIP",             "id": "icici-pru-signature"},
}

# Goals eligible for ULIP wealth boosters
ULIP_ELIGIBLE_GOALS = {"retirement", "retirement_planning", "wealth_creation", "child_education", "business_fund"}

# Education abroad cost multiplier (source: industry standard 2-2.5x for US/UK vs India)
ABROAD_EDUCATION_MULTIPLIER = 2.2


def _horizon_bucket(years: int) -> str:
    """Classify investment horizon into short/medium/long."""
    if years <= 5:
        return "short"
    elif years <= 12:
        return "medium"
    else:
        return "long"


class SimulationEngine:
    """
    Enhanced NumPy-based financial simulation engine.

    Computes:
      - Future value of goals adjusted for inflation
      - Risk-appetite-aware blended return rates (from ICICI fund data)
      - Stepped-up SIP with annual increment
      - Existing savings compounding as lump sum
      - ULIP Wealth Booster projections (3.25% every 5yr from yr10)
      - Monthly SIP required to reach the target
      - Gap analysis (shortfall between projected and required)
      - Product recommendation per goal
    """

    def __init__(
        self,
        inflation_rate: float = DEFAULT_INFLATION_RATE,
        expected_return: float = DEFAULT_RETURN_RATE,
        risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
        retirement_age: int = DEFAULT_RETIREMENT_AGE,
        life_expectancy: int = DEFAULT_LIFE_EXPECTANCY,
    ):
        self.inflation_rate = inflation_rate
        self.expected_return = expected_return
        self.risk_free_rate = risk_free_rate
        self.retirement_age = retirement_age
        self.life_expectancy = life_expectancy

    # ── Core Financial Math ───────────────────────────────

    @staticmethod
    def future_value(present_value: float, rate: float, years: int) -> float:
        """FV = PV × (1 + r)^n"""
        return float(present_value * np.power(1 + rate, years))

    @staticmethod
    def present_value(future_value: float, rate: float, years: int) -> float:
        """PV = FV / (1 + r)^n"""
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
        PMT = FV × r / ((1 + r)^n - 1)
        """
        if years <= 0:
            return target_amount

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
        """FV of a flat monthly SIP."""
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

    @staticmethod
    def stepped_sip_future_value(
        monthly_amount: float,
        annual_return: float,
        annual_increment: float,
        years: int,
    ) -> float:
        """
        Future value of a SIP that increases by `annual_increment` each year.

        Year 1: monthly_amount
        Year 2: monthly_amount × (1 + annual_increment)
        Year 3: monthly_amount × (1 + annual_increment)^2
        ...

        Each year's SIP compounds for the remaining years.
        """
        if years <= 0 or monthly_amount <= 0:
            return 0.0

        if annual_increment <= 0:
            # Fall back to flat SIP
            return SimulationEngine.sip_future_value(monthly_amount, annual_return, years)

        monthly_rate = annual_return / 12
        total_fv = 0.0

        for year in range(years):
            # SIP amount for this year
            year_sip = monthly_amount * np.power(1 + annual_increment, year)
            remaining_months = (years - year) * 12

            if monthly_rate == 0:
                total_fv += year_sip * 12
            else:
                # FV of 12 months of this year's SIP, compounded for remaining period
                fv_one_year = year_sip * (
                    (np.power(1 + monthly_rate, 12) - 1) / monthly_rate
                ) * (1 + monthly_rate)
                # Compound that lump sum for the remaining years after this year
                remaining_years = years - year - 1
                if remaining_years > 0:
                    fv_one_year = fv_one_year * np.power(1 + annual_return, remaining_years)
                total_fv += fv_one_year

        return float(total_fv)

    @staticmethod
    def wealth_booster_value(
        annual_sip: float,
        annual_return: float,
        years: int,
    ) -> float:
        """
        Estimate ULIP Wealth Booster additions.

        From IPru Signature brochure: 3.25% of average fund value
        at end of every 5th year starting from year 10.
        """
        if years < WEALTH_BOOSTER_START_YEAR:
            return 0.0

        total_booster = 0.0
        # Estimate fund value at each booster year
        for yr in range(WEALTH_BOOSTER_START_YEAR, years + 1, WEALTH_BOOSTER_INTERVAL):
            # Approximate fund value at this point
            fund_at_yr = SimulationEngine.sip_future_value(
                annual_sip / 12, annual_return, yr
            )
            booster = fund_at_yr * WEALTH_BOOSTER_RATE
            # Compound booster for remaining years
            remaining = years - yr
            if remaining > 0:
                booster = booster * np.power(1 + annual_return, remaining)
            total_booster += booster

        return float(total_booster)

    def retirement_corpus_needed(
        self,
        current_age: int,
        monthly_expenses: float,
        retirement_age: Optional[int] = None,
        life_expectancy: Optional[int] = None,
        inflation_rate: Optional[float] = None,
    ) -> float:
        """
        Calculate the corpus needed at retirement to sustain current lifestyle.
        Accounts for inflation until retirement and draws down with
        risk-free returns during retirement.
        """
        ret_age = retirement_age or self.retirement_age
        le = life_expectancy or self.life_expectancy
        infl = inflation_rate or self.inflation_rate

        years_to_retirement = ret_age - current_age
        retirement_years = le - ret_age

        if years_to_retirement <= 0 or retirement_years <= 0:
            return 0.0

        annual_expenses_today = monthly_expenses * 12
        annual_expenses_at_retirement = self.future_value(
            annual_expenses_today, infl, years_to_retirement
        )

        real_return = (
            (1 + self.risk_free_rate) / (1 + infl)
        ) - 1

        if real_return <= 0:
            corpus = annual_expenses_at_retirement * retirement_years
        else:
            corpus = annual_expenses_at_retirement * (
                (1 - np.power(1 + real_return, -retirement_years)) / real_return
            )

        return float(corpus)

    # ── Risk-Aware Return Rate ────────────────────────────

    def _get_adjusted_return(
        self,
        goal_type: str,
        years: int,
        risk_appetite: str = "moderate",
        return_override: Optional[float] = None,
    ) -> float:
        """
        Get blended return rate based on risk appetite, goal type, and horizon.
        Uses the brochure-backed RETURN_MATRIX.
        """
        if return_override is not None:
            return return_override

        # Conservative goals always get risk-free rate
        conservative_goals = {"protection", "health", "family_security", "debt_repayment", "family_protection"}
        if goal_type.lower() in conservative_goals:
            return self.risk_free_rate

        bucket = _horizon_bucket(years)
        appetite = risk_appetite.lower() if risk_appetite else "moderate"
        if appetite not in ("conservative", "moderate", "aggressive"):
            appetite = "moderate"

        return RETURN_MATRIX.get((appetite, bucket), self.expected_return)

    # ── Single Goal Simulation ────────────────────────────

    def simulate_goal(
        self,
        goal: FinancialGoal,
        user_age: int,
        current_savings: float = 0.0,
        existing_savings: float = 0.0,
        annual_increment: float = 0.0,
        risk_appetite: str = "moderate",
        inflation_override: Optional[float] = None,
        return_override: Optional[float] = None,
        child_education_abroad: bool = False,
        retirement_age_override: Optional[int] = None,
    ) -> SimulationResult:
        """
        Run a financial simulation for a single goal with full what-if support.
        """
        current_year = datetime.now().year

        # For retirement goals, use the retirement age to determine target year
        if goal.goal_type.lower() in ("retirement", "retirement_planning"):
            ret_age = retirement_age_override or self.retirement_age
            target_year = current_year + (ret_age - user_age)
        else:
            target_year = goal.target_year or (current_year + 10)

        years_remaining = max(1, target_year - current_year)

        # Use inflation override if provided (from what-if slider)
        inflation = inflation_override if inflation_override is not None else self.inflation_rate

        # Get risk-aware blended return
        adjusted_return = self._get_adjusted_return(
            goal.goal_type, years_remaining, risk_appetite, return_override
        )

        # Inflation-adjusted future value of the goal
        future_target = self.future_value(
            goal.target_amount, inflation, years_remaining
        )

        # Apply education abroad multiplier
        if child_education_abroad and goal.goal_type.lower() in ("child_education", "education"):
            future_target *= ABROAD_EDUCATION_MULTIPLIER

        # ── Projected corpus from multiple sources ────────

        # 1. Existing savings (lump sum compounding)
        lump_sum_fv = self.future_value(existing_savings, adjusted_return, years_remaining) if existing_savings > 0 else 0.0

        # 2. Current monthly SIP (flat or stepped)
        monthly_savings = current_savings or goal.monthly_contribution or 0.0
        if annual_increment > 0 and monthly_savings > 0:
            sip_fv = self.stepped_sip_future_value(
                monthly_savings, adjusted_return, annual_increment, years_remaining
            )
        else:
            sip_fv = self.sip_future_value(
                monthly_savings, adjusted_return, years_remaining
            )

        # 3. Wealth Booster (only for ULIP-eligible goals)
        booster_fv = 0.0
        if goal.goal_type.lower() in ULIP_ELIGIBLE_GOALS and years_remaining >= WEALTH_BOOSTER_START_YEAR:
            annual_sip = monthly_savings * 12
            booster_fv = self.wealth_booster_value(
                annual_sip, adjusted_return, years_remaining
            )

        projected_corpus = lump_sum_fv + sip_fv + booster_fv

        # Gap analysis
        gap = max(0.0, future_target - projected_corpus)
        coverage_ratio = min(1.0, projected_corpus / future_target if future_target > 0 else 0.0)

        # Monthly SIP required to close the gap (not the entire target)
        monthly_required = self.monthly_sip_required(
            gap, adjusted_return, years_remaining
        ) if gap > 0 else 0.0

        result = SimulationResult(
            goal_type=goal.goal_type,
            target_amount=goal.target_amount,
            future_value=round(future_target, 2),
            years_remaining=years_remaining,
            monthly_savings_required=round(monthly_required, 2),
            current_gap=round(gap, 2),
            projected_corpus=round(projected_corpus, 2),
            coverage_ratio=round(coverage_ratio, 4),
            inflation_rate=inflation,
            expected_return=adjusted_return,
        )

        console.print(
            f"[cyan]Goal '{goal.goal_type}': "
            f"INR {future_target:,.0f} needed in {years_remaining}y, "
            f"projected INR {projected_corpus:,.0f} (lump={lump_sum_fv:,.0f} + SIP={sip_fv:,.0f} + booster={booster_fv:,.0f}), "
            f"gap INR {gap:,.0f}, "
            f"return {adjusted_return:.1%}, coverage {coverage_ratio:.0%}[/cyan]"
        )

        return result

    # ── Multi-Goal Simulation ─────────────────────────────

    def simulate_all_goals(
        self,
        profile: UserProfile,
        existing_savings: float = 0.0,
        annual_increment: float = 0.0,
        inflation_override: Optional[float] = None,
        return_override: Optional[float] = None,
        child_education_abroad: bool = False,
        retirement_age_override: Optional[int] = None,
    ) -> MultiGoalSimulationResult:
        """
        Run simulations for ALL goals with full what-if support.
        """
        if not profile.age:
            raise ValueError("User age is required for simulation")

        if not profile.goals:
            raise ValueError("At least one goal is required for simulation")

        risk = profile.risk_appetite or "moderate"

        console.print(f"\n[bold cyan]>> Multi-Goal Simulation for age {profile.age} "
                       f"(risk={risk}, inflation={inflation_override or self.inflation_rate:.1%}, "
                       f"savings={existing_savings:,.0f}, increment={annual_increment:.1%})[/bold cyan]")

        # Distribute existing savings proportionally across goals by priority
        num_goals = len(profile.goals)
        savings_per_goal = existing_savings / num_goals if num_goals > 0 else 0.0

        goal_results = []
        for goal in profile.goals:
            monthly_savings = goal.monthly_contribution or 0.0
            result = self.simulate_goal(
                goal,
                profile.age,
                current_savings=monthly_savings,
                existing_savings=savings_per_goal,
                annual_increment=annual_increment,
                risk_appetite=risk,
                inflation_override=inflation_override,
                return_override=return_override,
                child_education_abroad=child_education_abroad,
                retirement_age_override=retirement_age_override,
            )
            goal_results.append(result)

        # Sort by priority
        goal_results.sort(
            key=lambda r: next(
                (g.priority for g in profile.goals if g.goal_type == r.goal_type),
                5
            )
        )

        total_monthly = sum(r.monthly_savings_required for r in goal_results)
        total_gap = sum(r.current_gap for r in goal_results)

        # Calculate yearly projections (assuming the user follows the recommended plan)
        yearly_projections = []
        if goal_results:
            max_years = max((r.years_remaining for r in goal_results), default=0)
            from ai_services.models import YearlyProjection
            for year in range(1, max_years + 1):
                total_invested = 0.0
                projected_corpus = 0.0

                for goal, res in zip(profile.goals, goal_results):
                    # We only project while the goal is active
                    if year > res.years_remaining:
                        continue
                    
                    adjusted_return = res.expected_return
                    
                    # 1. Lump sum (existing savings)
                    lump_fv = self.future_value(savings_per_goal, adjusted_return, year)
                    
                    # 2. SIP (Current + Required to close the gap)
                    monthly_savings = (goal.monthly_contribution or 0.0) + res.monthly_savings_required
                    sip_fv = self.stepped_sip_future_value(monthly_savings, adjusted_return, annual_increment, year)
                    
                    # 3. Booster
                    booster_fv = 0.0
                    if goal.goal_type.lower() in ULIP_ELIGIBLE_GOALS and year >= WEALTH_BOOSTER_START_YEAR:
                        booster_fv = self.wealth_booster_value(monthly_savings * 12, adjusted_return, year)
                        
                    # Invested computation
                    if annual_increment == 0:
                        invested_sip = monthly_savings * 12 * year
                    else:
                        invested_sip = sum(monthly_savings * 12 * np.power(1 + annual_increment, yr) for yr in range(year))
                    
                    total_invested += savings_per_goal + invested_sip
                    projected_corpus += lump_fv + sip_fv + booster_fv
                
                yearly_projections.append(YearlyProjection(
                    year=year,
                    age=profile.age + year,
                    total_invested=round(total_invested, 2),
                    projected_corpus=round(projected_corpus, 2)
                ))

        result = MultiGoalSimulationResult(
            user_age=profile.age,
            total_monthly_savings_required=round(total_monthly, 2),
            total_gap=round(total_gap, 2),
            goals=goal_results,
            yearly_projections=yearly_projections,
        )

        console.print(
            f"\n[bold green]Total: INR {total_monthly:,.0f}/mo needed, "
            f"INR {total_gap:,.0f} gap[/bold green]\n"
        )

        return result

    def simulate_retirement(
        self,
        profile: UserProfile,
        inflation_override: Optional[float] = None,
        retirement_age_override: Optional[int] = None,
    ) -> SimulationResult:
        """Convenience method to simulate retirement as a standalone goal."""
        if not profile.age or not profile.monthly_expenses:
            raise ValueError("Age and monthly_expenses required for retirement simulation")

        ret_age = retirement_age_override or self.retirement_age

        retirement_corpus = self.retirement_corpus_needed(
            current_age=profile.age,
            monthly_expenses=profile.monthly_expenses,
            retirement_age=ret_age,
            inflation_rate=inflation_override,
        )

        retirement_goal = FinancialGoal(
            goal_type="retirement",
            target_amount=retirement_corpus,
            target_year=datetime.now().year + (ret_age - profile.age),
            priority=1,
        )

        return self.simulate_goal(retirement_goal, profile.age)

    def simulate_matched_product(
        self,
        user_age: int,
        monthly_premium: float,
        tenure_years: int,
        risk_appetite: str = "moderate",
    ) -> dict:
        """
        Simulate a specific product directly (forward projection).
        Matches product based on user demographics (age, risk).
        """
        # Demographic matching logic to select best product
        goal_type = "wealth_creation"
        if risk_appetite == "conservative":
            goal_type = "protection" if user_age > 40 else "home_purchase"
        elif user_age >= 50:
            goal_type = "retirement"
            
        matched_product = get_product_for_goal(goal_type)
        product_name = matched_product["name"]
        product_category = matched_product["category"].lower()
        
        # Determine return rate based on risk
        return_rate = self.RETURN_MATRIX.get(risk_appetite, self.RETURN_MATRIX["moderate"])["long"]
        
        yearly_projections = []
        total_invested = 0.0
        projected_corpus = 0.0
        
        annual_increment = 0.0 # Standard product simulation without stepped SIP by default
        
        from ai_services.models import YearlyProjection
        for year in range(1, tenure_years + 1):
            # 1. Invested
            invested_this_year = monthly_premium * 12
            total_invested += invested_this_year
            
            # 2. SIP FV for this year
            # Stepped SIP FV calculates the FV of all stepped SIPs up to 'year'.
            sip_fv = self.stepped_sip_future_value(monthly_premium, return_rate, annual_increment, year)
            
            # 3. Product specific boosters
            booster_fv = 0.0
            if "ulip" in product_category and year >= WEALTH_BOOSTER_START_YEAR:
                booster_fv = self.wealth_booster_value(monthly_premium * 12, return_rate, year)
                
            projected_corpus = sip_fv + booster_fv
            
            yearly_projections.append(YearlyProjection(
                year=year,
                age=user_age + year,
                total_invested=round(total_invested, 2),
                projected_corpus=round(projected_corpus, 2)
            ))
            
        return {
            "product_name": product_name,
            "product_category": matched_product["category"],
            "monthly_premium": monthly_premium,
            "tenure_years": tenure_years,
            "total_invested": round(total_invested, 2),
            "projected_corpus": round(projected_corpus, 2),
            "expected_return_rate": return_rate,
            "yearly_projections": yearly_projections,
        }



# ── Utility: Get product recommendation for a goal ────────
def get_product_for_goal(goal_type: str) -> dict:
    """Return the recommended ICICI product for a given goal type."""
    key = goal_type.lower()
    return GOAL_PRODUCT_MAP.get(key, {
        "name": "ICICI Pru Signature",
        "category": "ULIP",
        "id": "icici-pru-signature",
    })


# ── CLI Entry Point ───────────────────────────────────────
def main():
    """Test the enhanced simulation engine."""
    engine = SimulationEngine()

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

    # Simulate with what-if: 5L existing savings, 8% annual increment
    result = engine.simulate_all_goals(
        profile,
        existing_savings=500_000,
        annual_increment=0.08,
    )

    console.print("\n[bold]Simulation Results:[/bold]")
    for goal in result.goals:
        product = get_product_for_goal(goal.goal_type)
        console.print(f"\n  Goal: {goal.goal_type}")
        console.print(f"  Target (inflated): INR {goal.future_value:,.0f}")
        console.print(f"  Monthly SIP needed: INR {goal.monthly_savings_required:,.0f}")
        console.print(f"  Projected corpus: INR {goal.projected_corpus:,.0f}")
        console.print(f"  Coverage: {goal.coverage_ratio:.0%}")
        console.print(f"  Gap: INR {goal.current_gap:,.0f}")
        console.print(f"  Return rate: {goal.expected_return:.1%}")
        console.print(f"  Recommended: {product['name']} ({product['category']})")


if __name__ == "__main__":
    main()
