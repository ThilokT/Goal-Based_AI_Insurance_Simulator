"""
LifeMap Backend — FastAPI Application Factory.

This is the main entry point for the backend application.
Run with: uvicorn app.main:app --reload
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.rate_limiter import limiter

# Import all routers
from app.routers import (
    auth,
    users,
    products,
    goals,
    chat,
    simulate,
    recommend,
    conversations,
    scenarios,
    simulations,
)

# ── Logging Setup ─────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("lifemap")


# ── Lifespan (startup/shutdown) ───────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info("LifeMap Backend starting up...")

    # Start APScheduler
    from app.scheduler.jobs import setup_scheduler
    scheduler = setup_scheduler()
    scheduler.start()
    logger.info("APScheduler started")

    yield  # App runs here

    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("LifeMap Backend shutting down...")


# ── App Factory ───────────────────────────────────────────
settings = get_settings()

app = FastAPI(
    title="LifeMap API",
    description=(
        "Goal-Based AI Insurance Simulator backend. "
        "Provides endpoints for user management, financial simulations, "
        "AI-powered chat, product recommendations, and what-if scenarios."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Debug flag for error handler ──────────────────────────
app.state.debug = settings.ENVIRONMENT == "development"

# ── Middleware ────────────────────────────────────────────
# Order matters: last added = first executed

# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Error handling
app.add_middleware(ErrorHandlerMiddleware)

# 3. Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Register Routers ─────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(goals.router)
app.include_router(chat.router)
app.include_router(simulate.router)
app.include_router(recommend.router)
app.include_router(conversations.router)
app.include_router(scenarios.router)
app.include_router(simulations.router)


# ── Health Check ──────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "lifemap-api",
        "version": "1.0.0",
    }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint — redirects to docs."""
    return {
        "message": "Welcome to LifeMap API",
        "docs": "/docs",
        "health": "/health",
    }
