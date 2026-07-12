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
| 5 | ICICI Pru Wish | **Health / Critical Illness** | Morbidity Risk Pricing |
| 6 | ICICI Pru GPP Flexi | **Annuity** | IRR / NPV Reverse Calculation |
| 7 | ICICI Pru SmartKid 360 | **Non-Participating** | IRR / Cash-Flow Modeling |

---

## Strategy 1: ULIP — CAGR / Geometric Returns

**Applies to:** Signature Assure, Protect N Gain

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

### 📌 Worked Example 1: Signature Assure — Wealth Creation Goal

**Scenario:** Rahul (age 30) wants to build a ₹1 Crore corpus for his business in 20 years. He can invest ₹15,000/month. Risk appetite = **Aggressive**.

**Step 1 — Select Return Rate:**
- Product: Signature Assure (ULIP)
- Risk = Aggressive, Horizon = 20 years (long bucket)
- Rate from matrix: `SIGNATURE_EQUITY_5YR` = **10.99%**

**Step 2 — Inflation-Adjust the Target:**
$$FV_{target} = 1,00,00,000 \times (1 + 0.06)^{20} = 1,00,00,000 \times 3.2071 = ₹3,20,71,354$$

**Step 3 — Calculate SIP Future Value (Flat SIP):**
- Monthly rate $r_m = 0.1099 / 12 = 0.00916$
- Total months $n = 20 \times 12 = 240$
$$SIP_{FV} = 15{,}000 \times \frac{(1.00916)^{240} - 1}{0.00916} \times 1.00916$$
$$= 15{,}000 \times \frac{8.906 - 1}{0.00916} \times 1.00916$$
$$= 15{,}000 \times 863.32 \times 1.00916 = ₹1,30,69,058$$

**Step 4 — Add Wealth Booster (Signature Assure only):**
- Boosters at Year 10, 15, 20
- Year 10: Fund ≈ ₹31.7L → Booster = ₹31.7L × 3.25% = ₹1,03,025 → compounded 10yr = ₹2,92,192
- Year 15: Fund ≈ ₹72.8L → Booster = ₹2,36,600 → compounded 5yr = ₹3,97,524
- Year 20: Fund ≈ ₹1.31Cr → Booster = ₹4,24,743 (no compounding)
- **Total Booster ≈ ₹11,14,459**

**Step 5 — Gap Analysis:**
$$Projected = ₹1,30,69,058 + ₹11,14,459 = ₹1,41,83,517$$
$$Gap = ₹3,20,71,354 - ₹1,41,83,517 = ₹1,78,87,837$$
$$Coverage = 1,41,83,517 / 3,20,71,354 = 44.2\%$$

**Step 6 — Additional SIP Needed:**
$$SIP_{extra} = \frac{1,78,87,837 \times 0.00916}{(1.00916)^{240} - 1} = ₹20,550/\text{month}$$

**Result:** Rahul needs **₹35,550/month total** (₹15K current + ₹20.5K extra) to reach his inflation-adjusted ₹3.2Cr target.

---

### 📌 Worked Example 2: Protect N Gain — Home Purchase Goal

**Scenario:** Priya (age 28) wants ₹50 Lakhs for a home down payment in 7 years. She invests ₹20,000/month with 8% annual step-up. Risk appetite = **Moderate**.

**Step 1 — Select Return Rate:**
- Product: Protect N Gain (ULIP)
- Risk = Moderate, Horizon = 7 years (medium bucket)
- Rate from matrix: `PROTECT_N_GAIN_BALANCED_5YR` = **8.41%**

**Step 2 — Inflation-Adjust the Target:**
$$FV_{target} = 50,00,000 \times (1.06)^{7} = 50,00,000 \times 1.5036 = ₹75,18,156$$

**Step 3 — Calculate Stepped SIP Future Value:**
Year-by-year SIP (8% annual increment):

| Year | Monthly SIP | Annual SIP | Compounds For | FV of Year's SIP |
|------|------------|------------|---------------|------------------|
| 1 | ₹20,000 | ₹2,40,000 | 6 more years | ₹3,97,082 |
| 2 | ₹21,600 | ₹2,59,200 | 5 more years | ₹3,94,524 |
| 3 | ₹23,328 | ₹2,79,936 | 4 more years | ₹3,92,005 |
| 4 | ₹25,194 | ₹3,02,331 | 3 more years | ₹3,89,523 |
| 5 | ₹27,210 | ₹3,26,518 | 2 more years | ₹3,87,078 |
| 6 | ₹29,387 | ₹3,52,639 | 1 more year | ₹3,84,670 |
| 7 | ₹31,737 | ₹3,80,850 | 0 years | ₹3,82,297 |

