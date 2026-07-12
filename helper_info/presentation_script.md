# LifeMap — Presentation Script

> **Total estimated duration**: 12–15 minutes  
> **Format**: Slide-by-slide script. Read the **bold text** as your spoken words. *Italics* are stage directions.

---

## Slide 1 — Project Definition

*[Open with the problem. Speak with conviction — this is your hook.]*

**"Let's start with a simple question — what happens when a 28-year-old visits an insurance website today? They're shown 47 products, each with a 30-page brochure, and told to figure it out themselves. There's a fundamental gap between what customers actually want — 'Can I retire at 55?' or 'How much do I need for my child's college?' — and what the industry gives them, which is static product catalogs and generic premium calculators."**

**"So we asked: what if we flipped this entirely? Instead of selling policies, what if we planned lives? That's LifeMap."**

*[Pause 1 second. Let it land.]*

---

## Slide 2 — Title Slide

**"LifeMap is an AI-curated, life-goal financial planning platform. It replaces static insurance product catalogs with a dynamic, conversational, and — this is key — deterministic financial journey engine. Every number you see is backed by real ICICI Prudential brochure data, not LLM guesses."**

**"Let me walk you through how it works."**

---

## Slide 3 — The Problem with Traditional Insurance UX

**"Here's the contrast. On the left is the traditional experience — 47+ products dumped on users, static calculators, generic PDFs, one-size-fits-all. On the right is LifeMap — an AI advisor that discovers your life goals through conversation, a dynamic what-if simulator where you can drag sliders and see your financial picture change in real time, a visual Life Journey timeline, and AI-curated recommendations backed by actual brochure data."**

**"The key insight is: users don't think in terms of 'ULIPs' or 'endowment plans.' They think in terms of 'my daughter's college' or 'buying a house by 35.' LifeMap speaks their language."**

---

## Slide 4 — Solution Approach (Three Steps)

**"The solution follows three steps."**

**"Step One — Converse. An AI advisor, powered by Google Gemini, has a natural conversation with the user. No forms. It collects demographics, income, family details, and life goals — just through chat. If a user says 'I'm 30, earning 15 lakhs, married with one kid, I want to retire at 55 and save for my child's education' — the AI extracts all of that into a structured financial profile."**

**"Step Two — Simulate. This is where the math happens. And importantly, the LLM does NOT do the math. We built a 736-line NumPy-based simulation engine that calculates inflation-adjusted corpus, monthly SIP required, coverage gaps, and year-by-year projections for every goal. The return rates come directly from ICICI Prudential fund performance data — 11% net for equity after 1.35% fund management charge, 9% for balanced, 7% for debt. These aren't made-up numbers."**

**"Step Three — Visualize. A Life Journey Timeline maps every goal on a visual roadmap from today to age 80+. It shows coverage bars, recommended products, and what-if controls. You can drag a slider and instantly see — 'If I retire at 55 instead of 60, my monthly SIP goes from 12,000 to 18,000.' It's dynamic and interactive."**

*[This is the most important slide. Take your time here — ~2 minutes.]*

---

## Slide 5 — Screenshot/Demo (Image Slide)

