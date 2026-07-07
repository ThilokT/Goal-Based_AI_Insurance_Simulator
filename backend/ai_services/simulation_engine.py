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

# ── Product Calculation Strategies ─────────────────────────
# Four distinct strategies based on ICICI Prudential product categories:
#
#   ULIP    → CAGR / Geometric Returns (market-linked, risk-based)
#   NON_PAR → IRR / Cash-Flow Modeling (guaranteed, flat rate)
#   ANNUITY → NPV / Reverse Calculation (guaranteed pension yield)
#   TERM    → Pure Risk (0% return, sum assured only)
#
# Reference: helper_info/product_calculation_strategy.md

# ── Strategy Type Constants ────────────────────────────────
STRATEGY_ULIP = "ulip"
STRATEGY_NON_PAR = "non_par"
STRATEGY_ANNUITY = "annuity"
STRATEGY_TERM = "term"

# ── ULIP Fund Data: 5-Year Historical CAGR Averages ───────
# Source: iciciprulife.com/fund-performance (as on July 07, 2026)
# Strategy: Simple average of all funds with available 5-Year returns
#
# Product 1: ICICI Pru Signature Assure
#   Equity (8 funds avg): Focus 50 (8.24%), Bluechip (9.30%),
#     Maximiser V (10.57%), Maximise India (10.90%), India Growth (11.05%),
#     Multi Cap Growth (11.46%), Opportunities (12.22%), Value Enhancer (14.19%)
#   Balanced (2 funds avg): Active Asset Allocation (7.63%), Multi Cap Balanced (8.81%)
#   Debt (3 funds avg): Income (4.77%), Money Market (5.59%), Secure Opps (4.80%)

SIGNATURE_EQUITY_5YR = 0.1099    # 10.99%
SIGNATURE_BALANCED_5YR = 0.0822  # 8.22%
SIGNATURE_DEBT_5YR = 0.0505      # 5.05%

# Product 4: ICICI Pru Protect N Gain
#   Equity (5 funds avg): Health Flexi Growth (11.13%), Health Multiplier (9.10%),
#     Pension Flexi Growth (10.36%), Pension RICH II (12.15%), RICH II (12.16%)
#   Balanced (2 funds avg): Active Asset Allocation (7.85%), Multi Cap Balanced (8.96%)
#   Debt (3 funds avg): Income (5.39%), Money Market (5.67%), Secure Opps (5.30%)

PROTECT_N_GAIN_EQUITY_5YR = 0.1098    # 10.98%
PROTECT_N_GAIN_BALANCED_5YR = 0.0841  # 8.41%
PROTECT_N_GAIN_DEBT_5YR = 0.0545      # 5.45%

# Product 5: ICICI Pru Wish (via Health Saver funds)
#   Equity (5 funds avg): Health Flexi Growth (11.13%), Health Multiplier (9.10%),
#     Pension Flexi Growth (10.36%), Pension RICH II (12.15%), RICH II (12.16%)
#   Balanced (2 funds avg): Health Balancer (7.54%), Health Flexi Balanced (9.19%)
#   Debt (3 funds avg): Health Preserver (5.55%), Health Protector (6.16%), Pension Protector II (6.18%)

WISH_EQUITY_5YR = 0.1098    # 10.98%
WISH_BALANCED_5YR = 0.0837  # 8.37%
WISH_DEBT_5YR = 0.0596      # 5.96%

# ── Non-Par & Annuity Fixed Rates ──────────────────────────
# These products have no market-linked funds.
# Returns are guaranteed IRR / annuity yield from IRDAI illustration rates.

NON_PAR_IRR = 0.06       # 6.0% — GIFT Pro, SmartKid 360
ANNUITY_YIELD = 0.065    # 6.5% — GPP Flexi guaranteed pension
TERM_RETURN = 0.0        # 0.0% — iProtect Smart (pure protection)

# ── ULIP Return Matrices (risk × horizon) ──────────────────
# Each ULIP product gets its own return matrix.
# Horizon adjustments: short (<5yr) gets haircut, long (>12yr) stays at base.

