# 🎤 IPru LifeMap — Presentation Guide

> **Project:** Goal-Based AI Insurance Simulator  
> **Presenter:** [Your Name]  
> **Total Duration:** ~15 minutes (adjust per instructions)

---

## 📋 Presentation Structure Overview

| # | Section | Duration | Slides |
|---|---------|----------|--------|
| 1 | Approach to Problem Statement | 3 min | 3 slides |
| 2 | Project Plan | 3 min | 3 slides |
| 3 | What Has Been Executed Till Now | 5 min | 5 slides + Live Demo |
| 4 | Learnings & Challenges | 3 min | 3 slides |
|   | Q&A Buffer | 1 min | — |

---

## SECTION 1: Approach to Problem Statement

---

### Slide 1 — The Problem (Opening Hook)

**Title:** *"Why do 73% of Indians drop off insurance websites within 2 minutes?"*

**Content (use visuals — icons or a comparison graphic):**

| Traditional Insurance Website | What Users Actually Want |
|-------------------------------|------------------------|
| 47+ product catalogs dumped on a single page | A conversation about *their* life goals |
| Static premium calculators with 15 input fields | A dynamic "what-if" simulator they can play with |
| Generic PDFs and brochures | A personalized visual roadmap |
| One-size-fits-all recommendations | AI-curated, goal-matched products |

> **Speaker Notes:**  
> *"Insurance is fundamentally a life-planning tool, but the industry has turned it into a transactional catalog experience. Users are overwhelmed, confused, and disengaged. The real question isn't 'which product should I buy?' — it's 'how do I financially protect my life goals?' That's the gap we're solving."*

---

### Slide 2 — Our Solution: IPru LifeMap

**Title:** *"From Product Catalogs to Life Planning Journeys"*

**Content (show the end-to-end user journey as a flow diagram):**

```
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │  1. CONVERSE  │ ──→ │  2. SIMULATE  │ ──→ │  3. VISUALIZE │
 │              │     │              │     │              │
 │ AI chat asks │     │ Engine calcs │     │ Life Journey │
 │ about goals, │     │ corpus, gap, │     │ timeline +   │
 │ income, age  │     │ what-if      │     │ product map  │
 └──────────────┘     └──────────────┘     └──────────────┘
```

**Three Key Differentiators (bullet points):**

1. **Conversational AI First** — Users talk to an AI advisor (Gemini-powered) that understands their life context naturally, instead of filling forms
2. **Goal-Based Simulation** — A NumPy-powered financial engine calculates inflation-adjusted corpus, gap analysis, and stepped-up SIP projections for each life goal
3. **Smart Product Mapping** — Vector similarity search (ChromaDB) matches each goal to the best-fit ICICI Prudential product automatically

> **Speaker Notes:**  
> *"Our approach flips the insurance discovery model. Instead of 'here are 47 products, good luck' — we say 'tell me about your dreams.' The AI collects context through conversation, the simulation engine does the math, and the product mapper finds the right ICICI Prudential product for each life goal. The user sees their entire life journey as an interactive timeline."*

---

### Slide 3 — Solution Architecture (Technical Overview)

**Title:** *"System Architecture"*

**Content (use the architecture diagram):**

```
┌─ FRONTEND (React + Vite + TypeScript) ──────────────────┐
│  Chat Interface  │  Life Timeline  │  What-If Panel     │
│  (Streaming AI)  │  (Recharts)     │  (Real-time sims)  │
└──────────────────────────────────────────────────────────┘
                    │ REST API
┌─ BACKEND (FastAPI + Python 3.12) ───────────────────────┐
│  GenAI Chat        │  Simulation     │  Product Matcher  │
│  (Gemini + Groq    │  Engine         │  (ChromaDB        │
│   multi-fallback)  │  (NumPy-based)  │   vector search)  │
└──────────────────────────────────────────────────────────┘
                    │
┌─ DATA LAYER ────────────────────────────────────────────┐
│  Supabase (PostgreSQL)  │  ChromaDB (Vector Store)      │
│  Users, Goals, Sims     │  Product Embeddings           │
└─────────────────────────────────────────────────────────┘
```

