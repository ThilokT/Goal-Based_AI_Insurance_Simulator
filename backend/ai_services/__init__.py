"""
AI Services Package — LifeMap Insurance Simulator.

This package contains all standalone AI/ML components:
  - scraper:           Playwright web scraper for ICICI Pru products
  - pipeline:          Data pipeline (scrape → validate → upsert)
  - vectorstore:       ChromaDB vector store with Gemini embeddings
  - chat_service:      LangChain + Gemini conversational AI
  - simulation_engine: NumPy-based financial simulations
  - product_matcher:   Goal-to-product vector similarity matching
  - whatif_engine:     What-if scenario comparison engine
  - ranking_service:   Composite product scoring & ranking
  - guardrails:        Output validation, disclaimers, & LLM fallback
  - models:            Pydantic models (shared API contracts)
  - config:            Environment config & constants
"""
