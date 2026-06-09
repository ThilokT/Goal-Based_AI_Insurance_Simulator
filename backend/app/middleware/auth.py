"""
JWT Authentication middleware.

Extracts and verifies Supabase JWT from the Authorization header.
Provides `get_current_user` as a FastAPI dependency for protected routes.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from app.config import get_settings

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency that validates the JWT and returns user info.

    Returns:
        dict with keys: "user_id" (str), "email" (str|None), "token" (str)

    Raises:
        HTTPException 401 if token is missing, expired, or invalid.
    """
    token = credentials.credentials
    settings = get_settings()

    # If JWT secret is configured, verify locally for speed
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing subject",
                )
            return {
                "user_id": user_id,
                "email": payload.get("email"),
                "token": token,
            }
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )
    else:
        # Fallback: verify token by calling Supabase auth.getUser()
        try:
            from supabase import create_client

            client = create_client(
                settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY
            )
            user_response = client.auth.get_user(token)
            user = user_response.user
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                )
            return {
                "user_id": str(user.id),
                "email": user.email,
                "token": token,
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}",
            )