**Key Design Decision Callouts:**
- **Why Gemini + Groq fallback?** — Free-tier rate limits. Auto-failover ensures zero downtime during demos
- **Why deterministic math (NumPy) instead of LLM for calculations?** — Financial accuracy is non-negotiable. LLMs hallucinate numbers; Python doesn't
- **Why ChromaDB for product matching?** — Semantic search understands intent ("plan for my child's future" → Child Education Plan), not just keyword match

> **Speaker Notes:**  
> *"A critical architectural decision was separating AI from math. The GenAI handles ONLY the conversation — understanding the user, being empathetic, asking the right questions. ALL financial calculations are done by a deterministic NumPy engine. This prevents hallucinated numbers from reaching the user. The product matching uses vector embeddings, so even if a user says 'I want to secure my family' instead of 'term insurance', the system understands the intent."*

---

## SECTION 2: Project Plan

---

### Slide 4 — Phase Overview (Gantt Chart)

**Title:** *"8-Week Development Roadmap — 5 Phases"*

**Content (visual Gantt chart or timeline graphic):**

| Phase | Timeline | Focus | Status |
|-------|----------|-------|--------|
| **Phase 1:** Foundation & Data Layer | Week 1–2 | Scaffolding, DB schema, product scraper, ChromaDB pipeline | ✅ Complete |
| **Phase 2:** Core Engine | Week 3–4 | Simulation engine, GenAI chat, product embedding, APIs | ✅ Complete |
| **Phase 3:** Frontend UI/UX | Week 4–6 | Chat UI, Life Timeline, What-If panel, product cards | ✅ Complete |
| **Phase 4:** Integration & Features | Week 6–7 | End-to-end flow, scenario comparison, session persistence | 🔄 In Progress |
| **Phase 5:** Polish & Demo Prep | Week 7–8 | Animations, testing, responsive design, demo personas | 📋 Upcoming |

> **Speaker Notes:**  
> *"We structured the project into 5 phases across 8 weeks. The key principle was 'dependencies first' — database and data pipeline before engine, engine before UI, UI before integration. This meant we never had to rework earlier layers when building later ones. We're currently in Phase 4, wiring the end-to-end flow."*

---

### Slide 5 — Team Roles & Parallel Execution

**Title:** *"How We Organized the Work"*

**Content (show parallel workstreams):**

```
Week 1–2:  [████ Foundation (Backend + DB Setup) ████]
Week 3–4:  [██ Simulation Engine ██] [██ GenAI Chat ██]  ← Parallel
Week 4–6:  [██ Chat UI ██] [██ Timeline Viz ██] [█ What-If █]
Week 6–7:                  [████ Integration ████]
Week 7–8:                              [██ Polish + Demo ██]
```

**Key Decisions:**
- **Backend-first strategy** — Engine and AI services were built and tested independently before any frontend work began
- **Seed data fallback** — Pre-loaded 15+ ICICI Prudential products as JSON so the system works even if the live scraper fails
- **API contract defined early** — Frontend and backend teams agreed on REST schemas (Pydantic models) in Week 1, enabling parallel development

> **Speaker Notes:**  
> *"We de-risked the timeline by building backend services independently of the frontend. The simulation engine and chat service each have their own CLI entry points for testing — you don't even need the frontend to verify the math works. We also defined the API contract (Pydantic schemas) upfront so both halves could be developed in parallel."*

---

### Slide 6 — Tech Stack Justification

**Title:** *"Tech Stack — Chosen for Speed, Accuracy & Zero Cost"*

**Content (icons + justification table):**

