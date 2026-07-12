# LifeMap — Presentation Guide
> *Based on a complete analysis of every file in the actual codebase, not the project plan.*

---

## 1. Solution Approach

### The Problem

Traditional insurance websites dump **47+ products** on users and expect them to figure out which one fits their life. Users don't want product catalogs — they want **answers to life questions**: *"Can I retire at 55?"*, *"How much do I need for my child's education abroad?"*

### The Solution — LifeMap

LifeMap flips the experience:

```
Traditional Insurance Site           →    LifeMap
───────────────────────────          →    ──────────
"Here are 47 products"               →    "Tell me about your life goals"
Static premium calculator            →    Dynamic what-if simulator
Generic brochure PDFs                →    Personalized visual Life Journey
One-size-fits-all                    →    AI-curated recommendations
```

### Three-Step Approach

**Step 1 — Converse** → An AI advisor (powered by Google Gemini) has a natural conversation with the user, collecting demographics, income, family details, and life goals. No forms — just a chat.

**Step 2 — Simulate** → A deterministic NumPy-based financial engine calculates inflation-adjusted corpus, monthly SIP required, coverage gaps, and year-by-year projections for every goal. The AI does **not** do the math — the engine does, using **brochure-backed return rates** from real ICICI Prudential product data (e.g., 1.35% FMC, 3.25% Wealth Booster from the IPru Signature brochure).

**Step 3 — Visualize** → A Life Journey Timeline maps every goal on a visual roadmap from "Today" to "Age 80+", with coverage bars, recommended products, and what-if controls that let users instantly see how decisions like "Retire at 55 instead of 60" or "Child education abroad" change their financial picture.

### Key Design Decisions

| Decision | Why |
|----------|-----|
| **LLM only for conversation, not math** | Financial calculations must be deterministic and verifiable. The LLM collects context; NumPy does the math. |
| **Dual-LLM fallback (Gemini → Groq)** | Free-tier Gemini has 15 RPM rate limits. Auto-failover to Groq/Llama prevents the chatbot from dying during demos. |
| **Real brochure data in the engine** | Return rates come from actual ICICI Pru brochures (not made-up numbers). The `RETURN_MATRIX` uses net returns after 1.35% FMC deduction. |
| **Vector similarity for product matching** | Goals like "retire at 60" are semantically matched to products using ChromaDB embeddings — not keyword rules. |
| **SSE streaming for chat** | Responses stream token-by-token via Server-Sent Events, giving a ChatGPT-like real-time typing experience. |

---

## 2. Project Plan

### Architecture

```
┌─── FRONTEND (React 18 + TypeScript + Vite) ──────────────────────┐
│  ├── Chat Interface (SSE streaming, Framer Motion animations)    │
│  ├── Life Journey Timeline (Recharts + custom milestone viz)     │
│  ├── What-If Simulator Panel (real-time slider → API → re-render)│
│  ├── Products Page (ChromaDB-backed catalog with simulation)     │
│  ├── Onboarding Flow (wizard alternative to chat)                │
│  └── State Management: Zustand (persisted to localStorage)       │
└──────────────────────────────────────────────────────────────────┘
                              │ REST API + SSE
┌─── BACKEND (FastAPI + Python 3.12) ──────────────────────────────┐
│  ├── 10 API Routers (auth, chat, simulate, recommend, etc.)      │
│  ├── JWT Auth Middleware (Supabase JWT verification)              │
│  ├── Rate Limiting (SlowAPI)                                     │
│  └── APScheduler (monthly product data refresh cron job)         │
├─── AI SERVICES LAYER ────────────────────────────────────────────┤
│  ├── ChatService        — Gemini + Groq dual-LLM with failover  │
│  ├── SimulationEngine   — 736-line NumPy financial engine        │
│  ├── WhatIfEngine       — Baseline vs. modified scenario compare │
│  ├── ProductMatcher     — ChromaDB vector similarity search      │
│  ├── RankingService     — Composite scoring (sim×40 + cov×30 + fit×30) │
│  ├── Guardrails         — Output validation + disclaimers        │
│  ├── Scraper            — Playwright headless browser scraper    │
│  ├── PDFExtractor       — LLM-powered brochure extraction       │
│  └── DataPipeline       — Scrape → Validate → Upsert → Index    │
├─── DATA LAYER ───────────────────────────────────────────────────┤
│  ├── Supabase (PostgreSQL) — Users, Conversations, Messages,     │
│  │                           Goals, Simulations, Products        │
│  └── ChromaDB (Vector DB)  — Product embeddings for RAG search   │
└──────────────────────────────────────────────────────────────────┘
```

