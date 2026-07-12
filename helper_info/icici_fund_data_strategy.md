# ICICI Prudential Fund Performance Data & Simulation Strategy

> **Source:** https://www.iciciprulife.com/fund-performance/product-wise-fund-performance-details.html
> **Data as on:** July 07, 2026
> **Strategy:** Simple average of all funds with available 5-Year returns within each fund class
> **Brochures Location:** `backend/data/brochures/`

---

## Brochure-Product Alignment

We now use the **7 products for which we actually have brochure data**:

| # | Brochure File | Product Name | Category | Has Fund Data? |
|---|---------------|-------------|----------|----------------|
| 1 | `ICICI_Pru_Signature_Assure_Brochure.pdf` + `IPru-Signature-Online-Brochure.pdf` | **ICICI Pru Signature Assure** | ULIP | ✅ Yes (Equity, Debt, Balanced) |
| 2 | `ICICI Pru iProtect Smart.pdf` | **ICICI Pru iProtect Smart Plus** | Term Insurance | ❌ No (pure protection) |
| 3 | `ICICI_Pru_GIFT_Pro_Brochure.pdf` | **ICICI Pru GIFT Pro** | Guaranteed Income | ❌ No (non-linked) |
| 4 | `ICICI_Pru_Protect_N_Gain_Brochure.pdf` | **ICICI Pru Protect N Gain** | ULIP | ✅ Yes (Equity, Debt, Balanced) |
| 5 | `ICICI-Pru-Wish-Brochure.pdf` | **ICICI Pru Wish** | Health Insurance | ✅ Yes (via Health Saver — Equity, Debt, Balanced) |
| 6 | `ICICI_Pru_GPP_Flexi_Brochure.pdf` | **ICICI Pru Guaranteed Pension Plan Flexi** | Retirement (Annuity) | ❌ No (non-linked, guaranteed annuity) |
| 7 | `ICICI-Pru-Smart-Kid-360-Brochure.pdf` | **ICICI Pru SmartKid 360** | Child Plan (ULIP) | ✅ Yes (Proxy via Signature Assure) |

---

## Product 1: ICICI Pru Signature Assure (Category: ULIP)

> [!NOTE]
> This is the flagship wealth-creation ULIP. It offers market-linked returns through a wide range of Equity, Debt, and Balanced funds. Key brochure features include Wealth Boosters, Maturity Protect (guaranteed return of premiums), Family Income Benefit, and Loyalty Additions.

### Equity Funds

| # | Fund Name | Inception | 5 Year | 7 Year | 10 Year |
|---|-----------|-----------|--------|--------|---------|
| 1 | Focus 50 Fund | Mar 2019 | 8.24% | 9.37% | NA |
| 2 | Bluechip Fund | Nov 2009 | 9.30% | 10.54% | 10.70% |
| 3 | Maximiser Fund V | Aug 2011 | 10.57% | 11.09% | 10.55% |
| 4 | Maximise India Fund | Feb 2015 | 10.90% | 12.58% | 11.51% |
| 5 | India Growth Fund | Jun 2019 | 11.05% | NA | NA |
| 6 | Multi Cap Growth Fund | Nov 2009 | 11.46% | 11.17% | 10.72% |
| 7 | Opportunities Fund | Nov 2009 | 12.22% | 12.66% | 12.32% |
| 8 | Value Enhancer Fund | Jul 2018 | 14.19% | 14.79% | NA |

**Funds WITHOUT 5-year data (too new, excluded):** BSE 500 Enhanced Value 50 Index Fund, BSE Enhanced Value 30 Index Fund, Dividend Leaders 50 Index Fund, India Consumption Fund, Large N Mid Cap Advantage Fund, Mid Cap 150 Momentum 50 Index Fund, Mid Cap Fund, Mid Cap Index Fund, MidSmall Cap 400 Index Fund, MidSmallCap 400 Momentum Quality 100 Index Fund, Multicap 50 25 25 Index Fund, Nifty Alpha 50 Index Fund, Sector Leaders Index Fund, Smallcap 250 Index Fund, Smallcap250 Momentum Quality 100 Index Fund, Sustainable Equity Fund.