| Layer | Technology | Why This? |
|-------|-----------|-----------|
| **Frontend** | React 18 + Vite + TypeScript | Component architecture for complex dashboard; Vite for 10x faster dev builds |
| **UI Library** | Shadcn/UI + Recharts | Beautiful, accessible components we *own* (not a dependency) |
| **Backend** | FastAPI (Python 3.12) | Async-first, auto-generated API docs, Pydantic validation built-in |
| **AI Chat** | LangChain + Gemini Flash | Free-tier LLM; provider-agnostic via LangChain (swap to Groq in 1 line) |
| **Simulation** | NumPy/SciPy | Deterministic financial math — compound interest, annuities, IRR |
| **Vector DB** | ChromaDB | Embedded (no separate server), semantic search for product matching |
| **Database** | Supabase (PostgreSQL) | Free 500MB, built-in Auth + RLS, real-time subscriptions |
| **Deployment** | Vercel + Render | Zero-cost hosting with auto-deploy from Git |

> **Speaker Notes:**  
> *"Every technology was chosen with two constraints: it must be free-tier compatible, and it must be production-grade. We're not using toys. FastAPI, Supabase, Gemini — these are the same tools used in production systems. The entire stack runs at zero infrastructure cost."*

---

## SECTION 3: What Has Been Executed Till Now

---

### Slide 7 — Executed: Backend Core Services

**Title:** *"What's Built — Backend Services"*

**Content (checklist with brief descriptions):**

✅ **Financial Simulation Engine** (736 lines, NumPy-based)
- Brochure-backed return rate matrix (conservative / moderate / aggressive)
- Stepped-up SIP with annual increment modeling
- ULIP Wealth Booster projections (3.25% every 5yr from yr10, per IPru Signature brochure)
- Inflation-adjusted corpus calculation with gap analysis
- Education abroad multiplier (2.2×)
- Product recommendation mapping for 12+ goal types

✅ **GenAI Chat Service** (560 lines)
- Gemini-powered conversational AI with insurance advisor persona
- Groq (Llama) automatic fallback on rate-limit (429 errors)
- Streaming response support for real-time chat experience
- Structured context extraction — AI pulls age, income, goals from natural conversation

✅ **Product Matcher** (241 lines)
- ChromaDB vector store with product feature embeddings
- Semantic search: "I want to secure my family" → Term Insurance
- Density-scored ranking with multi-chunk relevance boosting

✅ **What-If Engine** — Parameter overrides for inflation, savings, retirement age, SIP increment

✅ **REST API Endpoints:**
- `/api/chat` — Streaming AI conversation
- `/api/simulate` — Run financial simulations
- `/api/recommend` — Product matching
- `/api/products` — Product catalog CRUD
- `/api/goals`, `/api/users`, `/api/conversations` — Full data layer

> **Speaker Notes:**  
> *"The backend is the most mature layer. The simulation engine alone is 736 lines of deterministic financial math — every formula is derived from actual ICICI Prudential brochure data, not guesswork. The return rate matrix uses real fund performance data (Multi Cap Growth, Focus 50, Income Fund) net of the 1.35% fund management charge. The chat service has an automatic Gemini→Groq failover that's completely transparent to the user."*

---

### Slide 8 — Executed: Frontend Components

**Title:** *"What's Built — Frontend Interface"*

**Content (screenshots if available, or component list):**

✅ **AI Chat Panel** (25KB component)
- Streaming message bubbles with typing indicator
- Context-aware responses with product knowledge
- Profile injection from onboarding

✅ **Life Journey Timeline** (21KB component)
- Visual timeline from "Today" to retirement
- Milestone markers: 🎓 Education, 🏠 Home, 🏖️ Retirement
- Coverage bars (needed vs. projected)
- Animated transitions on what-if changes

✅ **What-If Simulator Panel**
- Interactive sliders: Inflation Rate, Existing Savings, Annual Increment, Retirement Age
- Real-time recalculation on slider change
- Education abroad toggle (2.2× multiplier)

✅ **Product Pages**
- Product cards with category, features, and match score
- Product simulation modal with projection charts
- Scenario comparison view (baseline vs. what-if)

✅ **Onboarding Flow** — Guided wizard as alternative to chat-based profiling

✅ **Dashboard** — Central hub connecting all components

