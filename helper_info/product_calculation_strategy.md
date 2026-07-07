# ICICI Prudential — Product Return Calculation Strategy

> **Purpose:** Defines the exact mathematical strategy, formulas, and input data used by the simulation engine to calculate returns for each of the 7 ICICI Prudential products.
> **Data Source:** [icici_fund_data_strategy.md](./icici_fund_data_strategy.md) — contains raw fund performance data
> **Last Updated:** July 07, 2026

---

## Product Category Classification

| # | Product | Category | Calculation Strategy |
|---|---------|----------|---------------------|
| 1 | ICICI Pru Signature Assure | **ULIP** | CAGR / Geometric Returns |
| 2 | ICICI Pru iProtect Smart Plus | **Pure Risk (Term)** | No Investment — Sum Assured Only |
| 3 | ICICI Pru GIFT Pro | **Non-Participating** | IRR / Cash-Flow Modeling |
| 4 | ICICI Pru Protect N Gain | **ULIP** | CAGR / Geometric Returns |
| 5 | ICICI Pru Wish | **ULIP** (via Health Saver) | CAGR / Geometric Returns |
| 6 | ICICI Pru GPP Flexi | **Annuity** | IRR / NPV Reverse Calculation |
| 7 | ICICI Pru SmartKid 360 | **Non-Participating** | IRR / Cash-Flow Modeling |

---

## Strategy 1: ULIP — CAGR / Geometric Returns

**Applies to:** Signature Assure, Protect N Gain, Wish (via Health Saver)

### How It Works

ULIPs are market-linked. Premiums are invested in funds (Equity, Debt, Balanced) after deducting mortality and fund management charges. Returns depend entirely on fund NAV movement.

### Core Formula — CAGR (Compound Annual Growth Rate)

For any fund with $t \geq 1$ year:

$$CAGR = \left( \frac{NAV_{end}}{NAV_{start}} \right)^{\frac{1}{t}} - 1$$

### NAV Pricing (IRDAI-mandated daily valuation)

$$NAV_t = \frac{MVA_t + CA_t - CL_t}{U_t}$$

Where:
- $MVA_t$ = Market Value of underlying Assets at time $t$
- $CA_t$ = Value of Current Assets (cash and bank balances)
- $CL_t$ = Value of Current Liabilities (including accrued management fees)
- $U_t$ = Total number of outstanding units

### Return Data Used (5-Year Historical CAGR Averages)

Our strategy: **Simple average of all funds with available 5-Year CAGR** within each fund class.

#### Product 1: ICICI Pru Signature Assure

| Fund Class | Funds Averaged | 5-Year Avg CAGR | Applied When |
|------------|---------------|-----------------|--------------|
| **Equity** | Focus 50 (8.24%), Bluechip (9.30%), Maximiser V (10.57%), Maximise India (10.90%), India Growth (11.05%), Multi Cap Growth (11.46%), Opportunities (12.22%), Value Enhancer (14.19%) | **10.99%** | Risk = Aggressive |
| **Balanced** | Active Asset Allocation (7.63%), Multi Cap Balanced (8.81%) | **8.22%** | Risk = Moderate |
| **Debt** | Income Fund (4.77%), Money Market (5.59%), Secure Opportunities (4.80%) | **5.05%** | Risk = Conservative |

#### Product 4: ICICI Pru Protect N Gain

| Fund Class | Funds Averaged | 5-Year Avg CAGR | Applied When |
|------------|---------------|-----------------|--------------|
| **Equity** | Health Flexi Growth (11.13%), Health Multiplier (9.10%), Pension Flexi Growth (10.36%), Pension RICH II (12.15%), RICH II (12.16%) | **10.98%** | Risk = Aggressive |
| **Balanced** | Active Asset Allocation (7.85%), Multi Cap Balanced (8.96%) | **8.41%** | Risk = Moderate |
| **Debt** | Income Fund (5.39%), Money Market (5.67%), Secure Opportunities (5.30%) | **5.45%** | Risk = Conservative |

#### Product 5: ICICI Pru Wish (using Health Saver funds)

| Fund Class | Funds Averaged | 5-Year Avg CAGR | Applied When |
|------------|---------------|-----------------|--------------|
| **Equity** | Health Flexi Growth (11.13%), Health Multiplier (9.10%), Pension Flexi Growth (10.36%), Pension RICH II (12.15%), RICH II (12.16%) | **10.98%** | Risk = Aggressive |
| **Balanced** | Health Balancer (7.54%), Health Flexi Balanced (9.19%) | **8.37%** | Risk = Moderate |
| **Debt** | Health Preserver (5.55%), Health Protector (6.16%), Pension Protector II (6.18%) | **5.96%** | Risk = Conservative |

### Corpus Growth Projection Formula

For a lump-sum investment with annual premium $P$, over $N$ years at rate $r$ (the selected CAGR):

$$Corpus_N = P \times \frac{(1 + r)^N - 1}{r}$$

For SIP-style stepped-up premiums (annual step-up rate $s$):

$$Corpus_N = \sum_{t=1}^{N} P \cdot (1 + s)^{t-1} \cdot (1 + r)^{N-t}$$

