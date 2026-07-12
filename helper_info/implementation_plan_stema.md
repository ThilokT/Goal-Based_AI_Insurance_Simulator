# Core Engine Redesign: Realistic Simulation & What-If Engine

## Problem Statement

The current simulation engine has two critical gaps:

1. **The backend engine** ([simulation_engine.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/ai_services/simulation_engine.py)) uses hardcoded return rates (10% market, 6.5% risk-free) and a single inflation rate (6%). It does not factor in the user's risk appetite, existing savings, or annual salary increments. Most critically, it does not use any data from the actual ICICI Prudential brochures.

2. **The What-If sliders** ([WhatIfPanel.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/simulation/WhatIfPanel.tsx)) send API calls, but the backend `/api/simulate` endpoint does **not accept** `inflationRate`, `existingSavings`, `annualIncrementPercent`, or `retirementAge` as parameters. The what-if values are silently ignored by the backend.

3. **The local fallback** ([simulation.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/mocks/simulation.ts)) uses simplistic placeholder math (`coveredAmount = savingsGrowth + income * years * 1.5`), producing unrealistic coverage figures.

---

## Proposed Changes

### Component 1: Backend — Enhanced SimulateRequest Schema

#### [MODIFY] [simulate.py (schema)](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/schemas/simulate.py)

Add the what-if parameters to the API contract so the frontend sliders actually affect the simulation:

```python
class SimulateRequest(BaseModel):
    age: int
    annual_income: Optional[float] = None
    monthly_expenses: Optional[float] = None
    dependents: Optional[int] = None
    risk_appetite: Optional[str] = "moderate"
    goals: list[GoalInput]
    # ── NEW: What-If Parameters ──
    inflation_rate: Optional[float] = None          # e.g., 0.06 for 6%
    existing_savings: Optional[float] = 0.0         # Lump sum already saved
    annual_increment_percent: Optional[float] = 0.0 # Salary growth %
    retirement_age: Optional[int] = 60              # For retirement corpus calc
    child_education_abroad: Optional[bool] = False   # 2.2x multiplier
```

---

### Component 2: Backend — Brochure-Backed Return Rate Engine

#### [MODIFY] [simulation_engine.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/ai_services/simulation_engine.py)

**Key improvements:**

1. **Risk-Appetite-Aware Returns:**  Instead of a single `_get_adjusted_return()`, create a matrix using real ICICI product data:

| Risk Appetite | Equity % | Debt % | Blended Return | Source |
|---|---|---|---|---|
| Conservative | 25% | 75% | ~7.5% | Income Fund + Secure Opps Fund |
| Moderate | 55% | 45% | ~9.0% | Multi Cap Balanced + Income |
| Aggressive | 80% | 20% | ~11.0% | Multi Cap Growth Fund / Focus 50 |

These are based on the brochure's **Life Cycle Portfolio Strategy** (age-based allocation from IPru Signature) and the **Fund Management Charges** of 1.35% p.a. deducted from gross returns.

2. **What-If Parameters Flow Through:**
   - `inflation_rate` overrides `self.inflation_rate` for the simulation run
   - `existing_savings` is treated as a lump sum that compounds alongside SIP contributions
   - `annual_increment_percent` increases the assumed SIP amount year-over-year (stepping up SIP)
   - `retirement_age` overrides the default retirement target age
   - `child_education_abroad` applies a 2.2x cost multiplier to education goals

3. **Wealth Booster Integration (from brochure):**
   - The IPru Signature brochure states wealth boosters of **3.25% of average fund value** are added every 5 years starting from year 10.
   - For ULIP-category goals, the engine will add a `wealth_booster_bonus` to the projected corpus.

4. **Stepped-Up SIP Calculation:**
   Currently `monthly_sip_required()` assumes a flat monthly contribution. We will add a `stepped_sip_future_value()` that models an annual increase in SIP (matching salary increments):

   ```
   Year 1: SIP = ₹10,000/mo
   Year 2: SIP = ₹10,800/mo (8% increment)
   Year 3: SIP = ₹11,664/mo ...
   ```