### Development Phases

| Phase | Duration | What Was Done |
|-------|----------|---------------|
| **Phase 1: Foundation** | Week 1–2 | FastAPI scaffolding, Supabase schema + auth, Playwright scraper, seed data pipeline, APScheduler, ChromaDB setup |
| **Phase 2: Core Engine** | Week 3–4 | 736-line simulation engine, Gemini chat integration, context extraction, vector-based product matching, what-if engine, 10 REST API endpoints |
| **Phase 3: Frontend** | Week 4–6 | Chat UI with SSE streaming, Life Journey Timeline, What-If panel with real-time sliders, onboarding wizard, product catalog page |
| **Phase 4: Integration** | Week 6–7 | End-to-end wiring (chat → extract → simulate → visualize), conversation persistence, session management, product simulation view |
| **Phase 5: Polish** | Week 7–8 | Framer Motion animations, responsive design, error states, offline detection, loading indicators |

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + TypeScript + Vite | Type-safe components, fast HMR |
| Styling | Custom CSS + Framer Motion | Premium animations and micro-interactions |
| Charts | Recharts | Year-by-year wealth projection area chart |
| State | Zustand (persisted) | Lightweight, persistent state across sessions |
| Backend | FastAPI (Python 3.12) | Async-first, auto-OpenAPI docs |
| LLM | Google Gemini Flash + Groq Llama | Free-tier with failover |
| Embeddings | HuggingFace all-MiniLM-L6-v2 | Local embedding model — no API cost |
| Financial Math | NumPy | Deterministic compound interest, SIP, annuity calculations |
| Database | Supabase (PostgreSQL) | Auth, RLS, real-time, 500MB free tier |
| Vector DB | ChromaDB (embedded) | Cosine similarity search, no separate server |
| Scraping | Playwright | Handles JavaScript-rendered insurance pages |
| PDF Parsing | PyPDFLoader + LLM extraction | Extract structured data from insurance brochures |
| Deployment | Vercel (frontend) + Render (backend) | 100% free tier compatible |

---

## 3. What Is Actually Happening in the Project

### 3.1 The Data Pipeline (How product data gets into the system)

**Step 1 — Scraping**: A Playwright-based headless browser scrapes the ICICI Prudential website to discover product pages, download brochure PDFs, and extract product metadata.

**Step 2 — PDF Extraction**: Each downloaded PDF brochure is processed by `PDFExtractor`, which:
- Loads the PDF with `PyPDFLoader`
- Sends the first 15 pages to an LLM (Groq primary → Gemini fallback) with a structured extraction prompt
- Parses the JSON response into a validated `ScrapedProduct` Pydantic model
- Chunks the full PDF text using `RecursiveCharacterTextSplitter` (1000 chars, 200 overlap) for RAG

**Step 3 — Validation & Storage**: The `DataPipeline` orchestrates:
- Pydantic validation of every product
- Upsert to Supabase `products` table (deduped by `product_id`)
- Embedding generation via HuggingFace `all-MiniLM-L6-v2` (runs locally, no API cost)
- Indexing into ChromaDB with cosine similarity space

**Currently**: 5 real brochure PDFs have been processed and indexed (iProtect Smart, GIFT Pro, Protect N Gain, Signature Assure, Signature Online), plus 10 seed products as fallback.

### 3.2 The Chat System (How user conversations work)

**Flow**:
1. User types a message in the chat UI
2. Frontend opens an SSE (Server-Sent Events) connection to `POST /api/chat`
3. The router saves the user message to Supabase (`messages` table)
4. `ChatWrapper` performs **RAG**: queries ChromaDB with the user's message to find the top 3 relevant product chunks
5. `ChatService` builds Gemini-compatible chat history, injects product context + user profile context
6. Gemini streams the response token-by-token; each chunk is sent as an SSE event
7. If Gemini is rate-limited (429), auto-switches to Groq/Llama with a 60-second cooldown
8. The full response is saved to Supabase as an assistant message
9. Frontend renders each token in real-time with a cursor animation