$$Total\ Stepped\ SIP_{FV} ≈ ₹27,27,179$$

**Step 4 — No Wealth Booster** (Protect N Gain does not have this feature)

**Step 5 — Gap Analysis:**
$$Gap = ₹75,18,156 - ₹27,27,179 = ₹47,90,977$$
$$Coverage = 36.3\%$$

**Result:** Priya's stepped SIP covers ~36% of the inflated target. She needs an additional ₹47.9L gap to be covered, requiring either higher SIP or existing savings.

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

### 📌 Worked Example 4: GIFT Pro — Legacy / Guaranteed Income Goal

**Scenario:** Suresh (age 45) wants a guaranteed income stream. He invests ₹5,00,000/year for 10 years (PPT = 10). The plan pays guaranteed income from Year 11 to Year 25 (15 years of income).

**Step 1 — Strategy: IRR / Cash-Flow Modeling**
- Product: GIFT Pro (Non-Par)
- Fixed IRR: **6.0%** — same regardless of risk appetite

**Step 2 — Premium Outflows (Years 1–10):**
$$Total\ Premiums = 5{,}00{,}000 \times 10 = ₹50{,}00{,}000$$

**Step 3 — Forward Projection of Premiums at 6.0%:**
Each premium compounds at 6% for the remaining years:

| Year Paid | Premium | Compounds For | FV at Year 10 |
|-----------|---------|---------------|----------------|
| 1 | ₹5,00,000 | 9 years | ₹8,44,739 |
| 2 | ₹5,00,000 | 8 years | ₹7,96,924 |
| 3 | ₹5,00,000 | 7 years | ₹7,51,815 |
| 4 | ₹5,00,000 | 6 years | ₹7,09,260 |
| 5 | ₹5,00,000 | 5 years | ₹6,69,113 |
| 6 | ₹5,00,000 | 4 years | ₹6,31,238 |
| 7 | ₹5,00,000 | 3 years | ₹5,95,508 |
| 8 | ₹5,00,000 | 2 years | ₹5,61,800 |
| 9 | ₹5,00,000 | 1 year | ₹5,30,000 |
| 10 | ₹5,00,000 | 0 years | ₹5,00,000 |

$$Corpus\ at\ Year\ 10 = ₹65,90,397$$

**Step 4 — Guaranteed Annual Income Payout (Year 11–25):**
The corpus of ₹65.9L pays out a level annual income over 15 years.

Using the annuity formula:
$$Annual\ Income = \frac{Corpus \times r}{1 - (1+r)^{-N}} = \frac{65,90,397 \times 0.06}{1 - (1.06)^{-15}}$$
$$= \frac{3,95,424}{1 - 0.4173} = \frac{3,95,424}{0.5827} = ₹6,78,774/\text{year}$$
$$= ₹56,565/\text{month}$$

**Result:** Suresh invests ₹50L over 10 years → receives **₹6.79L/year guaranteed** (₹56,565/month) for 15 years = ₹1.02 Crore total payouts.

---

### 📌 Worked Example 5: SmartKid 360 — Child Education Goal

**Scenario:** Anita (age 32) has a 2-year-old child. She wants to fund education milestones: Class 10 (age 16), Class 12 (age 18), Graduation (age 22). She invests ₹1,00,000/year for 15 years. 

**Step 1 — Strategy: IRR / Cash-Flow Modeling**
- Product: SmartKid 360 (Non-Par, Guaranteed)
- Fixed IRR: **6.0%** — same regardless of risk appetite

**Step 2 — Premium Outflows (Year 1–15):**
$$Total\ Premiums = 1{,}00{,}000 \times 15 = ₹15{,}00{,}000$$

**Step 3 — Corpus at Key Milestones (Forward Projection at 6%):**

| Milestone | Child Age | Policy Year | Corpus (FV of premiums paid) |
|-----------|-----------|-------------|------------------------------|
| **Class 10** | 16 | Year 14 | ₹1,00,000 × FV-annuity(6%,14) = ₹21,01,506 |
| **Class 12** | 18 | Year 16 | ₹21,01,506 × (1.06)² + last 2yr premiums = ₹25,73,190 |
| **Graduation** | 22 | Year 20 | ₹25,73,190 × (1.06)⁴ = ₹32,47,826 |

**Step 4 — Milestone Payouts (Guaranteed MoneyBack):**
SmartKid 360 guarantees specific percentages of the Sum Assured at each milestone:

| Milestone | Payout (% of total benefit) | Amount |
|-----------|---------------------------|--------|
| Class 10 | 20% | ₹6,49,565 |
| Class 12 | 20% | ₹6,49,565 |
| Graduation | 25% | ₹8,11,957 |
| Final Maturity | 35% | ₹11,36,739 |
| **Total** | **100%** | **₹32,47,826** |

**Step 5 — Premium Waiver Benefit:**
If Anita passes away in Year 5, the engine sets:
$$C_t = 0 \quad \text{for } t = 6, 7, ..., 15 \quad \text{(all future premiums waived)}$$
But all milestone payouts continue as originally guaranteed — the child receives the full ₹32.48L.

**Result:** Anita invests ₹15L → child receives **₹32.48L across 4 milestones**, with full protection if the parent passes away.

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

### 📌 Worked Example 6: GPP Flexi — Retirement Goal

**Scenario:** Vikram (age 40) wants ₹75,000/month pension starting at age 60. He wants to know: (a) how much corpus he needs, and (b) how much to invest monthly for the next 20 years.

**Step 1 — Strategy: Annuity / NPV Reverse Calculation**
- Product: GPP Flexi (Annuity)
- Fixed Annuity Yield: **6.5%**

**Step 2 — Inflation-Adjust the Desired Income:**
$$Monthly\ Income\ at\ 60 = 75{,}000 \times (1.06)^{20} = 75{,}000 \times 3.2071 = ₹2,40,535/\text{month}$$
$$Annual\ Income\ at\ 60 = ₹28,86,418$$

**Step 3 — Reverse Calculate Required Corpus:**
Using the perpetual annuity formula (conservative, assumes lifelong pension):
$$Required\ Corpus = \frac{Annual\ Income}{Annuity\ Yield} = \frac{28{,}86{,}418}{0.065} = ₹4,44,06,431$$

Vikram needs **₹4.44 Crore** at age 60 to purchase an annuity paying ₹2.4L/month for life.

**Step 4 — Forward Calculate: Monthly Investment Needed:**
Now we compute how much monthly SIP at 6.5% for 20 years builds ₹4.44Cr:
- Monthly rate $r_m = 0.065/12 = 0.005417$
- Total months $n = 240$

$$SIP = \frac{4{,}44{,}06{,}431 \times 0.005417}{(1.005417)^{240} - 1}$$
$$= \frac{2{,}40{,}579}{(3.6322 - 1)} = \frac{2{,}40{,}579}{2.6322} = ₹91,403/\text{month}$$

**Step 5 — Summary:**