5. **Existing Savings Compounding:**
   The current engine ignores lump sum savings. We will combine:
   ```
   Total Projected = FV(existing_savings, return, years) + SteppedSIP_FV(monthly, return, years, increment)
   ```

---

### Component 3: Backend — Product Recommendation per Goal

#### [MODIFY] [simulation_wrapper.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/services/simulation_wrapper.py)

After running the simulation, map each goal to the best-fit ICICI product from [seed_products.json](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/data/seed_products.json):

| Goal Type | Primary Product | Category |
|---|---|---|
| `retirement` | ICICI Pru Easy Retirement | Retirement |
| `child_education` | ICICI Pru Smart Kid | Child Plan |
| `home_purchase` | ICICI Pru Guaranteed Wealth Protector | Endowment |
| `family_protection` | ICICI Pru iProtect Smart | Term Insurance |
| `wealth_creation` | ICICI Pru Signature | ULIP |

This mapping will be returned alongside the simulation result so the timeline can display the recommended product per goal.

#### [MODIFY] [simulate.py (schema)](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/schemas/simulate.py)

Add `recommended_product` fields to `GoalResultResponse`:
```python
class GoalResultResponse(BaseModel):
    # ... existing fields ...
    recommended_product_name: Optional[str] = None
    recommended_product_category: Optional[str] = None
    recommended_product_id: Optional[str] = None
```

---

### Component 4: Frontend — Wire What-If Sliders to Backend

#### [MODIFY] [WhatIfPanel.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/simulation/WhatIfPanel.tsx)

Update the `runApiSimulation` function to pass what-if params to the backend:
```typescript
const payload: SimulateRequest = {
  age: profile.age,
  annual_income: profile.income * 12,
  goals: goals.map(...),
  // NEW — What-if params
  inflation_rate: params.inflationRate / 100,
  existing_savings: params.existingSavings,
  annual_increment_percent: params.annualIncrementPercent / 100,
  retirement_age: params.retirementAge,
  child_education_abroad: params.childEducationAbroad,
}
```

Add a new slider for **Expected Return %** so users can model optimistic vs pessimistic market scenarios.

#### [MODIFY] [LifeJourneyTimeline.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/timeline/LifeJourneyTimeline.tsx)

Same — pass what-if params in the initial simulation call.

---

### Component 5: Frontend — Upgrade Local Fallback

#### [MODIFY] [simulation.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/mocks/simulation.ts)

Replace the simplistic placeholder math with proper financial formulas that mirror the backend engine. This ensures the app works correctly even when the backend is down.

---

## Calculation Summary (How the Engine Will Work)

For each goal, the engine runs this pipeline:

```
1. inflation_adjusted_target = target_amount × (1 + inflation)^years
2. blended_return = risk_appetite_matrix[risk_appetite][goal_horizon]
3. lump_sum_fv = existing_savings × (1 + blended_return)^years
4. stepped_sip_fv = Σ (monthly_sip × (1 + increment)^year × FV_annuity)
5. wealth_booster = 3.25% × avg_fund_value (for ULIP goals, every 5yr from yr10)
6. projected_corpus = lump_sum_fv + stepped_sip_fv + wealth_booster
7. gap = max(0, inflation_adjusted_target - projected_corpus)
8. coverage_ratio = min(1.0, projected_corpus / inflation_adjusted_target)
9. monthly_sip_needed = solve_for_PMT(gap, blended_return, years)
```

## Verification Plan

### Manual Verification
- Drag the Inflation slider from 6% to 10% → corpus needed should visibly increase
- Drag Existing Savings from 0 to ₹50L → gap should visibly decrease
- Toggle "Child abroad education" → education goal corpus should jump ~2.2x
- Change Retirement Age from 60 to 50 → retirement corpus should increase (more years to fund, less time to save)
- Each goal card on the timeline should show the recommended ICICI product name