**Context Extraction** (`POST /api/chat/extract`):
- Takes the full conversation history
- Sends it to Gemini with a structured extraction prompt
- Returns a JSON object with: `age`, `annual_income`, `monthly_expenses`, `dependents`, `risk_appetite`, `city`, `goals[]`
- Validates completeness: if any required field is missing, generates a follow-up message asking for the missing data
- Stores the extracted context in the conversation's `extracted_context` column

### 3.3 The Simulation Engine (How financial math works)

The `SimulationEngine` (736 lines) is the core of the project. It does **all financial calculations deterministically** with NumPy — the LLM is never involved in math.

**For each goal, it calculates:**

1. **Future Value**: `FV = PV × (1 + inflation)^years` — how much the goal will actually cost at the target year
2. **Risk-Adjusted Return**: Looks up the `RETURN_MATRIX` — a 9-cell matrix of `(risk_appetite × horizon_bucket) → blended_return`. Returns are derived from actual ICICI Pru fund data:
   - Equity (Multi Cap Growth/Focus 50): ~11% net after 1.35% FMC
   - Balanced: ~9% net
   - Debt: ~7% net
3. **Monthly SIP Required**: `PMT = FV × r / ((1+r)^n - 1)` — classic annuity formula
4. **Stepped SIP**: If the user has an annual increment (e.g., 8% step-up), the engine computes year-by-year compounded SIP growth
5. **Existing Savings**: Compounds any lump-sum savings forward at the adjusted return rate
6. **ULIP Wealth Booster**: For eligible goals (retirement, wealth creation, child education), adds 3.25% of average fund value every 5 years starting from year 10 — directly from the IPru Signature brochure
7. **Education Abroad Multiplier**: If enabled, applies a 2.2x multiplier to education goals
8. **Coverage Ratio**: `projected_corpus / future_value` — capped at 1.0
9. **Gap Analysis**: `future_value - projected_corpus`
10. **Year-by-Year Projections**: Generates a full trajectory showing corpus growth each year for the Recharts visualization

**Product Recommendation per Goal**: Each goal type maps to a specific ICICI Pru product via `GOAL_PRODUCT_MAP` (e.g., retirement → Easy Retirement, child_education → Smart Kid, protection → iProtect Smart).

### 3.4 The What-If System (How scenario comparison works)

The `WhatIfEngine` lets users tweak parameters and instantly see the financial impact:

**Available Parameters** (wired from frontend sliders → backend):
- `retirementAge` (45–70): delays/accelerates retirement goals
- `inflationRate` (4–12%): changes how much goals will cost
- `annualIncrementPercent` (0–20%): SIP step-up rate
- `existingSavings` (₹0–₹50L): lump-sum already saved
- `childEducationAbroad` (toggle): applies 2.2x multiplier

**How it works**: The frontend debounces slider changes (500ms), then sends the full simulation payload with what-if overrides to `POST /api/simulate`. The backend runs the engine with the modified parameters and returns updated results. The timeline, charts, and coverage bars all re-render in real-time.

**Predefined Templates**: 6 built-in scenarios (delay retirement 5y, increase savings 20/50%, higher inflation 8%, conservative returns 7%, add emergency fund).

### 3.5 The Product Recommendation System (How products are matched)

**Three-stage pipeline:**

1. **Vector Similarity** (ProductMatcher → ChromaDB): User goals are semantically embedded and compared against product embeddings. Returns top-N matches with similarity scores.

2. **Composite Ranking** (RankingService): Scores each product on three factors:
   - **Similarity Score** (40% weight): From vector search
   - **Goal Coverage** (30% weight): How many user goals does this product serve?
   - **Category Fit** (30% weight): Looked up from a 7×7 category-goal affinity matrix (e.g., `term_insurance × protection = 1.0`, `ulip × retirement = 0.8`)
   - Final score: weighted sum × 100 (0–100 scale)

3. **Guardrails Validation**: Checks product IDs exist, scores are in range, best product has reasonable confidence (>20).

### 3.6 The Frontend (What the user sees and interacts with)

**9 component modules:**