SIGNATURE_RETURN_MATRIX = {
    ("conservative", "short"):  SIGNATURE_DEBT_5YR,                # 5.05%
    ("conservative", "medium"): SIGNATURE_DEBT_5YR + 0.005,        # 5.55%
    ("conservative", "long"):   SIGNATURE_DEBT_5YR + 0.010,        # 6.05%

    ("moderate", "short"):      SIGNATURE_BALANCED_5YR - 0.010,    # 7.22%
    ("moderate", "medium"):     SIGNATURE_BALANCED_5YR,            # 8.22%
    ("moderate", "long"):       SIGNATURE_BALANCED_5YR + 0.005,    # 8.72%

    ("aggressive", "short"):    SIGNATURE_EQUITY_5YR - 0.020,      # 8.99%
    ("aggressive", "medium"):   SIGNATURE_EQUITY_5YR - 0.010,      # 9.99%
    ("aggressive", "long"):     SIGNATURE_EQUITY_5YR,              # 10.99%
}

PROTECT_N_GAIN_RETURN_MATRIX = {
    ("conservative", "short"):  PROTECT_N_GAIN_DEBT_5YR,                # 5.45%
    ("conservative", "medium"): PROTECT_N_GAIN_DEBT_5YR + 0.005,        # 5.95%
    ("conservative", "long"):   PROTECT_N_GAIN_DEBT_5YR + 0.010,        # 6.45%

    ("moderate", "short"):      PROTECT_N_GAIN_BALANCED_5YR - 0.010,    # 7.41%
    ("moderate", "medium"):     PROTECT_N_GAIN_BALANCED_5YR,            # 8.41%
    ("moderate", "long"):       PROTECT_N_GAIN_BALANCED_5YR + 0.005,    # 8.91%

    ("aggressive", "short"):    PROTECT_N_GAIN_EQUITY_5YR - 0.020,      # 8.98%
    ("aggressive", "medium"):   PROTECT_N_GAIN_EQUITY_5YR - 0.010,      # 9.98%
    ("aggressive", "long"):     PROTECT_N_GAIN_EQUITY_5YR,              # 10.98%
}

WISH_RETURN_MATRIX = {
    ("conservative", "short"):  WISH_DEBT_5YR,                # 5.96%
    ("conservative", "medium"): WISH_DEBT_5YR + 0.005,        # 6.46%
    ("conservative", "long"):   WISH_DEBT_5YR + 0.010,        # 6.96%

    ("moderate", "short"):      WISH_BALANCED_5YR - 0.010,    # 7.37%
    ("moderate", "medium"):     WISH_BALANCED_5YR,            # 8.37%
    ("moderate", "long"):       WISH_BALANCED_5YR + 0.005,    # 8.87%

    ("aggressive", "short"):    WISH_EQUITY_5YR - 0.020,      # 8.98%
    ("aggressive", "medium"):   WISH_EQUITY_5YR - 0.010,      # 9.98%
    ("aggressive", "long"):     WISH_EQUITY_5YR,              # 10.98%
}

# ── 7-Product Catalog ──────────────────────────────────────
# Master registry: each product has an id, name, category, strategy,
# and its return data (matrix for ULIPs, flat rate for others).