**Equity 5-Year Average = (8.24 + 9.30 + 10.57 + 10.90 + 11.05 + 11.46 + 12.22 + 14.19) / 8 = 10.99%**

### Debt Funds

| # | Fund Name | Inception | 5 Year | 7 Year | 10 Year |
|---|-----------|-----------|--------|--------|---------|
| 1 | Income Fund | Nov 2009 | 4.77% | 5.85% | 6.59% |
| 2 | Money Market Fund | Nov 2009 | 5.59% | 5.48% | 5.85% |
| 3 | Secure Opportunities Fund | Jul 2018 | 4.80% | 5.80% | NA |

**Funds WITHOUT 5-year data (excluded):** Constant Maturity Fund (inception May 2023).

**Debt 5-Year Average = (4.77 + 5.59 + 4.80) / 3 = 5.05%**

### Balanced Funds

| # | Fund Name | Inception | 5 Year | 7 Year | 10 Year |
|---|-----------|-----------|--------|--------|---------|
| 1 | Active Asset Allocation Balanced Fund | Jun 2017 | 7.63% | 8.82% | NA |
| 2 | Multi Cap Balanced Fund | Nov 2009 | 8.81% | 9.10% | 9.05% |

**Funds WITHOUT 5-year data (excluded):** Balanced Advantage Fund (inception Aug 2021), Mid Cap Hybrid Growth Fund (inception Feb 2023).

**Balanced 5-Year Average = (7.63 + 8.81) / 2 = 8.22%**

### Summary for ICICI Pru Signature Assure

| Fund Class | 5-Year Avg Return | Funds Used |
|------------|-------------------|------------|
| **Equity** | **10.99%** | 8 mature funds |
| **Balanced** | **8.22%** | 2 funds |
| **Debt** | **5.05%** | 3 funds |

### Return Calculation Strategy
- **Aggressive risk appetite** → Use Equity avg: **10.99%**
- **Moderate risk appetite** → Use Balanced avg: **8.22%**
- **Conservative risk appetite** → Use Debt avg: **5.05%**
- **Extra Benefits (from brochure):**
  - **Wealth Boosters / Loyalty Additions:** Extra units allocated at the end of every 5th policy year
  - **Maturity Protect:** Guaranteed return of at least 100% of premiums paid at maturity
  - **Family Income Benefit:** Annual income payouts in case of life assured's demise
  - **Future Secure Benefit:** Waiver of all future premiums after death
- **Horizon adjustments:** Short (<5yr) gets a 1-2% haircut from base, Long (>12yr) stays at base

---

## Product 2: ICICI Pru iProtect Smart Plus (Category: Term Insurance)

> [!NOTE]
> This is a **pure protection plan** — no investment component, no fund data. The return is **0%** because term insurance only pays out a death benefit, it does not accumulate any investment corpus.

### Return Calculation Strategy
- **Return Rate:** **0.0%** (no investment component)
- **All risk appetites** → **0.0%** (not applicable — pure protection)
- **Key Benefits (from brochure):**
  - Life cover (lump sum payout on death)
  - Accidental Death Benefit option
  - Life Stage Protection (increase cover at marriage, child birth, home loan)
  - Premium Break (skip 1 year during financial hardship)
  - Flexible premium payment: Single Pay, Limited Pay, or Regular Pay
- **Simulation Note:** For protection goals (family security, debt repayment), we calculate the **required Sum Assured** rather than corpus growth. The premium paid is the cost of protection, not an investment.

---

## Product 3: ICICI Pru GIFT Pro (Category: Guaranteed Income)

> [!NOTE]
> This is a **non-linked, non-participating plan** offering guaranteed income. It does NOT have market-linked fund data. Returns come from guaranteed income payouts and MoneyBack benefits as defined in the brochure.

### Return Calculation Strategy
- **Return Rate:** **6.0%** (based on IRDAI illustration rates for guaranteed income plans — conservative estimate)
- **All risk appetites** → **6.0%** (guaranteed product — no market risk variation)
- **Key Benefits (from brochure):**
  - **Guaranteed Income Options:** Level income or Increasing income (5% p.a. simple interest increase)
  - **MoneyBack Benefit:** 0% to 200% of total annualized premiums as lump sum
  - **Flexibility:** Choose income duration (5, 7, 10, 12, 15, 20, 25, 30 years)
  - **Customizable payout timing:** Choose when MoneyBack and income start
  - **Life Cover:** Financial protection throughout the policy term
