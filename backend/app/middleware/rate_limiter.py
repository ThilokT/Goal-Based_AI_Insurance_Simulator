"""
Rate limiting middleware using SlowAPI.

- AI endpoints (chat, simulate, recommend, scenarios): 30 req/min
- CRUD endpoints: 60 req/min
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Create a global limiter keyed by client IP
limiter = Limiter(key_func=get_remote_address)

# Rate limit constants for easy import in routers
AI_RATE_LIMIT = "30/minute"
CRUD_RATE_LIMIT = "60/minute"
