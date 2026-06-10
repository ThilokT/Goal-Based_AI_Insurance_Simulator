"""
Auth router — signup and login endpoints.
"""
from fastapi import APIRouter, HTTPException, Request, status
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse
from app.services.auth_service import AuthService
from app.middleware.rate_limiter import limiter, CRUD_RATE_LIMIT

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account",
    description="Register a new user with email and password. Returns JWT tokens.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def signup(request: Request, body: SignupRequest):
    """Create a new user account via Supabase Auth."""
    try:
        auth = AuthService()
        result = auth.signup(body.email, body.password, body.full_name)

        if "access_token" not in result:
            # Email confirmation may be required
            raise HTTPException(
                status_code=status.HTTP_200_OK,
                detail="Account created. Please check your email to confirm.",
            )

        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            expires_in=result["expires_in"],
            user_id=result["user_id"],
            email=body.email,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}",
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Sign in with email and password",
    description="Authenticate an existing user. Returns JWT tokens for API access.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def login(request: Request, body: LoginRequest):
    """Sign in an existing user."""
    try:
        auth = AuthService()
        result = auth.login(body.email, body.password)

        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            expires_in=result["expires_in"],
            user_id=result["user_id"],
            email=body.email,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )
