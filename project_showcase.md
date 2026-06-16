# Goal-Based AI Insurance Simulator: Project Showcase

## Approach to Problem Statement

**The Problem:** Traditional insurance websites offer a transactional experience with overwhelming product catalogs, static premium calculators, and generic brochures. This "one-size-fits-all" approach fails to engage users effectively or align with their life goals.

**Our Approach (IPru LifeMap):** We are transforming insurance purchasing into a personalized life-planning journey. Our solution uses a conversational AI interface (GenAI) to understand user demographics, financial status, and life aspirations naturally. Instead of just listing products, the system runs financial simulations based on user inputs (e.g., retirement age, child's education) and produces a visual "Life Journey" roadmap mapped to real ICICI Prudential products via vector similarity matching.

## Project Plan

The project is structured across an 8-week timeline, divided into 5 major phases:

*   **Phase 1: Foundation & Data Layer (Week 1–2):** Project scaffolding, Supabase database schema setup, building the Playwright product scraper, and establishing the data pipeline for product embeddings (ChromaDB).
*   **Phase 2: Core Engine (Week 3–4):** Developing the financial simulation module, GenAI chat integration (LangChain + Gemini), extracting context, and mapping goals to products.
*   **Phase 3: Frontend UI/UX (Week 4–6):** Building the design system, streaming chat interface, "Life Journey" D3.js timeline visualization, and the What-If simulator panel.
*   **Phase 4: Integration & Features (Week 6–7):** End-to-end flow integration (Chat → Simulate → Recommend → Visualize), PDF export, and session persistence.
*   **Phase 5: Polish, Testing & Demo Prep (Week 7–8):** UI animations (Framer Motion), performance optimization, comprehensive testing, and preparing demo personas.

## What all has been executed till now

Currently, the groundwork and **Phase 1 (Foundation)** elements have been heavily defined and initiated:

*   **System Architecture & Tech Stack Defined:** React/Vite for frontend, FastAPI/Python for backend, Supabase (PostgreSQL) for DB, and ChromaDB for vector storage.
*   **Database & Entity Modeling:** Complete ERD designed for Users, Goals, Simulations, Recommendations, and Products.
*   **AI/ML Pipeline Setup:** 
    *   Configured Gemini API connectivity and embedding tests.
    *   Developed a Playwright-based scraper to extract product data from the ICICI Prudential website.
    *   Created data validation models (Pydantic) and the upsert pipeline to sync scraped data into Supabase.

## Learnings & Challenges Faced Along the Way

*   **Web Scraping Fragility:** Insurance websites frequently change layouts or employ anti-bot measures. *Mitigation:* Implementing defensive scraping (CSS + XPath fallbacks), adding delays, and keeping a curated JSON seed dataset as a fallback.
*   **GenAI Rate Limits & Hallucinations:** Free-tier API limits can throttle concurrent users, and LLMs might hallucinate financial figures. *Mitigation:* Offloading all mathematical calculations to a deterministic Python engine (NumPy) rather than relying on the LLM. The AI is strictly used for context gathering and conversational UI.
*   **Financial Calculation Accuracy:** Incorrect assumptions about inflation or return rates could lead to bad recommendations, breaking user trust. *Mitigation:* Enforcing strict transparency on assumptions and building comprehensive unit test suites for all financial functions.
*   **Timeline Pressures:** Balancing complex features like the interactive D3.js timeline against an 8-week schedule. *Mitigation:* Ruthless prioritization, focusing purely on the hero features (Life Journey timeline, chat interface) and ensuring fallback plans for lower-priority items.