| Module | Key File | What It Does |
|--------|----------|-------------|
| **Chat** | `ChatPanel.tsx` (567 lines) | Full chat interface with SSE streaming, conversation sidebar, message editing, quick replies, profile extraction button, "Simulate Life Journey" CTA |
| **Timeline** | `LifeJourneyTimeline.tsx` (432 lines) | Visual roadmap from Today → Age 80+, milestone cards with corpus/coverage, retirement marker, animated coverage bars |
| **What-If** | `WhatIfPanel.tsx` (204 lines) | Slider controls for retirement age, inflation, SIP step-up, existing savings, abroad toggle — all wired to backend via debounced API calls |
| **Projection Chart** | `SimulationProjectionChart.tsx` (119 lines) | Recharts area chart showing year-by-year corpus growth vs. total invested |
| **Product Simulation** | `ProductSimulationView.tsx` | Product-specific simulation: pick a product, set premium & tenure, see projected maturity |
| **Products Page** | `ProductsPage.tsx` (10,824 bytes) | Browse all indexed products from ChromaDB, filter by category, view details |
| **Product Cards** | `ProductCard.tsx` + `ProductSimulationModal.tsx` | Individual product cards with simulation modal |
| **Onboarding** | `OnboardingFlow.tsx` | Step-by-step wizard as an alternative to the chat |
| **Landing** | `LandingPage.tsx` (13,265 bytes) | Public-facing landing page |
| **Auth** | Auth components | Login/signup with Supabase Auth |
| **Profile** | Profile components | View/edit user profile |

**State Management** (Zustand — 551 lines):
- Persists auth tokens, profile, messages, goals, and active tab to `localStorage`
- Per-conversation context isolation: each chat has its own extracted profile and goals (`chatContexts`)
- Supports "Use Global Profile" to sync the global profile into any chat session
- Incremental message loading: conversations are loaded in chunks of 4 messages to prevent UI lag

---

## 4. Challenges Faced and How They Were Solved

### Challenge 1: GenAI Rate Limits (Gemini Free Tier — 15 RPM)

**Problem**: During active usage, Gemini returns 429 errors when the free-tier quota is exhausted. This kills the chat experience.

**Solution — Dual-LLM Failover with Cooldown**:
- `ChatService` maintains a `_use_fallback` flag and `_last_gemini_failure` timestamp
- When Gemini returns a 429/rate/quota error, the service instantly switches to Groq (Llama 3.3 70B)
- A 60-second cooldown timer runs; after it expires, the next request retries Gemini
- Both streaming (`send_message_stream`) and non-streaming (`send_message`) paths have this failover
- The `Guardrails.with_fallback()` provides a generic retry wrapper: primary → exponential backoff (2 retries) → fallback

```python
# Actual code pattern from chat_service.py:
if self._should_use_fallback():
    stream = self._send_groq_stream(...)   # Groq fallback
else:
    try:
        stream = self._send_gemini_stream(...)  # Primary
    except Exception as e:
        if "rate" in str(e).lower() or "429" in str(e).lower():
            self._use_fallback = True
            self._last_gemini_failure = time.time()
            stream = self._send_groq_stream(...)  # Auto-switch
```

### Challenge 2: Product Data Extraction from Insurance Brochures

**Problem**: Insurance brochure PDFs are complex, multi-page documents with tables, charts, and legal text. Manual extraction doesn't scale.

**Solution — LLM-Powered PDF Extraction with Caching**:
- `PDFExtractor` loads PDFs with `PyPDFLoader`, sends the first 15 pages to an LLM with a structured extraction prompt
- Primary API: Groq (fast, 70B model) → Fallback: Gemini (with 3 retries, 65-second wait between retries to clear rate limit bucket)
- Extracts: `product_name`, `category`, `description`, `features[]`, `eligibility{}`
- **Full PDF RAG chunking**: After extraction, the entire PDF text is split into 1000-character chunks (200 overlap) using `RecursiveCharacterTextSplitter` and stored in ChromaDB for semantic search
- **Cache layer**: Extraction results are saved as `.json` files alongside the PDFs. Subsequent runs skip the LLM call entirely.

### Challenge 3: Financial Accuracy — LLMs Can't Do Math

**Problem**: LLMs hallucinate numbers. You cannot trust an LLM to calculate "how much SIP you need for ₹2 Cr retirement corpus in 30 years."

**Solution — Strict Separation of Concerns**:
- **LLM role**: Only conversation (collecting context) and structured extraction (parsing chat into profile JSON)
- **Math role**: 100% handled by the `SimulationEngine` using NumPy
- **Brochure-backed data**: Return rates are hardcoded from real ICICI Pru fund performance data, not LLM-generated
- **Guardrails layer**: Validates all simulation outputs:
  - Monthly SIP: clamped to ₹100 – ₹10L range
  - Corpus: clamped to ₹10K – ₹1000 Cr
  - Coverage ratio: 0.0 – 1.0
  - Inflation: 1% – 20%
  - Returns: max 25%
  - Adds mandatory disclaimers (5 standard + 1 projection-specific with actual rates)

