# Simulation Engine Mathematical Models

The AI Simulation Engine uses robust financial mathematics to project inflation, calculate compounding returns, and simulate specific insurance product features. Below are the detailed mathematical models categorized by plan type and function.

## 1. Core Inflation & Cost Projection (All Plans)

Before any product is simulated, the engine calculates the **Future Value (FV)** of the goal to determine the true "Corpus Needed" adjusting for inflation over the remaining years.

```math
FV = PV \times (1 + r)^n
```
* **PV (Present Value):** "Cost Today" of the goal
* **r:** Expected Annual Inflation Rate (e.g., 0.06 for 6%)
* **n:** Years remaining until the Goal Target Age

> [!NOTE]
> For **Child Education (Abroad)** plans, a strict **2.2x multiplier** is applied to the final FV to account for currency conversion and international tuition premiums.

---

## 2. Market-Linked Plans (ULIPs - e.g., ICICI Pru Signature)

For growth-oriented goals (Wealth Creation, Business Funds), the engine maps to ULIPs and calculates a **Stepped-Up SIP** combined with **Wealth Boosters**.

### Stepped-Up SIP Compounding
If you have an "Annual SIP step-up" (e.g., increasing contributions by 10% each year), the Future Value of the SIPs is calculated as the sum of compounding for each individual year's contribution:

```math
FV_{SIP} = \sum_{t=1}^{n} \left[ SIP_1 \times (1 + i)^{t-1} \times \left( \frac{(1 + \frac{R}{12})^{12} - 1}{\frac{R}{12}} \right) \times (1 + \frac{R}{12}) \times (1 + R)^{n-t} \right]
```
* **$SIP_1$:** Base monthly contribution in Year 1
* **i:** Annual Step-Up Increment (e.g., 0.10)
* **R:** Annual Blended Return Rate (e.g., 0.11 for Aggressive)
* **n:** Total investment horizon in years

### ULIP Wealth Booster Additions
To perfectly simulate the ICICI Pru Signature product, the engine injects a guaranteed **3.25% addition** based on the average fund value, deposited at the end of every 5th policy year, starting from the end of the 10th policy year.

```math
Booster_{total} = \sum_{y \in \{10, 15, 20...\}}^{n} \left( FundValue_y \times 0.0325 \right) \times (1 + R)^{n-y}
```
* **$FundValue_y$:** The projected corpus size at year $y$
* **$R$:** The compounded return rate for the remaining $n - y$ years.

---

## 3. Protection & Guaranteed Plans (e.g., ICICI Pru iProtect Smart)

For conservative goals (Family Protection, Health, Debt Repayment), the engine completely ignores equity market returns and relies purely on the **Risk-Free Rate** to anchor the payout to a guaranteed minimum.

```math
FV = PV_{savings} \times (1 + R_{risk\_free})^n
```
* **$R_{risk\_free}$:** The fixed safe return rate (typically hardcoded to ~6.5% - 7%). 
* The required SIP is then strictly calculated using a flat annuity formula to guarantee the gap is closed with zero market volatility.

---

## 4. Retirement Plans (e.g., ICICI Pru Easy Retirement)

Retirement uses a unique **Reverse Drawdown Model**. The engine must calculate the exact corpus required to generate an inflation-adjusted monthly income that lasts from Retirement Age until Life Expectancy, while the remaining corpus continues to earn a risk-free rate during retirement.

### Step A: Inflate Current Expenses to Retirement Age
```math
Annual Expenses_{retire} = (Monthly Expenses \times 12) \times (1 + Inflation)^{Years To Retire}
```

### Step B: Real Return Calculation
The engine calculates the "Real Return" during the retirement years (the gap between safe returns and ongoing inflation):
```math
Real Return = \left( \frac{1 + R_{risk\_free}}{1 + Inflation} \right) - 1
```

### Step C: The Drawdown Annuity Formula
The total Retirement Corpus needed at the exact age of retirement is calculated using the Present Value of an Annuity formula:

```math
Corpus = Annual Expenses_{retire} \times \left[ \frac{1 - (1 + Real Return)^{-Retirement Years}}{Real Return} \right]
```
* **Retirement Years:** Life Expectancy (e.g., 85) - Retirement Age (e.g., 60)

> [!TIP]
> If the Real Return is 0 or negative, the engine conservatively calculates the corpus simply as `Annual Expenses × Retirement Years`.