| Parameter | Value |
|-----------|-------|
| Current age | 40 |
| Retirement age | 60 |
| Desired pension (today's value) | ₹75,000/month |
| Desired pension (inflation-adjusted) | ₹2,40,535/month |
| Required corpus at 60 | **₹4.44 Crore** |
| Monthly investment needed (20yr @ 6.5%) | **₹91,403/month** |
| Annuity type | Life Annuity (6.5% yield) |

**Result:** Vikram needs to invest **₹91,403/month** for 20 years into GPP Flexi to guarantee a ₹2.4L/month pension for life.

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

### 📌 Worked Example 7: iProtect Smart Plus — Family Protection Goal

**Scenario:** Amit (age 35) earns ₹15L/year, has a home loan of ₹40L, child education need of ₹25L, and existing life cover of ₹20L. He wants to know how much additional cover he needs.

**Step 1 — Strategy: Pure Risk (0% Return)**
- Product: iProtect Smart Plus (Term Insurance)
- Return: **0.0%** — no investment, no corpus growth

**Step 2 — Calculate Human Life Value (HLV):**
$$HLV = Annual\ Income \times Years\ Remaining \times Inflation\ Adjustment$$
$$= 15{,}00{,}000 \times (60 - 35) \times (1.06)^{25}$$
$$= 15{,}00{,}000 \times 25 \times 4.2919 = ₹16,09,46,250$$

**Step 3 — Goal-Based Sum Assured (simpler approach used by engine):**
$$SA_{needed} = Outstanding\ Liabilities + Future\ Goals - Existing\ Cover$$
$$= 40{,}00{,}000 + 25{,}00{,}000 - 20{,}00{,}000 = ₹45{,}00{,}000$$

Minimum recommended = max(HLV, Goal-Based) but engine uses the goal-based approach:
$$Required\ Sum\ Assured = ₹45{,}00{,}000$$

**Step 4 — Engine Output:**

| Parameter | Value |
|-----------|-------|
| Product | iProtect Smart Plus |
| Return rate | 0.0% |
| Projected corpus | ₹0 (no investment) |
| Required Sum Assured | **₹45,00,000** |
| Future value (inflation-adjusted) | ₹45L × (1.06)^25 = ₹1.93 Crore |
| Monthly savings required | ₹0 (no savings — only premium cost) |
| Coverage ratio | 0% (protection product, not savings) |

**Step 5 — What Amit Actually Pays:**
The premium for a ₹45L term cover for a 35-year-old male (non-smoker, 30-year term) is approximately **₹6,000–₹8,000/year** — this is the cost of pure protection, not an investment.

**Result:** Amit needs **₹45L additional life cover**. The engine shows 0% return because this is pure protection — the value is in the death benefit, not corpus growth.

---

## Strategy 5: Health & Critical Illness — Morbidity Risk Pricing

**Applies to:** ICICI Pru WISH

### How It Works

Unlike ULIPs or Guaranteed savings plans, health and critical illness premiums cannot be calculated using standard investment mathematics (like IRR or CAGR). Instead, it is a **Fixed Benefit Plan** priced based on actuarial morbidity risk.

### Core Pricing Mechanism

The simulation engine replicates the ICICI WISH premium calculator using four core variables:

1. **Morbidity Risk (Age & Gender):**
   The statistical probability of contracting a covered critical illness over the term. As age increases, morbidity risk escalates exponentially.
2. **Fixed Benefit Coverage Amounts:**
   - **Vital Care (Critical Illness):** Base Sum Assured (e.g., ₹20 Lakhs)
   - **Surgical Care:** Fixed at 50% of Vital Care (e.g., ₹10 Lakhs)
   - **Maternity Care:** Fixed at 25% of Vital Care (e.g., ₹5 Lakhs)
3. **Term Condensation (Coverage Term vs. Payment Term):**
   The total morbidity cost for the entire Coverage Term is condensed into the Premium Payment Term (PPT).
   - *Example:* 15-Year Coverage with a 10-Year PPT means the engine calculates 15 years of escalating risk and compresses it into 10 level payments, creating a "Limited Pay" loading.
4. **Discounts & Loadings:**
   - **Online Discount:** Flat 10% discount for direct digital purchase.
   - **Frequency Loading:** Monthly payments incur a higher annualized rate compared to Yearly payments (which typically offer a 2.5% discount).

### Base Premium Curve (Female, Age 30)

Based on real-world data interpolation, the premium scales according to the condensation ratio (Coverage Term / PPT):

| Option | PPT | Coverage Term | Monthly Premium | Total Paid | Benefit |
|--------|-----|---------------|-----------------|------------|---------|
| Regular Pay | 8 Years | 8 Years | ₹517/month | ₹49,632 | Up to ₹35L |
| Limited Pay | 10 Years | 15 Years | ₹865/month | ₹1,03,800 | Up to ₹35L |
| Limited Pay | 15 Years | 25 Years | ₹1,058/month | ₹1,90,440 | Up to ₹35L |

### 📌 Worked Example 8: WISH — Health Protection Goal

**Scenario:** A 30-year-old female wants critical illness protection for the next 15 years but only wants to pay for 10 years.

**Step 1 — Define Coverage Needs:**
- Vital Care (CI): ₹20,00,000
- Surgical Care: ₹10,00,000 (50% of CI)
- Maternity Care: ₹5,00,000 (25% of CI)
- Total Potential Benefit: ₹35,00,000

**Step 2 — Apply Morbidity Curve & Condensation:**
- 15 years of risk condensed into 10 years of payments.
- Because it's a Limited Pay option, the base rate is loaded.
- Monthly frequency loading applied; 10% online discount applied.
- Resulting Premium = **₹865/month**

**Step 3 — Cost-Benefit Analysis:**
- Total Cost over 10 years = ₹1,03,800
- Total Potential Payout = ₹35,00,000
- **Cost-to-Benefit Ratio:** Client pays ~₹1 Lakh to transfer ₹35 Lakh of health risk to the insurer. The payout is ~33x the total premiums paid if a major medical event occurs.

---

## Summary: Strategy × Product × Return Matrix

| Product | Strategy | Formula | Aggressive | Moderate | Conservative |
|---------|----------|---------|------------|----------|--------------|
| **Signature Assure** | CAGR (ULIP) | $(1 + r)^N$ | **10.99%** | **8.22%** | **5.05%** |
| **Protect N Gain** | CAGR (ULIP) | $(1 + r)^N$ | **10.98%** | **8.41%** | **5.45%** |
| **Wish** | Morbidity Risk (Health) | Fixed Benefit | **N/A** | **N/A** | **N/A** |
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
  ├── Health Protection
        └── Wish (Health/CI)
              └── Morbidity Risk Strategy → Fixed Benefits (CI, Surgical) vs Condensation Pay
```