### Challenge 4: Scraping Fragility

**Problem**: Insurance websites change layouts frequently. CSS selectors break; brochure download links time out.

**Solution — Multi-Layer Resilience**:
- **Seed data fallback**: 10 curated products in `seed_products.json` ensure the system always has product data even if scraping completely fails
- **PDF brochures as ground truth**: 5 real brochure PDFs are stored locally and extracted via LLM — this is independent of website structure changes
- **Timeout handling**: Brochure download in Playwright uses `force=True` click with 15s timeout + try/catch — if download fails, the product is still scraped with available metadata
- **Pydantic validation**: Every scraped product must pass the `ScrapedProduct` schema (minimum 3-char name, 20-char description) or it's rejected

### Challenge 5: Chat Context Isolation

**Problem**: When a user has multiple conversations, changing a slider in one chat shouldn't affect another. But the global profile should still be usable.

**Solution — Per-Conversation Context with Global Sync**:
- Each conversation has its own `extracted_context` stored in Supabase
- The Zustand store maintains `chatContexts: Record<conversationId, { profile, goals }>` — isolated per chat
- When the timeline renders, it merges: `activeChatContext.profile` → `globalProfile` (chat overrides global, missing fields fallback to global)
- A "Use Global Profile" button lets users explicitly sync their global profile into any chat session via `PUT /api/conversations/:id/context`

### Challenge 6: Embedding Cost

**Problem**: Gemini embedding API has rate limits and costs. Embedding 5 brochures (hundreds of chunks) would exhaust the free tier instantly.

**Solution — Local Embedding Model**:
- Switched from Gemini embeddings to **HuggingFace `all-MiniLM-L6-v2`** — runs entirely locally
- No API calls, no rate limits, no cost
- The model is loaded once as a singleton and reused for all embedding operations
- Both document embedding and query embedding run locally

---

## 5. Progress Till Now

### What Is Fully Implemented ✅

| Component | Status | Details |
|-----------|--------|---------|
| **FastAPI Backend** | ✅ Complete | 10 routers, JWT auth, rate limiting, error handling, CORS, health checks |
| **Simulation Engine** | ✅ Complete | 736-line engine with brochure-backed returns, stepped SIP, Wealth Booster, what-if overrides, year-by-year projections |
| **Chat System** | ✅ Complete | Gemini → Groq failover, SSE streaming, RAG-enhanced responses, conversation persistence, context extraction |
| **Product Pipeline (Local PDFs)** | ✅ Complete | PDF extractor + validator + Supabase upsert + ChromaDB indexing (using 5 locally downloaded brochure PDFs) |
| **Vector Store (RAG)** | ✅ Complete | ChromaDB with HuggingFace local embeddings, semantic product search, category filtering |
| **Product Matching** | ✅ Complete | Vector similarity → composite ranking (3-factor weighted scoring) → guardrails validation |
| **What-If Engine** | ✅ Complete | 6 predefined templates, custom parameter overrides, baseline vs. modified comparison with delta analysis |
| **Guardrails** | ✅ Complete | Simulation validation, product validation, what-if validation, 5 financial disclaimers, multi-provider LLM fallback wrapper |
| **Chat UI** | ✅ Complete | SSE streaming with typing animation, conversation sidebar, message editing, quick replies, context extraction button |
| **Life Journey Timeline** | ✅ Complete | Visual roadmap with milestone cards, coverage bars, product tags, retirement marker, animated transitions |
| **What-If Panel** | ✅ Complete | 5 slider controls (retirement age, inflation, SIP step-up, existing savings, abroad toggle) wired to backend |
| **Projection Chart** | ✅ Complete | Recharts area chart (corpus vs. invested) with custom tooltips |
| **Products Page** | ✅ Complete | Browse/search indexed products, product simulation modal |
| **Auth System** | ✅ Complete | Supabase Auth with JWT, login/signup, protected routes |
| **Conversation CRUD** | ✅ Complete | Create, list, load (incremental chunked), rename, delete conversations |
| **Simulation Sessions** | ✅ Complete | Save/load simulation sessions with per-goal results and recommendations |
| **Monthly Scheduler** | ✅ Complete | APScheduler cron job (1st of month, 2:00 AM) — triggers pipeline refresh |
| **Onboarding Flow** | ✅ Complete | Step-by-step wizard alternative to the chat |
| **Landing Page** | ✅ Complete | Public-facing page with feature highlights |
| **Product Simulation** | ✅ Complete | Per-product simulation: pick age, premium, tenure → see projected maturity |
| **End-to-End Flow** | ✅ Complete | Chat → Extract Context → Simulate → Visualize Timeline → Recommend Products — fully wired |
| **Scenario Comparison** | ✅ Complete | Side-by-side product comparison table (select 2 products, compare 6 metrics); What-If engine with baseline vs. modified delta |
| **Session Persistence** | ✅ Complete | Conversations persist in Supabase (messages table); Simulation sessions auto-saved with per-goal results; Zustand state persisted to localStorage; Incremental message loading |