- **Simulation Note:** The 6.0% is an effective annualized return equivalent. The actual benefit is structured as guaranteed income payouts, not a lump sum corpus. In the simulation, we model the total guaranteed payouts as an equivalent return on premium invested.

---

## Product 4: ICICI Pru Protect N Gain (Category: ULIP)

> [!IMPORTANT]
> This is a protection-oriented ULIP with market-linked funds. The screenshot data confirms it has unique funds not shared with Signature (Health Flexi Growth, Health Multiplier, Pension Flexi Growth, Pension RICH Fund II, RICH Fund II).

### Equity Funds (from fund performance page, as on July 07, 2026)

| # | Fund Name | Inception | 5 Year | 7 Year | 10 Year |
|---|-----------|-----------|--------|--------|---------|
| 1 | Health Flexi Growth Fund | Jan 16, 2009 | 11.13% | 10.90% | 9.86% |
| 2 | Health Multiplier Fund | Jan 15, 2009 | 9.10% | 10.99% | 10.58% |
| 3 | Pension Flexi Growth Fund | Mar 20, 2007 | 10.36% | 11.25% | 9.75% |
| 4 | Pension RICH Fund II | Mar 18, 2008 | 12.15% | 13.19% | 12.22% |
| 5 | RICH Fund II | Mar 17, 2008 | 12.16% | 13.18% | 12.16% |

**Equity 5-Year Average = (11.13 + 9.10 + 10.36 + 12.15 + 12.16) / 5 = 10.98%**

### Debt Funds (from fund performance page, as on July 07, 2026)

| # | Fund Name | Inception | 5 Year | 7 Year | 10 Year |
|---|-----------|-----------|--------|--------|---------|
| 1 | Income Fund | Nov 24, 2009 | 5.39% | 6.10% | 6.78% |
| 2 | Money Market Fund | Nov 24, 2009 | 5.67% | 5.50% | 5.86% |
| 3 | Secure Opportunities Fund | Jul 23, 2018 | 5.30% | 6.11% | NA |

**Funds WITHOUT 5-year data (excluded):** Constant Maturity Fund (inception May 2023).

**Debt 5-Year Average = (5.39 + 5.67 + 5.30) / 3 = 5.45%**

### Balanced Funds (from fund performance page, as on July 07, 2026)

| # | Fund Name | Inception | 5 Year | 7 Year | 10 Year |
|---|-----------|-----------|--------|--------|---------|
| 1 | Active Asset Allocation Balanced Fund | Jun 12, 2017 | 7.85% | 9.21% | NA |
| 2 | Multi Cap Balanced Fund | Nov 24, 2009 | 8.96% | 9.53% | 9.14% |

**Funds WITHOUT 5-year data (excluded):** Balanced Advantage Fund (inception Aug 2021), Mid Cap Hybrid Growth Fund (inception Feb 2023).

**Balanced 5-Year Average = (7.85 + 8.96) / 2 = 8.41%**

### Summary for ICICI Pru Protect N Gain

| Fund Class | 5-Year Avg Return | Funds Used |
|------------|-------------------|------------|
| **Equity** | **10.98%** | 5 funds |
| **Balanced** | **8.41%** | 2 funds |
| **Debt** | **5.45%** | 3 funds |

### Return Calculation Strategy
- **Aggressive risk appetite** → Use Equity avg: **10.98%**
- **Moderate risk appetite** → Use Balanced avg: **8.41%**
- **Conservative risk appetite** → Use Debt avg: **5.45%**
- **Key Benefits (from brochure):**
  - **Life Cover + Accidental Death Cover + Accidental Disability Cover** — comprehensive protection built-in
  - **Portfolio Strategies:** Four automatic strategies available (Target Asset Allocation, Trigger Portfolio, etc.)
  - **Multiple fund options:** Equity, Debt, and Balanced
  - **Partial Withdrawals:** After lock-in period