PRODUCT_CATALOG = {
    "icici-pru-signature-assure": {
        "name": "ICICI Pru Signature Assure",
        "category": "ULIP",
        "strategy": STRATEGY_ULIP,
        "return_matrix": SIGNATURE_RETURN_MATRIX,
        "has_wealth_booster": True,
    },
    "icici-pru-iprotect-smart": {
        "name": "ICICI Pru iProtect Smart Plus",
        "category": "Term Insurance",
        "strategy": STRATEGY_TERM,
        "fixed_return": TERM_RETURN,
        "has_wealth_booster": False,
    },
    "icici-pru-gift-pro": {
        "name": "ICICI Pru GIFT Pro",
        "category": "Guaranteed Income",
        "strategy": STRATEGY_NON_PAR,
        "fixed_return": NON_PAR_IRR,
        "has_wealth_booster": False,
    },
    "icici-pru-protect-n-gain": {
        "name": "ICICI Pru Protect N Gain",
        "category": "ULIP",
        "strategy": STRATEGY_ULIP,
        "return_matrix": PROTECT_N_GAIN_RETURN_MATRIX,
        "has_wealth_booster": False,
    },
    "icici-pru-wish": {
        "name": "ICICI Pru Wish",
        "category": "Health (ULIP)",
        "strategy": STRATEGY_ULIP,
        "return_matrix": WISH_RETURN_MATRIX,
        "has_wealth_booster": False,
    },
    "icici-pru-gpp-flexi": {
        "name": "ICICI Pru Guaranteed Pension Plan Flexi",
        "category": "Retirement (Annuity)",
        "strategy": STRATEGY_ANNUITY,
        "fixed_return": ANNUITY_YIELD,
        "has_wealth_booster": False,
    },
    "icici-pru-smartkid-360": {
        "name": "ICICI Pru SmartKid 360",
        "category": "Child Plan (Guaranteed)",
        "strategy": STRATEGY_NON_PAR,
        "fixed_return": NON_PAR_IRR,
        "has_wealth_booster": False,
    },
}

# Wealth Booster: 3.25% of average fund value, every 5 years from year 10
# Source: IPru Signature Assure brochure
WEALTH_BOOSTER_RATE = 0.0325
WEALTH_BOOSTER_START_YEAR = 10
WEALTH_BOOSTER_INTERVAL = 5

# ── Goal → Product Mapping ─────────────────────────────────
# Maps user goal types to the recommended ICICI product from the catalog.
GOAL_PRODUCT_MAP = {
    # Wealth creation goals → Signature Assure (ULIP, broadest fund selection)
    "wealth_creation":    "icici-pru-signature-assure",
    "business_fund":      "icici-pru-signature-assure",

    # Retirement goals → GPP Flexi (Annuity, guaranteed pension)
    "retirement":         "icici-pru-gpp-flexi",
    "retirement_planning":"icici-pru-gpp-flexi",

    # Child goals → SmartKid 360 (Non-Par, milestone payouts + premium waiver)
    "child_education":    "icici-pru-smartkid-360",
    "child_marriage":     "icici-pru-smartkid-360",

    # Home purchase → Protect N Gain (ULIP, protection + growth)
    "home_purchase":      "icici-pru-protect-n-gain",

    # Family protection → iProtect Smart Plus (Term, highest cover at lowest cost)
    "family_protection":  "icici-pru-iprotect-smart",
    "protection":         "icici-pru-iprotect-smart",

    # Legacy / guaranteed income → GIFT Pro (Non-Par, guaranteed income stream)
    "legacy":             "icici-pru-gift-pro",

    # Health protection → Wish (ULIP via Health Saver funds)
    "health":             "icici-pru-wish",

    # Travel / general savings → Protect N Gain (balanced growth + protection)
    "travel":             "icici-pru-protect-n-gain",
}