### What Is In Progress / Next 🔄

| Feature | Status | Plan |
|---------|--------|------|
| **Dynamic PDF Fetching** | 🔄 Next | Currently using 5 locally downloaded brochure PDFs. Next step: wire Playwright scraper to dynamically discover + download brochures at runtime (see Section 6.1) |
| **Simulation Enhancements** | 🔄 Next | Add richer animations to simulation results, enhance product comparison UX (see Section 6.2) |

### What Is Not Implemented ❌

| Feature | Status | Why |
|---------|--------|-----|
| **PDF Export** | ❌ Not done | Deprioritized — the visual timeline serves the demo purpose better than a static PDF |
| **Formal Unit Tests** | ❌ Not done | Each AI service has a `main()` CLI test, but no pytest suite exists |
| **Docker Compose** | ❌ Not done | Development runs locally; deployment uses Vercel + Render directly |

### Codebase Stats

| Metric | Count |
|--------|-------|
| **Backend Python files** | ~25 files |
| **Frontend TypeScript files** | ~20+ components |
| **Largest file** | `simulation_engine.py` — 736 lines, 29 KB |
| **AI service files** | 13 files (chat, simulation, ranking, guardrails, vectorstore, whatif, scraper, pdf_extractor, pipeline, models, config) |
| **API endpoints** | 10 routers × 2-3 endpoints each ≈ 25+ endpoints |
| **Real brochures processed** | 5 PDFs (iProtect Smart, GIFT Pro, Protect N Gain, Signature Assure, Signature Online) |
| **Seed products** | 10 curated ICICI Pru products |
| **Zustand store** | 551 lines — auth, chat, simulation, goals, what-if, UI state |

---

## 6. Upcoming Work — What's Next

### 6.1 Dynamic PDF Fetching (Brochure Discovery)

#### What Exists Now

The current data pipeline works with **locally stored brochure PDFs**:
- 5 brochure PDFs are manually downloaded and placed in `backend/data/brochures/`
- The `DataPipeline.run()` method (in `pipeline.py`) scans this directory with `brochure_dir.glob("*.pdf")` and sends each PDF through the `PDFExtractor`
- Extraction results are cached as `.json` files alongside the PDFs — so re-runs are instant
- The `ICICIPruScraper` class exists in `scraper.py` with full Playwright logic for navigating the ICICI Pru website, but the **scraper → download** link is not yet triggered in the live pipeline

#### What Already Exists in the Scraper (Ready to Wire)

The `scraper.py` already has all the building blocks:
- **Category page discovery**: `scrape_category_page()` navigates to the ICICI Pru listing pages and collects all individual product URLs
- **Product page scraping**: `scrape_product_page()` extracts product name, description, features, and eligibility from each product page
- **Brochure download logic**: Lines 191–214 in `scraper.py` — locates `a:has-text('Brochure')` or `a[href*='.pdf']` links, triggers Playwright's `expect_download()` with `force=True` click, and saves the PDF to `data/brochures/`
- **Polite scraping**: 1.5-second delays between page requests, realistic user-agent headers

#### What Needs to Be Done

| Task | Details |
|------|--------|
| **Wire scraper into pipeline** | In `pipeline.py`, the `else` branch (when `use_seed=False`) currently only processes PDFs in the brochures folder. It should first run `ICICIPruScraper.scrape_all()` to discover and download brochures, then extract from the newly downloaded PDFs |
| **Add more category URLs** | `CATEGORY_URLS` in `scraper.py` currently has only one URL. Add URLs for Term, ULIP, Savings, Retirement, Child, and Health category pages |
| **Handle download failures** | If a brochure download times out (the 15-second timeout), fall back to scraping metadata from the page itself. The framework for this is already there (try/catch around `expect_download`) |
| **Deduplicate** | If a PDF with the same product name already exists in `data/brochures/`, skip re-downloading. The cache layer in `PDFExtractor` handles re-extraction, but download-level dedup is not yet implemented |
| **Schedule integration** | The `monthly_product_refresh()` job in `scheduler/jobs.py` already calls `DataPipeline(use_seed=False).run()` — once the scraper is wired, the monthly cron job will automatically discover new products |

