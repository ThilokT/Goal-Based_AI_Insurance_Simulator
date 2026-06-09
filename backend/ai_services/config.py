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

# ── Constants ─────────────────────────────────────────────
CHROMA_COLLECTION_NAME = "ipru_products"
CHROMA_PERSIST_DIR = "./data/chroma_db"
SCRAPER_BASE_URL = "https://www.iciciprulife.com"