# Goals eligible for ULIP wealth boosters (only Signature Assure-mapped goals)
ULIP_ELIGIBLE_GOALS = {"wealth_creation", "business_fund"}

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

    # ── Strategy-Routed Return Rate ─────────────────────────

    def _get_adjusted_return(
        self,
        goal_type: str,
        years: int,
        risk_appetite: str = "moderate",
        return_override: Optional[float] = None,
    ) -> float:
        """
        Get return rate using the product's calculation strategy.

        Strategy routing:
          - ULIP:    CAGR from product-specific return matrix (risk × horizon)
          - NON_PAR: Fixed IRR (6.0%) — guaranteed, risk-independent
          - ANNUITY: Fixed annuity yield (6.5%) — guaranteed pension
          - TERM:    0.0% — pure protection, no investment
        """
        if return_override is not None:
            return return_override

        # Lookup the recommended product from the 7-product catalog
        product = get_product_for_goal(goal_type)
        strategy = product.get("strategy", STRATEGY_ULIP)

        # ── NON_PAR / ANNUITY / TERM: fixed rate, no market risk ──
        if strategy in (STRATEGY_NON_PAR, STRATEGY_ANNUITY, STRATEGY_TERM):
            return product.get("fixed_return", self.expected_return)

        # ── ULIP: risk-appetite × horizon matrix lookup ──
        bucket = _horizon_bucket(years)
        appetite = risk_appetite.lower() if risk_appetite else "moderate"
        if appetite not in ("conservative", "moderate", "aggressive"):
            appetite = "moderate"

        matrix = product.get("return_matrix", SIGNATURE_RETURN_MATRIX)
        return matrix.get((appetite, bucket), self.expected_return)

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

        normalized_type = goal.goal_type.lower().replace(" ", "_").strip()

        provided_target = goal.target_year or (current_year + 10)
        # If the frontend sent an age (e.g., 55) instead of a calendar year (e.g., 2045), convert it
        if provided_target < 2000:
            target_year = current_year + (provided_target - user_age)
        else:
            target_year = provided_target

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
        if normalized_type in ULIP_ELIGIBLE_GOALS and years_remaining >= WEALTH_BOOSTER_START_YEAR:
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
                    normalized_goal_type = goal.goal_type.lower().replace(" ", "_").strip()
                    if normalized_goal_type in ULIP_ELIGIBLE_GOALS and year >= WEALTH_BOOSTER_START_YEAR:
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
        Uses the 7-product catalog and strategy-routed return rates.
        """
        # Demographic matching logic to select best product
        goal_type = "wealth_creation"
        if risk_appetite == "conservative":
            goal_type = "protection" if user_age > 40 else "home_purchase"
        elif user_age >= 50:
            goal_type = "retirement"

        matched_product = get_product_for_goal(goal_type)
        product_name = matched_product["name"]
        strategy = matched_product.get("strategy", STRATEGY_ULIP)

        # Get return rate using strategy routing
        return_rate = self._get_adjusted_return(
            goal_type, tenure_years, risk_appetite
        )

        # Check if this product gets wealth boosters
        has_booster = matched_product.get("has_wealth_booster", False)

        yearly_projections = []
        total_invested = 0.0
        projected_corpus = 0.0

        annual_increment = 0.0  # Standard product simulation without stepped SIP

        from ai_services.models import YearlyProjection
        for year in range(1, tenure_years + 1):
            # 1. Invested
            invested_this_year = monthly_premium * 12
            total_invested += invested_this_year

            # 2. SIP FV for this year
            sip_fv = self.stepped_sip_future_value(
                monthly_premium, return_rate, annual_increment, year
            )

            # 3. Product specific boosters (only Signature Assure)
            booster_fv = 0.0
            if has_booster and year >= WEALTH_BOOSTER_START_YEAR:
                booster_fv = self.wealth_booster_value(
                    monthly_premium * 12, return_rate, year
                )

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
            "product_strategy": strategy,
            "monthly_premium": monthly_premium,
            "tenure_years": tenure_years,
            "total_invested": round(total_invested, 2),
            "projected_corpus": round(projected_corpus, 2),
            "expected_return_rate": return_rate,
            "yearly_projections": yearly_projections,
        }



# ── Utility: Get product recommendation for a goal ────────
def get_product_for_goal(goal_type: str) -> dict:
    """
    Return the recommended ICICI product dict from the 7-product catalog.

    Returns the full product entry including name, category, strategy,
    return_matrix (for ULIPs) or fixed_return (for Non-Par/Annuity/Term),
    and has_wealth_booster flag.
    """
    key = goal_type.lower().replace(" ", "_").strip()
    product_id = GOAL_PRODUCT_MAP.get(key, "icici-pru-signature-assure")
    product = PRODUCT_CATALOG.get(product_id, PRODUCT_CATALOG["icici-pru-signature-assure"])
    # Inject the product ID into the returned dict for downstream use
    return {"id": product_id, **product}


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
