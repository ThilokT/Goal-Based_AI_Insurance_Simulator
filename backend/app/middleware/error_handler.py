"""
Global exception handler middleware.

Catches all unhandled exceptions and returns clean JSON error responses.
Specifically handles AI service failures (Gemini/Groq) with 503 status.
"""
import logging
import traceback
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("lifemap.errors")


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Catches unhandled exceptions and returns structured JSON errors."""

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response

        except Exception as exc:
            # Log the full traceback
            logger.error(
                f"Unhandled error on {request.method} {request.url.path}: "
                f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
            )

            # Categorize the error
            error_type = type(exc).__name__

            # AI service failures → 503
            ai_errors = (
                "GoogleAPIError",
                "ResourceExhausted",
                "ServiceUnavailable",
                "GroqError",
                "APIConnectionError",
                "RateLimitError",
            )
            if error_type in ai_errors or "rate" in str(exc).lower():
                return JSONResponse(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    content={
                        "error": "ai_service_unavailable",
                        "message": "The AI service is temporarily unavailable. Please try again shortly.",
                        "detail": str(exc) if request.app.state.debug else None,
                    },
                )

            # Validation errors → 422
            if error_type in ("ValidationError", "ValueError"):
                return JSONResponse(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    content={
                        "error": "validation_error",
                        "message": str(exc),
                    },
                )

            # Everything else → 500
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "internal_server_error",
                    "message": "An unexpected error occurred. Please try again.",
                    "detail": str(exc) if getattr(request.app.state, "debug", False) else None,
                },
            )