*[If this is a screenshot, walk through what's visible.]*

**"Here's what the user actually sees. On the left is the AI chat — they're having a conversation about their goals. On the right, the system has extracted their profile and is showing the simulation results. You can see each goal card with the target amount, the projected corpus, the gap, and the monthly SIP needed."**

*[If this slide is blank/visual-only, describe what you'd demo here.]*

---

## Slide 6 — Screenshot/Demo (Image Slide)

*[Continue with the visual walkthrough.]*

**"This is the Life Journey Timeline. Each milestone is plotted on a timeline from the user's current age to 80+. The green bars show coverage — how much of each goal is funded. The orange sections show the gap. Each goal has a recommended ICICI Prudential product attached."**

---

## Slide 7 — Screenshot/Demo (Image Slide)

**"And this is the What-If panel. Five sliders — retirement age, inflation rate, SIP step-up percentage, existing savings, and a toggle for child education abroad. Every slider change fires a debounced API call to the backend, re-runs the entire simulation, and updates the timeline and charts in real time."**

---

## Slide 8 — Architecture

**"Let's talk architecture. The system has three layers."**

**"Frontend: React 18 with TypeScript and Vite. State management with Zustand, persisted to localStorage. Animations with Framer Motion. Charts with Recharts."**

**"Backend: FastAPI with Python 3.12. Ten API routers handling auth, chat, simulation, recommendation, scenarios, products, and more. JWT authentication via Supabase. Rate limiting with SlowAPI."**

**"AI Services Layer: This is the core. It contains the ChatService with dual-LLM failover — Gemini primary, Groq Llama 3.3 secondary. The 736-line SimulationEngine with NumPy. The WhatIfEngine for scenario comparison. ChromaDB vector store with HuggingFace local embeddings. The RankingService with composite scoring. And a Guardrails layer for output validation."**

**"Five key design decisions. First, the LLM only handles conversation — all math is deterministic NumPy. Second, dual-LLM failover handles Gemini's 15 RPM free-tier limit. Third, return rates come from real brochure data. Fourth, product matching uses vector similarity, not keyword rules. Fifth, chat responses stream token-by-token via SSE for a ChatGPT-like experience."**

---

## Slide 9 — Core Engine (736-Line NumPy Engine)

**"This is the heart of the project. The simulation engine is 736 lines of pure NumPy financial math. Zero LLM involvement."**

**"It handles four core computations:"**

**"One — Future Value and SIP. The standard compound interest formula inflates goal targets to future prices. The annuity formula calculates monthly SIP. And we support stepped SIP — if a user's income grows 8% per year, their SIP grows proportionally."**

**"Two — Risk-Adjusted Returns. We have a 9-cell matrix: three risk appetites — conservative, moderate, aggressive — crossed with three time horizons — short, medium, long. Each cell gives a blended return rate. For example, an aggressive investor with a 15+ year horizon gets 11% — that's the equity net return after the 1.35% fund management charge from ICICI Pru's Multi Cap Growth and Focus 50 funds."**

**"Three — ULIP Wealth Booster. Directly from the ICICI Pru Signature brochure: 3.25% of average fund value is added every 5 years, starting from year 10. This is not a generic number — it's the exact rate from the product brochure."**

**"Four — Gap Analysis. For each goal, the engine computes: how much will this cost in the future? How much will the user's current savings and SIPs grow to? What's the gap? And what monthly SIP closes that gap?"**

*[This slide demonstrates technical depth. Speak confidently about the numbers.]*

---

## Slide 10 — Data Pipeline & Product Matching

**"How does product data get into the system? A three-stage pipeline."**

**"Stage 1 — Scrape. A Playwright-based headless browser scrapes the ICICI Prudential website, discovers product pages, and downloads brochure PDFs."**

**"Stage 2 — Extract. Each PDF is processed by our PDF Extractor. It sends the first 15 pages to an LLM with a structured extraction prompt, getting back validated JSON with product name, category, features, and eligibility. The full PDF text is also chunked — 1000-character chunks with 200-character overlap — for RAG search."**

**"Stage 3 — Embed and Index. HuggingFace's all-MiniLM-L6-v2 model generates embeddings entirely locally — no API calls, no cost. These are stored in ChromaDB with cosine similarity."**

**"Currently, 5 real ICICI Pru brochures have been processed end-to-end, plus 10 seed products as fallback."**

**"For product matching, we use a three-stage pipeline: Vector similarity search from ChromaDB weighted at 40%, Goal coverage — how many user goals does this product serve — at 30%, and Category-goal fit from a 7×7 affinity matrix at 30%. The final score is a weighted composite on a 0 to 100 scale."**

---

## Slide 11 — Engineering Challenges

**"Let me talk about four real challenges we faced."**

**"Challenge 1: Gemini rate limits. The free tier gives you 15 requests per minute. During active chat, that's exhausted quickly. Our solution: dual-LLM failover. When Gemini returns a 429 error, the system auto-switches to Groq's Llama 3.3 70B within the same request. A 60-second cooldown timer retries Gemini after. The user never sees an error."**

**"Challenge 2: LLMs can't do financial math. They hallucinate numbers. You cannot trust an LLM to calculate 'how much SIP do you need for a 2 crore corpus in 30 years.' Our solution: strict separation. The LLM only collects context through conversation. The SimulationEngine handles 100% of calculations with NumPy. The Guardrails layer validates every output — SIP clamped to ₹100 to ₹10 lakh, corpus clamped to ₹10,000 to ₹1,000 crore."**

**"Challenge 3: Scraping fragility. Insurance websites change layouts. Our solution: three fallback layers. Local brochure PDFs extracted via LLM. Seed data JSON as last resort. ChromaDB retains the last indexed state. The system never goes empty."**

**"Challenge 4: Chat context isolation. When a user has multiple conversations, changing a slider in one chat shouldn't affect another. Our solution: Zustand maintains per-conversation contexts. Each conversation has its own extracted profile and goals, stored in Supabase. A 'Use Global Profile' button lets users sync their main profile into any chat."**

*[Pick 2-3 challenges to emphasize based on time. Don't rush all four.]*

---

## Slide 12 — Progress (What's Built)

**"In 8 weeks, here's what we've built."**

**"A 736-line NumPy simulation engine with brochure-backed returns and ULIP Wealth Boosters. 5 real ICICI Prudential brochures indexed end-to-end. 25+ API endpoints across 10 FastAPI routers. And a 100% complete end-to-end flow — from chat to extraction to simulation to visualization."**

**"Every major component is complete: the backend with JWT auth and rate limiting, the dual-LLM chat with RAG, the What-If engine with 6 scenario templates, and the full frontend — chat interface, Life Journey Timeline, What-If panel, product catalog, and product comparison."**

---

## Slide 13 — Roadmap (What's Next)

**"Two things are next."**

**"First, dynamic PDF fetching. The Playwright scraper infrastructure is fully built — it navigates ICICI Pru pages, finds brochure download links, and saves PDFs. Currently, 5 core brochures are pre-loaded for demo stability. The next step is wiring the scraper's scrape_all() function into the live pipeline so new products are discovered automatically. The monthly APScheduler cron job — already set up for the 1st of every month at 2 AM — will then handle end-to-end refresh without manual intervention."**

**"Second, simulation enhancements. We want richer animations — staggered result card entrances, animated coverage bars that fill from 0% to actual. Smoother chart transitions when what-if sliders change. And deeper product comparison — showing projected returns for Product A versus Product B over the same tenure."**

---

## Slide 14 — Key Talking Points (Q&A Prep)

*[Use this slide as a safety net for Q&A. Read each answer only if the question is asked.]*

**"I'll quickly cover the most common questions:"**

**"'Why doesn't the LLM do the math?' — Because LLMs hallucinate numbers. Our engine uses NumPy with brochure-backed return rates. Every calculation is deterministic and verifiable."**

**"'What about Gemini rate limits?' — Auto-failover to Groq Llama 3.3. 60-second cooldown retries Gemini. Users never see an error."**

**"'How are goals matched to products?' — Three-factor pipeline: vector search at 40%, goal coverage at 30%, category-fit affinity matrix at 30%. Not keyword matching."**

**"'Are the return rates realistic?' — Yes. Equity at 11% net after 1.35% FMC, Wealth Booster at 3.25% every 5 years from year 10 — directly from the ICICI Pru Signature brochure."**

---

## Slide 15 — Thank You / Closing

**"To summarize: LifeMap transforms insurance from 'here are 47 products' to 'let's plan your life.' The AI converses, the engine simulates, and the timeline visualizes — all backed by real brochure data. Thank you."**

*[Wait for questions.]*

---

## Bonus: If Asked for a Live Demo

If you get a chance to demo live, follow this exact flow:

1. **Login** → Show the Dashboard with loading animations
2. **Open AI Chat** → Type: *"I'm 30, earning 15 lakhs per year, married, one kid. I want to retire at 55 and save for my child's college education."*
3. **Click "Extract Profile"** → Show how the AI extracts structured data
4. **Click "Simulate Life Journey"** → Watch the Timeline render with milestones
5. **Move the Retirement Age slider** from 55 → 60 → Show SIP change in real time
6. **Toggle "Education Abroad"** → Show the 2.2x multiplier in action
7. **Go to Products page** → Show ChromaDB-backed product catalog
8. **Open Product Simulation** → Set ₹10K/month, 20-year tenure → Show projected corpus with Wealth Booster
