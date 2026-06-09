"""
Central configuration for AI services.
Loads environment variables and initializes API clients.
"""
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# ── API Keys ──────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# ── Validate ──────────────────────────────────────────────
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

# ── Configure Gemini ──────────────────────────────────────
genai.configure(api_key=GEMINI_API_KEY)

# ── Model Names ───────────────────────────────────────────
CHAT_MODEL = "gemini-2.5-flash"          # Fast, free-tier friendly
EMBEDDING_MODEL = "models/gemini-embedding-2"  # Latest embedding model
GROQ_CHAT_MODEL = "llama-3.3-70b-versatile"  # Groq fallback model

# ── Constants ─────────────────────────────────────────────
CHROMA_COLLECTION_NAME = "ipru_products"
CHROMA_PERSIST_DIR = "./data/chroma_db"
SCRAPER_BASE_URL = "https://www.iciciprulife.com"

# ── Inflation & Financial Defaults ────────────────────────
DEFAULT_INFLATION_RATE = 0.06       # 6% annual inflation (India avg)
DEFAULT_RETURN_RATE = 0.10          # 10% expected market return
DEFAULT_RISK_FREE_RATE = 0.065     # 6.5% (Govt bond / FD rate)
DEFAULT_RETIREMENT_AGE = 60
DEFAULT_LIFE_EXPECTANCY = 85