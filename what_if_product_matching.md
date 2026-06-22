# Does Product Matching Happen After Every What-If Change?

**Yes**, in the current architecture, **product matching and recommendation happens on every What-If slider change.**

Here is the exact flow of what happens when you adjust a slider (e.g., changing the Inflation Assumption from 6% to 8%):

## 1. The Frontend Trigger (`WhatIfPanel.tsx`)

When you move a slider in the `WhatIfPanel`, it triggers the `update()` function. This function debounces the input by 500ms (to prevent spamming the server while dragging the slider), and then fires a request to `POST /api/simulate`:

```typescript
// frontend/src/components/simulation/WhatIfPanel.tsx
const runApiSimulation = useCallback(async (params: typeof whatIfParams) => {
    // ... builds payload ...
    const payload: SimulateRequest = {
      // ... profile and goals ...
      inflation_rate: params.inflationRate / 100,
      existing_savings: params.existingSavings,
      annual_increment_percent: params.annualIncrementPercent / 100,
      // ...
    }
    const res = await api.post<BackendSimulateResponse>('/api/simulate', payload)
    // ... updates UI ...
}
```

## 2. The API Route (`simulate.py`)

The `/api/simulate` endpoint receives the request and passes it to the `run_simulation()` wrapper.

```python
# backend/app/routers/simulate.py
@router.post("/simulate")
async def simulate(request: Request, body: SimulateRequest, ...):
    result = run_simulation(body.model_dump())
    # ...
```

## 3. The Wrapper (`simulation_wrapper.py`)

Inside `run_simulation()`, the system:
1. Runs the financial math using the `SimulationEngine` with the new What-If parameters.
2. Validates the results using `Guardrails`.
3. **Re-matches the product for every goal.**

Notice lines 95-104 in `simulation_wrapper.py`:

```python
# backend/app/services/simulation_wrapper.py
    # Build response with product recommendations
    goal_dicts = []
    for g in result.goals:
        goal_data = g.model_dump()
        
        # ---> THIS IS WHERE PRODUCT MATCHING HAPPENS <---
        # Attach recommended product
        product = get_product_for_goal(g.goal_type) 
        
        goal_data["recommended_product_name"] = product["name"]
        goal_data["recommended_product_category"] = product["category"]
        goal_data["recommended_product_id"] = product["id"]
        goal_dicts.append(goal_data)
```

### Note on "Product Matching" vs "Product Recommendation"

There is a subtle but important distinction in how the backend handles this:

*   **During `/api/simulate` (What-If Sliders):** It does a fast, static lookup using `get_product_for_goal(g.goal_type)`. This uses a hardcoded dictionary (`GOAL_PRODUCT_MAP` in `simulation_engine.py`) to instantly map a goal type (like `retirement`) to a flagship product (like `ICICI Pru Easy Retirement`). It does **not** do a heavy vector database search.
*   **During `/api/recommend` (Explore Products):** This is where the heavy lifting happens. It calls `ProductMatcher`, which converts the goal into a natural language query, runs a semantic search against ChromaDB, calculates density bonuses, and ranks the results using the `RankingService`.

### Summary

So, while a new product is attached to the simulation result every time a slider is moved, it is using a **static mapping**, not running a full AI vector search every 500ms. 

This design ensures the What-If sliders remain extremely fast and responsive while still showing a relevant product name on the updated goal cards.