> **Speaker Notes:**  
> *"On the frontend, the hero feature is the Life Journey Timeline — a visual map of the user's entire life with milestones, coverage status, and product shields. The What-If panel lets users drag sliders and immediately see how changing retirement age from 60 to 55, or toggling 'child education abroad', affects their financial plan. Everything recalculates in real time."*

---

### Slide 9 — Executed: Data Pipeline & Infrastructure

**Title:** *"What's Built — Data & Infrastructure"*

**Content:**

✅ **Supabase Database Schema**
- 8 entities: Users, Goals, Simulations, Scenarios, Recommendations, Products, Product Features, Conversations
- Row-Level Security (RLS) policies
- Full ERD with JSONB for semi-structured data

✅ **Product Data Pipeline**
- Playwright-based scraper for ICICI Prudential website
- Pydantic data validation models
- Seed dataset: 15+ curated products as JSON fallback
- ChromaDB embedding pipeline for vector search

✅ **Multi-Provider AI Setup**
- Gemini Flash (primary) + Groq/Llama (fallback)
- 60-second cooldown auto-retry strategy
- Structured JSON output for context extraction

✅ **API Infrastructure**
- FastAPI with auto-generated OpenAPI docs
- CORS middleware for frontend integration
- Docker + Docker Compose for containerized deployment

> **Speaker Notes:**  
> *"The data pipeline deserves special mention. We don't just hard-code product data — we built a Playwright scraper that can refresh product information from the ICICI website. But we also maintain a curated seed dataset as insurance (pun intended) against scraping failures. The ChromaDB vector store converts product features into embeddings, enabling semantic search that understands user intent, not just keywords."*

---

### Slide 10 — Live Demo (or Screenshots)

**Title:** *"Live Demo — 3 User Personas"*

> [!IMPORTANT]
> If doing a live demo, rehearse these 3 flows multiple times. Have screenshots as backup in case of network/API issues.

**Demo Flow 1: Priya, 28, New Parent** (~90 seconds)
1. Open app → Chat interface greets her
2. Type: *"Hi, I'm 28 and just had a baby. I earn ₹15 LPA and want to plan for my child's education"*
3. AI responds with empathetic follow-up, asks about timeline and budget
4. Show: Simulation runs → Timeline shows "🎓 ₹45L needed by 2044"
5. Show: Product recommendation → ICICI Pru Smart Kid (Child Plan)

**Demo Flow 2: Rajesh, 45, Early Retirement** (~90 seconds)
1. Navigate to What-If Panel
2. Drag "Retirement Age" slider from 60 → 55
3. Show: Gap visibly increases (more years to fund, less time to save)
4. Drag "Existing Savings" slider to ₹30L → Gap decreases
5. Show: Side-by-side comparison of both scenarios

**Demo Flow 3: Anita, 35, Multi-Goal** (~60 seconds)
1. Show: Full Life Journey Timeline with 3 milestones
2. Toggle "Child Education Abroad" → education corpus jumps 2.2×
3. Show: Product portfolio view — different product for each goal
4. Show: Five-year snapshot with projection chart

> **Speaker Notes:**  
> *"Let me show you three real user journeys. Priya is a new parent worried about education costs. Rajesh is mid-career and exploring early retirement. Anita has multiple life goals. Watch how the system adapts to each persona — different conversations, different simulations, different product recommendations — all from the same platform."*

---

### Slide 11 — Key Technical Highlight: The Simulation Pipeline

**Title:** *"How the Engine Actually Works"*

**Content (step-by-step calculation pipeline):**

```
For each goal, the engine runs this pipeline:

1. inflation_adjusted_target = target × (1 + inflation)^years
2. blended_return = RETURN_MATRIX[risk_appetite][horizon_bucket]
3. lump_sum_fv = existing_savings × (1 + return)^years
4. stepped_sip_fv = Σ (monthly_sip × (1 + increment)^year × FV_annuity)
5. wealth_booster = 3.25% × avg_fund_value  (ULIP goals, every 5yr from yr10)
6. projected_corpus = lump_sum_fv + stepped_sip_fv + wealth_booster
7. gap = max(0, inflation_target − projected_corpus)
8. coverage_ratio = min(1.0, projected / inflation_target)
9. monthly_sip_needed = solve_for_PMT(gap, return, years)
```