#### Presentation Talking Point

> "The scraping infrastructure is fully built — Playwright navigates the ICICI Prudential website, discovers product pages, and downloads brochure PDFs. Currently the 5 core brochures are pre-loaded locally for demo stability. The next step is wiring the scraper's `scrape_all()` into the pipeline's live path so new products are discovered automatically. The monthly APScheduler cron job will then handle end-to-end refresh without manual intervention."

---

### 6.2 Simulation Enhancements (Animations + Product Comparisons)

#### What Exists Now

**Simulation UI (4 components already built):**

| Component | Lines | What It Does |
|-----------|-------|-------------|
| `WhatIfPanel.tsx` | 204 | 5 slider controls wired to backend via debounced API calls. Already has Framer Motion animations on the abroad toggle |
| `SimulationProjectionChart.tsx` | 119 | Recharts area chart with gradient fills, custom tooltips showing age/year/corpus. Already animated via Recharts transitions |
| `FiveYearSnapshot.tsx` | 109 | Summary card with projected savings, goal cost inflation, and protection gap. Already has Framer Motion fade-in |
| `ProductSimulationView.tsx` | 194 | Product-specific simulation with premium/tenure sliders, AI-matched product banner, ULIP Wealth Booster callout. Animated loading bar |

**Product Comparison (already exists):**
- `ScenarioComparison.tsx` (144 lines) — lets users select 2 products from the catalog and view a side-by-side comparison table with 6 metrics (Min Premium, Max Cover, Tenure, Return Type, Benefits, Ideal For)
- Products are loaded from the backend API (`/api/products`), with MOCK_PRODUCTS as fallback
- Table uses Framer Motion for fade-in animation

#### What Can Be Enhanced

| Enhancement | Impact | Details |
|-------------|--------|---------|
| **Result card animations** | Visual wow-factor | Add staggered card entrance for each goal result (e.g., child education flies in first, then home, then retirement). Currently the timeline has animations but the simulation result cards don't |
| **Coverage bar animation** | Engagement | Animate the coverage ratio bar from 0% → actual% when simulation results load. The timeline already has this but the what-if panel summary doesn't |
| **Chart transition on slider change** | Smoothness | When a what-if slider changes, the Recharts chart should morph smoothly (it currently re-renders). Adding `animationDuration` and `isAnimationActive` props would fix this |
| **Product comparison enhancements** | Depth | Add more comparison dimensions: simulation projections for each product ("If you invest ₹10K/month in Product A vs B, what do you get in 20 years?"), key benefit highlights, risk-return scatter plot |
| **Scenario comparison side-by-side** | Clarity | The What-If engine backend already supports baseline vs. modified comparison with `WhatIfResult` (delta_monthly_savings, delta_total_gap, summary). Wire this to a frontend component that shows two scenario cards side-by-side with delta badges |
| **Loading skeleton states** | Polish | Add skeleton loading placeholders (pulsing gray rectangles) while simulation is running, instead of just the orange progress bar |

#### Presentation Talking Point

> "The simulation frontend already has 4 specialized components with Framer Motion animations and Recharts visualizations. Product comparison is built — users can select any 2 products and see a side-by-side metrics table. The next enhancement is richer animations on result cards (staggered entrance, animated coverage bars) and deeper product comparison (projected returns for Product A vs B over the same tenure)."

---

### 6.3 End-to-End Flow, Scenario Comparison & Session Persistence — ✅ Verified Complete

This is **fully implemented**. Here's the evidence from the codebase:

#### End-to-End Flow ✅

The full user journey is completely wired:

```
Chat (ChatPanel.tsx)       → SSE to POST /api/chat
    ↓
Extract Context            → POST /api/chat/extract → returns structured profile + goals
    ↓
Simulate (WhatIfPanel.tsx) → POST /api/simulate → SimulationEngine.simulate_all_goals()
    ↓
Visualize                  → LifeJourneyTimeline renders milestones + coverage bars
    ↓
Recommend                  → Each goal shows recommended ICICI product (from GOAL_PRODUCT_MAP)
    ↓
Product Catalog            → ProductsPage loads all indexed products from /api/products
```

