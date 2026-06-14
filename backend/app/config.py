"""
Backend configuration — loads environment variables via Pydantic Settings.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── Supabase ──────────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # ── Supabase JWT (used to verify tokens locally)
    # The JWT secret is your Supabase project's JWT secret.
    # Find it: Supabase Dashboard → Settings → API → JWT Secret
    SUPABASE_JWT_SECRET: str = ""

    # ── AI Keys (read but not used directly by P2) ────────
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # ── App Settings ──────────────────────────────────────
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"
    API_RATE_LIMIT: str = "30/minute"
    CRUD_RATE_LIMIT: str = "60/minute"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
