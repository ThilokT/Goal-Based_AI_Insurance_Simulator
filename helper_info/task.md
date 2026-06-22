# Frontend ↔ Backend Integration — Task Tracker

## Step 2 — Environment & Connection Setup
- [x] Create `frontend/.env` with `VITE_API_BASE_URL`
- [x] Create `frontend/src/lib/apiClient.ts` (centralized fetch wrapper)
- [x] Create `frontend/src/types/api.ts` (backend TS types + mappers)

## Step 3A — Auth Integration
- [x] Modify `AuthPage.tsx` — replace `mockSignIn`/`mockSignUp` with real API
- [x] Modify `store/index.ts` — add `accessToken`, `refreshToken`, `logout()`

## Step 3B — User Profile Integration
- [x] Modify `OnboardingFlow.tsx` — call `PUT /users/me` on finish

## Step 3C — Products Integration
- [x] Modify `ProductsPage.tsx` — replace `MOCK_PRODUCTS` with API call
- [x] Modify `ScenarioComparison.tsx` — same product data source change
- [x] Modify `Dashboard.tsx` — replace `MOCK_PRODUCTS.length` with live count

## Step 3D — Goals Integration
- [x] Modify `store/index.ts` — replace `DEFAULT_GOALS` with API-backed CRUD

## Step 3E — Chat Integration (SSE)
- [x] Modify `ChatPanel.tsx` — replace mock stream with SSE `POST /api/chat`

## Step 3F — Simulation Integration
- [x] Modify `WhatIfPanel.tsx` — replace `runSimulation()` with `POST /api/simulate`

## Step 3G — Scenarios / What-If
- [x] Optionally use `POST /api/scenarios` for side-by-side comparison (covered via WhatIfPanel API)

## Step 4 — Auth Wiring
- [x] Modify `apiClient.ts` — auto-read token, handle 401
- [x] Modify `App.tsx` — revalidate session on mount

## Verification
- [x] Build check: `npm run build` ✅ (passed — 2890 modules, built in 2.53s)