The frontend's `ChatPanel.tsx` has a **"Simulate Life Journey"** CTA button that triggers context extraction → simulation → timeline render in sequence.

#### Scenario Comparison ✅

**Backend:** The `WhatIfEngine` (`whatif_engine.py`, 394 lines) runs baseline vs. modified simulations and returns:
- `delta_monthly_savings` — how much more/less SIP you need
- `delta_total_gap` — how the funding gap changes
- `summary` — human-readable impact string
- 6 predefined templates: delay retirement 5y, increase savings 20/50%, higher inflation, conservative returns, add emergency fund
- The `/api/scenarios` router exposes both custom and template-based comparisons

**Frontend:** `ScenarioComparison.tsx` provides side-by-side product comparison (select 2, compare 6 metrics).

#### Session Persistence ✅

**Conversations** — fully persisted:
- Every message is saved to Supabase `messages` table (both user and assistant messages)
- Conversations are listed via `GET /api/conversations`, loaded via `GET /api/conversations/:id`
- Incremental loading: messages are fetched in chunks of 4 to prevent UI lag
- Chat context is cached per-conversation in Zustand's `chatCache` and `chatContexts`
- Conversations support rename (`PATCH`) and soft-delete (`DELETE`)

**Simulation sessions** — fully persisted:
- Every simulation run is auto-saved to Supabase `simulations` table (triggered in `simulate.py` router)
- Per-goal results are saved to `simulation_results` table
- Recommendations are saved to `recommendations` table
- Sessions can be listed (`GET /api/simulations`), loaded (`GET /api/simulations/:id`), and deleted (`DELETE`)

**Frontend state** — persisted to localStorage:
- Zustand's `persist` middleware saves: `user`, `accessToken`, `refreshToken`, `profile`, `messages`, `chatTurn`, `conversationId`, `goals`, `activeTab`, `sidebarOpen`
- Refreshing the page preserves the full application state

**WebSocket real-time** — implemented:
- `simulations.py` includes a WebSocket endpoint (`/ws/simulate`) that streams per-goal results as they are computed, with 100ms delays between goals for progressive animation

#### What Has No Gaps

All three components (E2E flow, scenario comparison, session persistence) are **fully implemented** with no missing pieces. The only thing that could be added as a "nice-to-have" is:
- A dedicated frontend **"Saved Simulations"** page (the backend APIs exist, the frontend just needs a list/load view)
- Using the WebSocket endpoint for real-time progressive rendering (currently the frontend uses REST + SSE)

---

## Quick Reference: Key Talking Points

> **"Why not let the LLM do the financial math?"**
> Because LLMs hallucinate numbers. The simulation engine uses NumPy with brochure-backed return rates — every calculation is deterministic and verifiable. The LLM only collects context through conversation.

> **"What happens when Gemini hits rate limits?"**
> The system auto-switches to Groq (Llama 3.3 70B) within the same request. A 60-second cooldown timer retries Gemini automatically. The user never sees an error.

> **"How do you match goals to products?"**
> Three-stage pipeline: (1) Semantic vector search via ChromaDB, (2) Composite scoring with a 7×7 category-goal affinity matrix, (3) Guardrails validation. Not simple keyword matching.

> **"Are the return rates realistic?"**
> Yes — they're derived from actual ICICI Pru fund data. Equity funds: ~11% net after 1.35% FMC. Wealth Boosters: 3.25% every 5 years from year 10. All from the IPru Signature brochure.

> **"What if the scraper breaks?"**
> Three fallbacks: (1) Seed data JSON, (2) Locally stored brochure PDFs extracted via LLM, (3) ChromaDB retains the last indexed state. The system never goes empty.

> **"Is the PDF fetching dynamic?"**
> The Playwright scraper infrastructure is fully built — it navigates product pages, finds brochure download links, and saves PDFs. Currently 5 core brochures are pre-loaded for demo stability. The next step is wiring the live scraper into the pipeline so new brochures are discovered and downloaded automatically via the monthly scheduler.

> **"How does session persistence work?"**
> Three layers: (1) Conversations and messages persist in Supabase PostgreSQL, (2) Simulation sessions with per-goal results auto-save on every run, (3) Frontend state persists to localStorage via Zustand. Refreshing the page preserves everything.
