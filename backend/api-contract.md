# LifeMap API Contract v1.0

> **Base URL:** `http://localhost:8000`  
> **Auth:** Bearer JWT token from Supabase Auth  
> **Format:** JSON (application/json)

---

## System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Root — links to docs |
| GET | `/health` | No | Health check |
| GET | `/docs` | No | Swagger UI |
| GET | `/redoc` | No | ReDoc |

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | No | Create account |
| POST | `/auth/login` | No | Sign in |

### POST /auth/signup
```json
Request: { "email": "user@example.com", "password": "secret123", "full_name": "Priya" }
Response: { "access_token": "...", "refresh_token": "...", "expires_in": 3600, "user_id": "uuid", "email": "..." }
```

### POST /auth/login
```json
Request: { "email": "user@example.com", "password": "secret123" }
Response: { "access_token": "...", "refresh_token": "...", "expires_in": 3600, "user_id": "uuid", "email": "..." }
```

---

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | Yes | Get profile |
| PUT | `/users/me` | Yes | Update profile |

### PUT /users/me
```json
Request: { "age": 30, "annual_income": 1500000, "risk_appetite": "moderate", "city": "Mumbai" }
Response: { "id": "uuid", "full_name": "Priya", "age": 30, ... }
```

---

## Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | Yes | List products (filter: `?category=ulip`) |
| GET | `/api/products/{id}` | Yes | Get single product |
| POST | `/api/products` | Yes | Create/upsert product |

---

## Goals

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/goals` | Yes | List user goals |
| POST | `/api/goals` | Yes | Create goal |
| PUT | `/api/goals/{id}` | Yes | Update goal |
| DELETE | `/api/goals/{id}` | Yes | Delete goal |

### POST /api/goals
```json
Request: { "goal_type": "child_education", "target_amount": 2500000, "target_year": 2040, "priority": 1 }
Response: { "id": "uuid", "user_id": "uuid", "goal_type": "child_education", ... }
```

---

## Chat (AI)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat` | Yes | SSE streaming chat |
| POST | `/api/chat/sync` | Yes | Non-streaming chat |

### POST /api/chat (SSE)
```json
Request: { "message": "I am 30 years old and want to plan for retirement", "conversation_id": null }
Response: text/event-stream
  data: {"type": "token", "content": "Based on your"}
  data: {"type": "token", "content": "age and goals,"}
  data: {"type": "done", "content": "Based on your age and goals, ..."}
```

---

## Simulation (AI)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/simulate` | Yes | Run multi-goal simulation |

### POST /api/simulate
```json
Request: {
  "age": 30,
  "annual_income": 1500000,
  "monthly_expenses": 50000,
  "risk_appetite": "moderate",
  "goals": [
    { "goal_type": "child_education", "target_amount": 2500000, "target_year": 2040, "priority": 1 },
    { "goal_type": "retirement", "target_amount": 30000000, "target_year": 2056, "priority": 2 }
  ]
}
Response: {
  "simulation_id": "uuid",
  "user_age": 30,
  "total_monthly_savings_required": 94202.0,
  "total_gap": 129204868.0,
  "goals": [ ... per-goal results ... ],
  "disclaimers": [ "..." ],
  "warnings": []
}
```

---

## Recommendations (AI)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/recommend` | Yes | Get ranked product recommendations |

### POST /api/recommend
```json
Request: {
  "goals": [{ "goal_type": "child_education", "target_amount": 2500000, "target_year": 2040 }],
  "age": 30,
  "n_results_per_goal": 3
}
Response: {
  "recommendations": [
    { "product_name": "ICICI Pru Smart Kid", "rank": 1, "composite_score": 88.0, ... }
  ],
  "total": 3,
  "disclaimers": [ "..." ]
}
```

---

## Scenarios (What-If)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/scenarios` | Yes | Run what-if comparison |
| GET | `/api/scenarios/templates` | Yes | List available templates |

### POST /api/scenarios
```json
Request: {
  "profile": { ... SimulateRequest ... },
  "template": "delay_retirement_5y"
}
Response: {
  "scenario_name": "Delay Retirement by 5 Years",
  "baseline": { ... SimulateResponse ... },
  "modified": { ... SimulateResponse ... },
  "delta_monthly_savings": -15491.0,
  "delta_total_gap": 27298841.0,
  "summary": "..."
}
```

**Available templates:** `delay_retirement_5y`, `increase_savings_50pct`, `higher_inflation`, `lower_returns`, `add_health_goal`, `early_retirement`

---

## Simulation Sessions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/simulations` | Yes | List saved simulations |
| GET | `/api/simulations/{id}` | Yes | Load saved simulation |
| DELETE | `/api/simulations/{id}` | Yes | Delete saved simulation |
| WS | `/api/simulations/ws/simulate` | No | WebSocket real-time sim |

---

## Conversations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/conversations` | Yes | List chat sessions |
| GET | `/api/conversations/{id}` | Yes | Get session with messages |
| POST | `/api/conversations` | Yes | Create new session |
| DELETE | `/api/conversations/{id}` | Yes | Delete session |

---

## Error Responses

```json
{ "error": "error_type", "message": "Human-readable message", "detail": "..." }
```

| Code | Error Type | Meaning |
|------|-----------|---------|
| 400 | `bad_request` | Invalid request body |
| 401 | `unauthorized` | Missing/invalid JWT |
| 404 | `not_found` | Resource doesn't exist |
| 422 | `validation_error` | Input validation failed |
| 429 | `rate_limit` | Too many requests |
| 503 | `ai_service_unavailable` | Gemini/Groq is down |
| 500 | `internal_server_error` | Unexpected error |

---

## Rate Limits

| Category | Limit |
|----------|-------|
| AI endpoints (chat, simulate, recommend, scenarios) | 30 req/min |
| CRUD endpoints (goals, products, users, conversations) | 60 req/min |
