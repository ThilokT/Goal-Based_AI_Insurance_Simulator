# LifeMap Frontend ↔ Backend Integration Plan

Complete incremental plan to replace all mock/dummy data in the React frontend with real API calls to the FastAPI backend, verifying each step before moving on.

---

## Step 1 — Audit & Mapping Table

### Backend API Endpoints (Complete Inventory)

| # | Method | Route | Auth? | Request Body | Response Body | Router File |
|---|--------|-------|-------|-------------|---------------|-------------|
| 1 | GET | `/` | No | — | `{message, docs, health}` | [main.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/main.py#L124-L131) |
| 2 | GET | `/health` | No | — | `{status, service, version}` | [main.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/main.py#L114-L121) |
| 3 | POST | `/auth/signup` | No | `{email, password, full_name}` | `TokenResponse` | [auth.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/auth.py) |
| 4 | POST | `/auth/login` | No | `{email, password}` | `TokenResponse` | [auth.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/auth.py) |
| 5 | GET | `/users/me` | Yes | — | `UserProfileResponse` | [users.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/users.py) |
| 6 | PUT | `/users/me` | Yes | `UpdateProfileRequest` | `UserProfileResponse` | [users.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/users.py) |
| 7 | GET | `/api/products` | Yes | `?category=&limit=&offset=` | `ProductListResponse` | [products.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/products.py) |
| 8 | GET | `/api/products/{id}` | Yes | — | `ProductResponse` | [products.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/products.py) |
| 9 | POST | `/api/products` | Yes | `CreateProductRequest` | `ProductResponse` | [products.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/products.py) |
| 10 | GET | `/api/goals` | Yes | — | `GoalListResponse` | [goals.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/goals.py) |
| 11 | POST | `/api/goals` | Yes | `GoalRequest` | `GoalResponse` | [goals.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/goals.py) |
| 12 | PUT | `/api/goals/{id}` | Yes | `GoalRequest` | `GoalResponse` | [goals.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/goals.py) |
| 13 | DELETE | `/api/goals/{id}` | Yes | — | 204 No Content | [goals.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/goals.py) |
| 14 | POST | `/api/chat` | Yes | `{message, conversation_id?}` | SSE stream | [chat.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/chat.py) |
| 15 | POST | `/api/chat/sync` | Yes | `{message, conversation_id?}` | `ChatResponse` | [chat.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/chat.py) |
| 16 | POST | `/api/simulate` | Yes | `SimulateRequest` | `SimulateResponse` | [simulate.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/simulate.py) |
| 17 | POST | `/api/recommend` | Yes | `RecommendRequest` | `RecommendResponse` | [recommend.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/recommend.py) |
| 18 | POST | `/api/scenarios` | Yes | `ScenarioRequest` | `ScenarioResponse` | [scenarios.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/scenarios.py) |
| 19 | GET | `/api/scenarios/templates` | Yes | — | `TemplateListResponse` | [scenarios.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/scenarios.py) |
| 20 | GET | `/api/simulations` | Yes | — | `SimulationSessionListResponse` | [simulations.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/simulations.py) |
| 21 | GET | `/api/simulations/{id}` | Yes | — | `SimulationSessionDetailResponse` | [simulations.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/simulations.py) |
| 22 | DELETE | `/api/simulations/{id}` | Yes | — | 204 No Content | [simulations.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/simulations.py) |
| 23 | WS | `/api/simulations/ws/simulate` | No | JSON `{action, data}` | JSON events | [simulations.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/simulations.py) |
| 24 | GET | `/api/conversations` | Yes | — | `list[ConversationResponse]` | [conversations.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/conversations.py) |
| 25 | GET | `/api/conversations/{id}` | Yes | — | `ConversationDetailResponse` | [conversations.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/conversations.py) |
| 26 | POST | `/api/conversations` | Yes | — | `ConversationResponse` | [conversations.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/conversations.py) |
| 27 | DELETE | `/api/conversations/{id}` | Yes | — | 204 No Content | [conversations.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/conversations.py) |

### Frontend Mock/Dummy Data Inventory

| Component | Current Data Source | Mock File | What Needs to Change |
|-----------|-------------------|-----------|---------------------|
| [AuthPage.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/auth/AuthPage.tsx) | `mockSignIn()` / `mockSignUp()` | [mocks/auth.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/mocks/auth.ts) | Replace with `POST /auth/login` and `POST /auth/signup` |
| [ChatPanel.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/chat/ChatPanel.tsx) | `streamChatResponse()` generator | [mocks/chat.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/mocks/chat.ts) | Replace with `POST /api/chat` (SSE stream) |
| [ProductsPage.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/products/ProductsPage.tsx) | `MOCK_PRODUCTS` array | [mocks/products.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/mocks/products.ts) | Replace with `GET /api/products` |
| [ScenarioComparison.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/products/ScenarioComparison.tsx) | `MOCK_PRODUCTS` array | [mocks/products.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/mocks/products.ts) | Replace with `GET /api/products` |
| [WhatIfPanel.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/simulation/WhatIfPanel.tsx) | `runSimulation()` local fn | [mocks/simulation.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/mocks/simulation.ts) | Replace with `POST /api/simulate` or `POST /api/scenarios` |
| [Dashboard.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/pages/Dashboard.tsx) | `MOCK_PRODUCTS` for count | [mocks/products.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/mocks/products.ts) | Use product count from API |
| [store/index.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/store/index.ts) | `DEFAULT_GOALS` hardcoded | [mocks/simulation.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/mocks/simulation.ts) | Replace with `GET /api/goals` |
| [OnboardingFlow.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/onboarding/OnboardingFlow.tsx) | Local state only | — | Wire to `PUT /users/me` on finish |

### Frontend Feature → Backend Endpoint Mapping

| Frontend Feature | Backend Endpoint(s) | Priority |
|-----------------|---------------------|----------|
| Login / Signup | `POST /auth/login`, `POST /auth/signup` | 🔴 P0 — Gate for everything |
| User Profile (onboarding) | `PUT /users/me`, `GET /users/me` | 🔴 P0 |
| Products listing | `GET /api/products` | 🟡 P1 |
| Product comparison | `GET /api/products` | 🟡 P1 |
| Goals CRUD | `GET/POST/PUT/DELETE /api/goals` | 🟡 P1 |
| AI Chat (streaming) | `POST /api/chat` (SSE) | 🟠 P2 |
| Financial Simulation | `POST /api/simulate` | 🟠 P2 |
| What-If Scenarios | `POST /api/scenarios`, `GET /api/scenarios/templates` | 🟠 P2 |
| Recommendations | `POST /api/recommend` | 🟠 P2 |
| Conversation history | `GET/POST/DELETE /api/conversations` | 🟢 P3 |
| Simulation sessions | `GET/DELETE /api/simulations` | 🟢 P3 |
| Dashboard stats | Aggregation of above endpoints | 🟢 P3 |

---

## User Review Required

> [!IMPORTANT]
> **Data Shape Mismatches Found** — The frontend `Product` type and backend `ProductResponse` schema have significantly different fields. The frontend has `tagline`, `minPremium`, `coverageUpTo`, `keyBenefits`, `idealFor`, `returnType`, `tenure`, `badge` while the backend stores `product_id`, `name`, `category`, `description`, `min_age`, `max_age`, `policy_term_min`, `policy_term_max`, `key_benefits`, `goals_supported`. We need to decide whether to:
> 1. **Adapt the frontend** to display backend fields (lossy — loses tagline, badges, premium info)
> 2. **Enrich the backend products** table to include the missing fields
> 3. **Keep mock data as a fallback** for display-only fields while using backend for data-driven features
>
> I recommend **option 3 for now** — use the backend API for data fetching (category filtering, auth-gated access) but merge with a local display-enhancement layer for the fields the backend doesn't have yet. This way integration works without backend schema changes.

> [!WARNING]
> **Frontend `SimulationResult` vs Backend `SimulateResponse`** — These are fundamentally different shapes:
> - Frontend: `{goalId, corpusNeeded, coveredAmount, gap, recommendedProducts, monthlyPremium}`
> - Backend: `{goal_type, target_amount, future_value, years_remaining, monthly_savings_required, current_gap, projected_corpus, coverage_ratio, ...}`
>
> We'll need a **mapper function** in the API client to transform backend responses into the frontend's expected shape.

---

## Open Questions

> [!IMPORTANT]
> 1. **Do you have valid Supabase credentials?** The backend requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, and optionally `SUPABASE_JWT_SECRET`. Without these, the auth flow and all DB operations will fail. Do you have a Supabase project set up?
>
> 2. **Do you have AI API keys?** The chat/simulate/recommend endpoints need `GEMINI_API_KEY` and/or `GROQ_API_KEY` for the AI services to work. If not available, should we keep mock fallbacks for AI features?
>
> 3. **Product data source** — The backend's `GET /api/products` reads from a Supabase `products` table. Is this table seeded with data? If empty, the products page will be blank. Should I create a seed script using the mock data?
>
> 4. **Backend running?** Have you been able to start the backend (`uvicorn app.main:app --reload`)? If there are dependency issues, we should fix those first.

---

## Proposed Changes

### Step 2 — Environment & Connection Setup

#### [NEW] [.env](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/.env)
- `VITE_API_BASE_URL=http://localhost:8000`

#### [NEW] [apiClient.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/lib/apiClient.ts)
- Centralized `fetch` wrapper with:
  - Base URL from env var
  - Auto-attach `Authorization: Bearer <token>` header
  - JSON parsing with error extraction
  - Loading/error state helpers
  - SSE stream helper for chat
  - Timeout handling (10s default)
  - Retry on 503 (AI service unavailable)

#### [MODIFY] [config.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/config.py)
- Verify `CORS_ORIGINS` includes `http://localhost:5173` (already present ✅)

---

### Step 3A — Auth Integration

#### [MODIFY] [AuthPage.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/auth/AuthPage.tsx)
- Replace `mockSignIn()` / `mockSignUp()` with real API calls via `apiClient`
- Store `access_token` and `refresh_token` in `localStorage`
- Map `TokenResponse` to the existing `AuthUser` shape in the store
- Keep demo login buttons but wire them through the real API
- Add error handling for network/401/400 responses

#### [MODIFY] [store/index.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/store/index.ts)
- Add `accessToken` and `refreshToken` to persisted state
- Add `logout()` action that clears tokens and user
- Update `AuthUser` import to use a local interface (not from mocks)

#### [NEW] [types/api.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/types/api.ts)
- TypeScript interfaces matching all backend response schemas
- Mapper functions: `mapTokenResponseToAuthUser()`, `mapBackendProduct()`, `mapBackendSimulation()`, etc.

---

### Step 3B — User Profile Integration

#### [MODIFY] [OnboardingFlow.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/onboarding/OnboardingFlow.tsx)
- On `finish()`, call `PUT /users/me` with profile data mapped to backend format
- Map frontend `{name, age, city, income, riskAppetite, familySize, goals}` → backend `{full_name, age, city, annual_income, risk_appetite, dependents}`
- Note: `income` in frontend is monthly, backend expects `annual_income`
- Note: `familySize` maps to `dependents`

---

### Step 3C — Products Integration

#### [MODIFY] [ProductsPage.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/products/ProductsPage.tsx)
- Replace `MOCK_PRODUCTS` with API call `GET /api/products`
- Add loading spinner, error state, empty state
- Map backend `ProductResponse` to frontend `Product` type (with display fallbacks)
- Support category filter via `?category=` query param

#### [MODIFY] [ScenarioComparison.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/products/ScenarioComparison.tsx)
- Same product data source change

#### [MODIFY] [Dashboard.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/pages/Dashboard.tsx)
- Replace `MOCK_PRODUCTS.length` with live product count

---

### Step 3D — Goals Integration

#### [MODIFY] [store/index.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/store/index.ts)
- Replace `DEFAULT_GOALS` initialization with empty array
- Add `loadGoals()` async action → `GET /api/goals`
- Add `createGoal()` / `updateGoal()` / `deleteGoal()` actions

---

### Step 3E — Chat Integration (SSE)

#### [MODIFY] [ChatPanel.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/chat/ChatPanel.tsx)
- Replace `streamChatResponse()` mock with SSE `POST /api/chat` using `fetch` + `ReadableStream`
- Parse SSE events: `type: "token"` (append to accumulated), `type: "done"` (finalize), `type: "error"` (show error)
- Extract `X-Conversation-Id` from response headers and track it
- Add conversation persistence using conversation endpoints

---

### Step 3F — Simulation Integration

#### [MODIFY] [WhatIfPanel.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/simulation/WhatIfPanel.tsx)
- Replace local `runSimulation()` with `POST /api/simulate`
- Map slider params to `SimulateRequest` format
- Map `GoalResultResponse` back to frontend `SimulationResult` shape
- Add debounce (500ms) so we don't spam API on every slider move

---

### Step 3G — Scenarios/What-If Integration

#### [MODIFY] [WhatIfPanel.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/components/simulation/WhatIfPanel.tsx)
- Optionally use `POST /api/scenarios` for side-by-side comparison
- Fetch templates from `GET /api/scenarios/templates`

---

### Step 4 — Authentication Wiring

#### [MODIFY] [apiClient.ts](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/lib/apiClient.ts)
- Auto-read token from Zustand store
- On 401 response: clear tokens, redirect to login
- Handle token expiry gracefully

#### [MODIFY] [App.tsx](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/frontend/src/App.tsx)
- On mount: if `accessToken` exists, call `GET /users/me` to re-validate session
- If token is expired, force logout

---

## Verification Plan

### After Each Step

| Step | Verification |
|------|-------------|
| Step 2 | `GET /health` returns `{status: "healthy"}` from frontend |
| Step 3A | Login with real Supabase creds → token stored, user displayed |
| Step 3B | Complete onboarding → profile saved in Supabase `profiles` table |
| Step 3C | Products page loads from API, category filter works |
| Step 3D | Goals persist across page reloads |
| Step 3E | Chat streams tokens from backend AI → rendered in real-time |
| Step 3F | Simulation returns real numbers, results render in UI |
| Step 4 | Refresh page → session persists. Expired token → redirect to login |
| Step 5 | Full walkthrough: login → onboard → chat → simulate → products |

### Manual Verification
- Open browser DevTools → Network tab → verify all requests go to `localhost:8000`
- Check backend terminal for request logs
- Verify no console errors in browser

### Automated Tests
- Backend: `pytest` (existing test directory)
- Frontend: build check: `npm run build` in `frontend/`