- **Simulation Note:** This product is ideal for goals where both protection AND growth are needed (e.g., home purchase, wealth creation with life cover).

---

## Product 5: ICICI Pru Wish (Category: Health Insurance)

> [!NOTE]
> Using **ICICI Pru Health Saver** fund performance data for return calculations. Health Saver is a ULIP-based health savings plan with market-linked funds across Equity, Debt, and Balanced categories. This data is used as a proxy for the Wish product's investment-linked component.

### Equity Funds (from ICICI Pru Health Saver, as on July 07, 2026)

| # | Fund Name | Inception | 5 Year | 7 Year | 10 Year |
|---|-----------|-----------|--------|--------|---------|
| 1 | Health Flexi Growth Fund | Jan 16, 2009 | 11.13% | 10.90% | 9.86% |
| 2 | Health Multiplier Fund | Jan 15, 2009 | 9.10% | 10.99% | 10.58% |
| 3 | Pension Flexi Growth Fund | Mar 20, 2007 | 10.36% | 11.25% | 9.75% |
| 4 | Pension RICH Fund II | Mar 18, 2008 | 12.15% | 13.19% | 12.22% |
| 5 | RICH Fund II | Mar 17, 2008 | 12.16% | 13.18% | 12.16% |

**Equity 5-Year Average = (11.13 + 9.10 + 10.36 + 12.15 + 12.16) / 5 = 10.98%**

### Debt Funds (from ICICI Pru Health Saver, as on July 07, 2026)

| # | Fund Name | Inception | 5 Year | 7 Year | 10 Year |
|---|-----------|-----------|--------|--------|---------|
| 1 | Health Preserver Fund | Jan 15, 2009 | 5.55% | 5.49% | 5.91% |
| 2 | Health Protector Fund | Jan 15, 2009 | 6.16% | 6.78% | 7.45% |
| 3 | Pension Protector Fund II | May 27, 2004 | 6.18% | 7.04% | 7.68% |

**Debt 5-Year Average = (5.55 + 6.16 + 6.18) / 3 = 5.96%**

### Balanced Funds (from ICICI Pru Health Saver, as on July 07, 2026)

| # | Fund Name | Inception | 5 Year | 7 Year | 10 Year |
|---|-----------|-----------|--------|--------|---------|
| 1 | Health Balancer Fund | Jan 15, 2009 | 7.54% | 8.62% | 8.52% |
| 2 | Health Flexi Balanced Fund | Jan 16, 2009 | 9.19% | 9.46% | 9.20% |

**Balanced 5-Year Average = (7.54 + 9.19) / 2 = 8.37%**

### Summary for ICICI Pru Wish (using Health Saver data)

| Fund Class | 5-Year Avg Return | Funds Used |
|------------|-------------------|------------|
| **Equity** | **10.98%** | 5 funds |
| **Balanced** | **8.37%** | 2 funds |
| **Debt** | **5.96%** | 3 funds |

### Return Calculation Strategy
- **Aggressive risk appetite** → Use Equity avg: **10.98%**
- **Moderate risk appetite** → Use Balanced avg: **8.37%**
- **Conservative risk appetite** → Use Debt avg: **5.96%**
- **Key Benefits (from Wish brochure):**
  - **Vital Care Benefit:** Coverage for women-specific critical illnesses
  - **Surgical Care Benefit:** Coverage for specific surgeries
  - **Maternity Care Benefit:** Pregnancy complications and newborn congenital illnesses
  - **Premium Sabbatical:** Skip premium for 1 year while maintaining benefits
  - **Guaranteed Premiums:** Premium rates locked for entire policy term

---

## Product 6: ICICI Pru Guaranteed Pension Plan Flexi (Category: Retirement / Annuity)

> [!NOTE]
> This is a **non-participating, non-linked deferred annuity product**. It does NOT have market-linked funds. Returns come from a guaranteed annuity rate locked in at the time of purchase. The "Flexi" refers to flexible annuity options (immediate, deferred, with/without return of purchase price).