### Wealth Booster Injection (Signature Assure specific)

From brochure: Extra units equivalent to 3.25% of average fund value, at the end of every 5th policy year starting from year 10.

$$WB_t = 0.0325 \times \overline{FV}_{t} \quad \text{for } t \in \{10, 15, 20, 25, ...\}$$

Where $\overline{FV}_t$ is the average fund value over that 5-year period.

### Risk-Appetite → Return Mapping Logic

```
if risk_appetite == "aggressive":
    rate = product_equity_5yr_avg     # 10.98% - 10.99%
elif risk_appetite == "moderate":
    rate = product_balanced_5yr_avg   # 8.22% - 8.41%
elif risk_appetite == "conservative":
    rate = product_debt_5yr_avg       # 5.05% - 5.96%
```

### Horizon Adjustments

| Horizon | Adjustment | Rationale |
|---------|-----------|-----------|
| Short (<5 years) | -1% to -2% haircut from base CAGR | Higher short-term volatility risk |
| Medium (5-12 years) | Base CAGR as-is | Aligns with the 5-year historical data window |
| Long (>12 years) | Base CAGR as-is (no uplift) | Conservative — don't assume outperformance |

---

## Strategy 2: Non-Participating — IRR / Cash-Flow Modeling

**Applies to:** GIFT Pro, SmartKid 360

### How It Works

Non-participating products are **deterministic** — every payout is contractually guaranteed from day one. There is zero market linkage and zero dependency on company profits. The insurer matches premium liabilities with long-duration fixed-income assets (Government Securities, high-grade corporate bonds).

### Core Formula — Internal Rate of Return (IRR)

The IRR is the discount rate $r$ that makes the Net Present Value of all policy cash flows exactly zero:

$$NPV = \sum_{t=0}^{N} \frac{C_t}{(1 + r)^t} = 0$$

Where:
- $C_t$ = Net cash flow at time $t$ (outflows/premiums are negative, inflows/payouts are positive)
- $N$ = Total policy tenure
- $r$ = The guaranteed yield (IRR) — this is what we solve for

### Numerical Solution — Newton-Raphson Method

Since this forms a high-degree polynomial when $N > 4$, there is no closed-form algebraic solution. The IRR is isolated using iterative root-finding:

$$r_{k+1} = r_k - \frac{NPV(r_k)}{NPV'(r_k)}$$

$$NPV'(r_k) = -\sum_{t=1}^{N} \frac{t \cdot C_t}{(1 + r_k)^{t+1}}$$

### Return Rates Applied

| Product | Fixed IRR | Risk Appetite Effect | Rationale |
|---------|----------|---------------------|-----------|
| **GIFT Pro** | **6.0%** | None — same for all | IRDAI illustration rate for guaranteed income plans |
| **SmartKid 360** | **6.0%** | None — same for all | IRDAI illustration rate for guaranteed savings plans |

### Cash-Flow Modeling Details

#### GIFT Pro — Guaranteed Income Cash Flows

```
Year 0 to PPT:    C_t = -Premium (outflow)
Year X to Y:      C_t = +Guaranteed Annual Income (inflow)
Year M:           C_t = +MoneyBack Lump Sum (inflow, 0-200% of total premiums)
```

The engine models:
- **Level Income Option:** Fixed annual income amount throughout the payout period
- **Increasing Income Option:** Income increases by 5% p.a. simple interest
- Payout durations: 5, 7, 10, 12, 15, 20, 25, or 30 years

#### SmartKid 360 — Milestone-Aligned Cash Flows

```
Year 0 to PPT:    C_t = -Premium (outflow)
Milestone 1:      C_t = +Payout at Class 10 (inflow)
Milestone 2:      C_t = +Payout at Class 12 (inflow)
Milestone 3:      C_t = +Payout at Graduation (inflow)
Maturity:         C_t = +Final Maturity Benefit (inflow)
```

The engine models:
- **Premium Waiver on Death:** If parent dies, all future $C_t$ outflows become 0, but all inflows continue as guaranteed
- **Guaranteed Maturity Benefit:** Fixed lump sum, known at policy inception

### Simulation Projection Formula

For forward projection using the fixed IRR:

$$FV = \sum_{t=0}^{N} C_t \cdot (1 + r)^{N-t}$$

Where $r = 0.06$ (6.0% fixed) for both products.

---

## Strategy 3: Annuity — NPV / Reverse Calculation

**Applies to:** GPP Flexi

### How It Works

Annuity products convert a lump sum (or accumulated corpus) into a guaranteed lifelong income stream. Unlike other products where we project growth forward, the annuity strategy works **backwards** — from desired income to required corpus.

### Core Formula — Present Value of Annuity

For a desired annual income $A$ over life expectancy $L$ years at annuity rate $r$:

$$PV_{corpus} = A \times \frac{1 - (1 + r)^{-L}}{r}$$

For perpetual annuity (simplification for very long life expectancy):

$$PV_{corpus} = \frac{A}{r}$$

### IRR Formula (Same as Non-Par)

The guaranteed annuity rate is itself an IRR:

$$NPV = -PurchasePrice + \sum_{t=1}^{L} \frac{AnnuityPayout_t}{(1 + r)^t} = 0$$

### Return Rate Applied

| Product | Fixed Annuity Yield | Risk Appetite Effect | Rationale |
|---------|-------------------|---------------------|-----------|
| **GPP Flexi** | **6.5%** | None — same for all | IRDAI-regulated annuity illustration rate |

### Calculation Modes

#### Mode 1: Forward Accumulation (Deferred Annuity)

During deferment period, corpus grows at the guaranteed rate:

$$Corpus_{retirement} = \sum_{t=1}^{D} Premium_t \cdot (1 + 0.065)^{D-t}$$

Where $D$ = deferment period in years.

#### Mode 2: Reverse Calculation (How much corpus needed?)

Given desired monthly retirement income $M$:

$$Required\ Corpus = \frac{M \times 12}{0.065} = \frac{Annual\ Income}{0.065}$$

Example: For ₹1,00,000/month retirement income:
$$Required\ Corpus = \frac{12,00,000}{0.065} = ₹1,84,61,538$$

### Annuity Options Modeled

| Option | Description | Impact on Rate |
|--------|-------------|---------------|
| Life Annuity | Income until death | Base rate (6.5%) |
| Joint Life | Income continues for spouse | Slightly lower effective rate |
| Return of Purchase Price | Premium returned on death | Lower effective rate (~5.5-6.0%) |

---

## Strategy 4: Pure Risk / Term Insurance — No Investment

**Applies to:** iProtect Smart Plus

### How It Works

Term insurance is **pure protection** — there is no savings, investment, or maturity value. The premium is the cost of buying a death benefit (Sum Assured). If the policyholder survives the term, nothing is paid out.

### Core Formula — Required Sum Assured

$$Sum\ Assured = \text{Human Life Value} = Income \times Years\ Remaining \times (1 + inflation)^{Years}$$

Or goal-based:

$$Sum\ Assured = Outstanding\ Liabilities + Future\ Goals\ Corpus - Existing\ Assets$$

### Return Rate Applied

| Product | Return Rate | Rationale |
|---------|------------|-----------|
| **iProtect Smart Plus** | **0.0%** | No investment component — pure mortality cost |

### Simulation Note

For protection goals, the engine does NOT calculate corpus growth. Instead it:
1. Calculates the **gap** between the user's financial liabilities and existing coverage
2. Outputs the **required Sum Assured** to cover that gap
3. Estimates the **annual premium cost** based on age, gender, and term

---

## Summary: Strategy × Product × Return Matrix

| Product | Strategy | Formula | Aggressive | Moderate | Conservative |
|---------|----------|---------|------------|----------|--------------|
| **Signature Assure** | CAGR (ULIP) | $(1 + r)^N$ | **10.99%** | **8.22%** | **5.05%** |
| **Protect N Gain** | CAGR (ULIP) | $(1 + r)^N$ | **10.98%** | **8.41%** | **5.45%** |
| **Wish** | CAGR (ULIP) | $(1 + r)^N$ | **10.98%** | **8.37%** | **5.96%** |
| **GIFT Pro** | IRR (Non-Par) | $\sum \frac{C_t}{(1+r)^t} = 0$ | **6.00%** | **6.00%** | **6.00%** |
| **SmartKid 360** | IRR (Non-Par) | $\sum \frac{C_t}{(1+r)^t} = 0$ | **6.00%** | **6.00%** | **6.00%** |
| **GPP Flexi** | Annuity Yield | $PV = \frac{A}{r}$ | **6.50%** | **6.50%** | **6.50%** |
| **iProtect Smart** | Pure Risk | $SA = Liabilities - Assets$ | **0.00%** | **0.00%** | **0.00%** |

---

## Goal → Product → Strategy Flow

```
User Goal
  │
  ├── Wealth Creation / Business Fund
  │     └── Signature Assure (ULIP)
  │           └── CAGR Strategy → Risk-based return (5.05% to 10.99%)
  │
  ├── Retirement Planning
  │     └── GPP Flexi (Annuity)
  │           └── Reverse NPV Strategy → 6.5% guaranteed yield
  │
  ├── Child Education / Marriage
  │     └── SmartKid 360 (Non-Par)
  │           └── IRR Cash-Flow Strategy → 6.0% milestone payouts
  │
  ├── Home Purchase / Home Loan
  │     └── Protect N Gain (ULIP)
  │           └── CAGR Strategy → Risk-based return (5.45% to 10.98%)
  │
  ├── Family Protection / Debt Repayment
  │     └── iProtect Smart Plus (Term)
  │           └── Pure Risk Strategy → Sum Assured calculation only
  │
  ├── Legacy / Guaranteed Income
  │     └── GIFT Pro (Non-Par)
  │           └── IRR Cash-Flow Strategy → 6.0% guaranteed income
  │
  └── Health Protection
        └── Wish (ULIP via Health Saver)
              └── CAGR Strategy → Risk-based return (5.96% to 10.98%)
```
