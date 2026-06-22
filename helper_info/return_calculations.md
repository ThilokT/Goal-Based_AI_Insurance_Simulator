# How Returns Are Calculated in the Simulator

In the LifeMap Insurance Simulator, returns are **deterministic** (not stochastic or Monte Carlo) and are calculated using standard compounding and annuity formulas. The specific **rate of return** applied depends heavily on the user's demographic profile (risk appetite) and the time horizon of their goals.

Here is exactly how the system calculates returns.

## 1. The Rate Selection Engine (The Matrix)

The system does not use arbitrary return rates. Instead, it uses a hardcoded matrix that blends historical ICICI Prudential fund performance data based on a combination of **Risk Appetite** and **Time Horizon**.

This is defined in `backend/ai_services/simulation_engine.py`:

```python
# The foundational Return Rate Matrix
RETURN_MATRIX = {
    ("conservative", "short"):  0.065,   # Mostly debt
    ("conservative", "medium"): 0.070,   # 25% equity, 75% debt
    ("conservative", "long"):   0.075,   # 30% equity, 70% debt
    ("moderate", "short"):      0.070,   # 40/60
    ("moderate", "medium"):     0.085,   # 55/45 (Life Cycle age 46-55)
    ("moderate", "long"):       0.090,   # 65/35 (Life Cycle age 36-45)
    ("aggressive", "short"):    0.080,   # 60/40
    ("aggressive", "medium"):   0.100,   # 75/25 (Life Cycle age 26-35)
    ("aggressive", "long"):     0.110,   # 80/20 (Focus 50)
}
```

### Time Horizon Buckets

The `years_remaining` for a goal determines the horizon bucket:

- **short**: ≤ 5 years
- **medium**: 6 to 12 years
- **long**: 13+ years

### Special "Conservative" Rule

For specific "defensive" goal types—like `protection`, `health`, `family_security`, `debt_repayment`, or `family_protection`—the system ignores the matrix and strictly applies a **conservative risk-free rate of 6.5%**, regardless of the user's risk appetite or timeline.

---

## 2. Applying Returns: The Core Formulas

Once the engine looks up the appropriate `return_rate` from the matrix, it applies that rate to the user's savings and investments using standard compounding formulas.

### A. Lump Sum Compounding (Future Value)

If a user has existing savings (`existing_savings`), the return rate compounds those savings using the standard Future Value formula:

```python
# simulation_engine.py L146-148
@staticmethod
def future_value(present_value: float, rate: float, years: int) -> float:
    return float(present_value * np.power(1 + rate, years))
```

*Formula: `FV = PV * (1 + rate)^years`*

### B. Monthly Contributions (Stepped SIP)

Most users contribute monthly to their goals. The system calculates the returns on these contributions using an **Annuity Due** formula (which assumes investments are made at the beginning of the period) and handles annual increments (step-ups).

Instead of a single formula, the engine calculates the return year-by-year, compounding the results:

```python
for year in range(years):
    # 1. Determine this year's monthly amount (accounting for step-ups)
    year_sip = monthly_amount * np.power(1 + annual_increment, year)
    
    # 2. Calculate the future value of just this year's 12 contributions at the end of the year
    # This is the Annuity Due formula
    fv_one_year = year_sip * ((np.power(1 + monthly_rate, 12) - 1) / monthly_rate) * (1 + monthly_rate)
    
    # 3. Compound that single year's total for the REMAINING years until the goal
    fv_one_year *= np.power(1 + annual_return, years - year - 1)
    
    # 4. Add to total projected corpus
    total_fv += fv_one_year
```

---

## 3. The "Wealth Booster" Returns (ULIP Bonus)

If the selected product is a ULIP (e.g., `ICICI Pru Signature`) and the investment horizon is at least 10 years, the return calculation gets an artificial boost straight from the product brochure.

The system adds **3.25% of the average fund value** at the end of every 5-year block starting in year 10.

```python
for yr in range(10, years + 1, 5):
    # Calculate what the fund is worth at year 'yr'
    fund_at_yr = self.sip_future_value(monthly_amount, annual_return, yr)
    
    # Apply the 3.25% booster
    booster = fund_at_yr * 0.0325
    
    # Compound that booster for the remaining years
    booster *= np.power(1 + annual_return, years - yr)
    
    total_booster += booster
```

---

## 4. Closing the Gap (The Reverse Calculation)

In goal-based simulation, the system doesn't just project returns forward; it calculates backward to determine how much the user *needs* to invest monthly to hit a target.

1. It inflates the target goal amount (e.g., ₹25L today for education in 15 years becomes ₹59L at 6% inflation).
2. It subtracts what the user will already have (current savings projected forward using the `RETURN_MATRIX`).
3. It takes that gap and calculates the required PMT (Payment) using the target return rate:

```python
monthly_rate = annual_return / 12
total_months = years * 12
numerator = target_amount * monthly_rate
denominator = np.power(1 + monthly_rate, total_months) - 1

required_monthly_sip = numerator / denominator
```

## Summary

1. **Rate Determination**: `RETURN_MATRIX` (Risk Appetite + Time Horizon) = e.g., `9.0%`
2. **Existing Money**: `PV * (1 + rate)^n`
3. **Monthly Money**: Stepped Annuity Due formula
4. **ULIP Bonus**: 3.25% flat bonus applied every 5 years (yr 10+)
5. **Final Return**: Sum of Lump Sum Growth + Monthly Contribution Growth + Wealth Boosters.