### Fund Data
**None** — this is not a ULIP. No NAV, no fund selection, no equity/debt allocation.

### Return Calculation Strategy
- **Return Rate:** **6.5%** (based on IRDAI-regulated annuity illustration rates — guaranteed for life)
- **All risk appetites** → **6.5%** (guaranteed product, no market risk)
- **Key Benefits (from brochure):**
  - **Guaranteed Annuity for Life:** Fixed income payments that never stop, regardless of how long you live
  - **Flexible Payout Options:** Monthly, quarterly, half-yearly, or annual annuity
  - **Return of Purchase Price:** Option to get back the premium paid on death (reduces annuity rate slightly)
  - **Deferred Annuity:** Can accumulate corpus first, then convert to annuity at retirement
  - **Joint Life Option:** Annuity continues for spouse after policyholder's death
  - **No market risk:** Returns are fully guaranteed and locked in at purchase
- **Simulation Note:** For retirement goals, we calculate the corpus needed to purchase an annuity that delivers the required monthly income. The 6.5% is the effective return equivalent of the annuity payout stream.

---

## Product 7: ICICI Pru SmartKid 360 (Category: Child Plan / ULIP)

> [!NOTE]
> This is a **Unit Linked Insurance Plan (ULIP)** designed for child education goals. It offers market-linked returns through Equity, Debt, and Balanced funds. We use the fund performance data from Signature Assure as a proxy for its return calculations.

### Fund Data
**Proxy from Signature Assure:**
- Equity: 10.99%
- Balanced: 8.22%
- Debt: 5.05%

### Return Calculation Strategy
- **Aggressive risk appetite** → Use Equity avg: **10.99%**
- **Moderate risk appetite** → Use Balanced avg: **8.22%**
- **Conservative risk appetite** → Use Debt avg: **5.05%**
- **Key Benefits (from brochure):**
  - **Market-Linked Growth:** Corpus grows based on fund performance
  - **Premium Waiver:** If parent (life assured) passes away, all future premiums are waived — policy continues and funds keep growing for the child's education
  - **Life Cover for Parent:** Financial protection throughout the policy term
- **Simulation Note:** For child education goals, we calculate the corpus growth using CAGR based on the chosen risk profile.

---

## Overall Simulation Strategy Summary

| Product | Category | Aggressive | Moderate | Conservative | Key Feature |
|---------|----------|------------|----------|--------------|-------------|
| **Signature Assure** | ULIP | 10.99% | 8.22% | 5.05% | Wealth creation + Loyalty Additions |
| **iProtect Smart Plus** | Term Insurance | 0% | 0% | 0% | Pure life protection |
| **GIFT Pro** | Guaranteed Income | 6.00% | 6.00% | 6.00% | Guaranteed income payouts |
| **Protect N Gain** | ULIP | 10.98% | 8.41% | 5.45% | Protection + market-linked growth |
| **Wish** | Health (ULIP) | 10.98% | 8.37% | 5.96% | Health Saver funds + Health protection |
| **GPP Flexi** | Retirement (Annuity) | 6.50% | 6.50% | 6.50% | Guaranteed pension for life |
| **SmartKid 360** | Child Plan (ULIP) | 10.99% | 8.22% | 5.05% | Market-linked growth + Premium Waiver |

---

## Goal → Product Mapping Strategy

| User Goal | Recommended Product | Rationale |
|-----------|-------------------|-----------|
| Wealth Creation / Business Fund | **Signature Assure** | Broadest fund selection, highest growth potential |
| Retirement Planning | **GPP Flexi** | Guaranteed pension for life — zero market risk |
| Child Education / Marriage | **SmartKid 360** | Milestone-aligned payouts + premium waiver protection |
| Home Purchase / Home Loan | **Protect N Gain** | Growth + built-in accidental & life cover |
| Family Protection / Debt Repayment | **iProtect Smart Plus** | Highest life cover at lowest premium cost |
| Legacy / Guaranteed Income | **GIFT Pro** | Flexible guaranteed income stream |
| Health Protection | **Wish** | Health savings + women-specific critical illness cover |

> [!TIP]
> **All 7 products now have complete data.** Ready for implementation in the simulation engine.