**Why This Matters:**
- Every step uses **real ICICI fund data** (not generic assumptions)
- Return rates are net of **1.35% Fund Management Charge**
- Wealth Booster is from the **actual IPru Signature brochure**
- All math is **deterministic and unit-testable** — the AI never touches these numbers

> **Speaker Notes:**  
> *"This is the heart of the system. Nine steps, each using real data from ICICI brochures. The return matrix isn't made up — it's derived from actual fund performance of Multi Cap Growth, Focus 50, Income Fund, net of the 1.35% FMC. The Wealth Booster calculation comes directly from the IPru Signature brochure — 3.25% of average fund value every 5 years starting year 10. This is what separates a toy calculator from a real financial planning tool."*

---

## SECTION 4: Learnings & Challenges Faced

---

### Slide 12 — Challenge 1: GenAI Reliability

**Title:** *"Challenge: Making AI Reliable for Financial Conversations"*

**The Problem:**
- Gemini free tier limits: 15 RPM — one concurrent demo user can exhaust it
- LLMs hallucinate financial figures — "You need ₹3.7 crore for retirement" with no basis

**Our Solution:**

```
┌──────────────────────────────────────────────────────┐
│  User Message                                        │
│      ↓                                               │
│  ┌─ Try Gemini ──┐   429? Rate-limited?              │
│  │               │ ──→ Auto-switch to Groq (Llama)   │
│  │  Response ←───│                                   │
│  └───────────────┘                                   │
│      ↓                                               │
│  AI Response = CONVERSATION ONLY (no numbers)        │
│      ↓                                               │
│  NumPy Engine = ALL FINANCIAL MATH (deterministic)   │
└──────────────────────────────────────────────────────┘
```

**Key Learning:**  
> *"Never let an LLM do math. Use it for what it's good at — understanding natural language and being empathetic. Use Python for what it's good at — precise calculations."*

---

### Slide 13 — Challenge 2: Web Scraping Fragility & Data Trust

**Title:** *"Challenge: Building a Trustworthy Data Pipeline"*

**The Problem:**
- Insurance websites change layouts frequently and employ anti-bot measures
- Scraped data quality varies — missing fields, inconsistent formats
- Stale product data = wrong recommendations = broken user trust

**Our Solution (Defense-in-Depth):**

| Layer | Strategy |
|-------|----------|
| **Layer 1: Live Scraper** | Playwright with CSS + XPath + text fallbacks |
| **Layer 2: Seed Dataset** | 15+ curated products as JSON fallback |
| **Layer 3: Validation** | Pydantic schemas validate every scraped record |
| **Layer 4: Freshness Tracking** | `last_scraped` timestamp on every product |

**Key Learning:**  
> *"Always have a fallback. Our seed JSON dataset means the app works even if the ICICI website is completely redesigned tomorrow. We also learned to treat scraping as a pipeline, not a script — validate, transform, then load."*

---

### Slide 14 — Challenge 3: Financial Accuracy & Timeline Management

**Title:** *"Challenge: Getting the Math Right Under Time Pressure"*

**Financial Accuracy:**
- Wrong inflation or return assumptions → dangerous recommendations
- Users trust numbers on screen — we can't afford errors
- **Solution:** Every calculation cross-referenced against Groww and ET Money calculators. Comprehensive unit test suite for all financial functions. Prominent disclaimer: *"This is a planning tool, not financial advice."*

**Timeline Pressure:**
- 8-week timeline for a full-stack AI product is aggressive
- Scope creep risk: "Let's also add PDF export, multi-language support, dark mode..."
- **Solution:** Ruthless prioritization framework:

```
MUST HAVE (shipped first):     Chat + Simulation + Timeline
SHOULD HAVE (shipped second):  What-If Panel + Product Cards
COULD HAVE (time permitting):  PDF Export + Scenario Comparison
WON'T HAVE (v2 backlog):      Multi-language, Mobile App, Payment Integration
```

**Key Learning:**  
> *"Scope discipline saved the project. We said 'no' to 10 features to say 'yes' to 3 done well. The MoSCoW framework (Must/Should/Could/Won't) was our decision filter every week."*

---

### Slide 15 — Closing & Future Roadmap

**Title:** *"What's Next — The Road Ahead"*

**Immediate (Phase 4–5, Next 2 Weeks):**
- [ ] End-to-end flow integration (Chat → Simulate → Recommend → Visualize)
- [ ] PDF export of personalized financial plan
- [ ] UI animations and responsive mobile layout
- [ ] Performance optimization and testing

**Future Vision (Post-Hackathon):**
- RAG-enhanced chat with full product brochure knowledge
- Real-time product price/premium API integration
- Multi-language support (Hindi, Tamil, Telugu)
- Mobile-first PWA
- Agent-based auto-rebalancing recommendations

**Closing Statement:**

> *"IPru LifeMap doesn't just sell insurance — it helps people see their future. Every timeline we generate, every gap we identify, every product we recommend is rooted in real data and real math. We believe this is how insurance should be discovered — through your life story, not a product catalog."*

---

## 🎯 Presentation Tips

### Do's:
- **Open with the problem, not the solution** — Make the audience *feel* the pain before showing the fix
- **Show, don't tell** — Live demo > slides. Screenshots > bullet points
- **Use real numbers** — "₹45L needed by 2044" is more powerful than "the system calculates corpus"
- **Pause after key points** — Let the architecture diagram sink in
- **Prepare for demo failure** — Have screenshots of every screen as backup slides

### Don'ts:
- ❌ Don't read slides verbatim — use them as visual anchors
- ❌ Don't deep-dive into code syntax — focus on *what* it does, not *how* it's coded
- ❌ Don't apologize for incomplete features — frame them as "roadmap items"
- ❌ Don't use jargon without explaining it — "ChromaDB" means nothing to a non-technical judge; say "a smart search engine that understands meaning, not just keywords"

### Timing Checkpoints:
| Time | You Should Be At |
|------|-----------------|
| 0:00 | Slide 1 — Problem statement hook |
| 3:00 | Slide 4 — Starting project plan |
| 6:00 | Slide 7 — Starting execution showcase |
| 11:00 | Slide 12 — Starting learnings |
| 14:00 | Slide 15 — Closing + future roadmap |
| 15:00 | Q&A |

---

## 🔥 Anticipated Q&A (Prepare These Answers)

| Question | Answer |
|----------|--------|
| *"How accurate are your financial projections?"* | "All calculations use real ICICI fund data, net of fees. Return rates are derived from actual brochure data, not assumptions. We also display all assumptions transparently to the user." |
| *"What happens if Gemini goes down?"* | "We have a multi-provider fallback: Gemini → Groq (Llama). The switch is automatic and invisible to the user. There's also a 60-second cooldown retry to switch back." |
| *"How do you handle LLM hallucinations?"* | "The LLM never does math. It only handles conversation. All financial numbers come from our deterministic NumPy engine. The LLM's job is to understand context, not calculate corpus." |
| *"Why ICICI Prudential specifically?"* | "The problem statement focused on ICICI Pru products. Our architecture is product-agnostic — the scraper, embeddings, and matcher can be pointed at any insurance provider." |
| *"Can this scale to real production?"* | "Yes. Supabase handles millions of rows, FastAPI is async-first for concurrency, and ChromaDB can be swapped for Pinecone/Weaviate. The only change for production would be upgrading from free to paid API tiers." |
| *"What's your competitive advantage over existing calculators?"* | "Three things: (1) Conversational discovery instead of forms, (2) Goal-based simulation instead of product-based calculators, (3) Visual life timeline instead of spreadsheet outputs." |
