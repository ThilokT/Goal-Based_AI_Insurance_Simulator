"""
Users router — profile CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.schemas.users import UserProfileResponse, UpdateProfileRequest
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, CRUD_RATE_LIMIT
from app.database import get_admin_client
from app.services.cache_decorator import cached, clear_cache

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get current user profile",
    description="Returns the authenticated user's profile data.",
)
@limiter.limit(CRUD_RATE_LIMIT)
@cached(ttl_seconds=300, key_prefix="user_profile")
def get_my_profile(request: Request, user: dict = Depends(get_current_user)):
    """Fetch the authenticated user's profile."""
    client = get_admin_client()

    response = (
        client.table("profiles")
        .select("*")
        .eq("id", user["user_id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    profile_data = response.data[0]
    if "id" not in profile_data:
        profile_data["id"] = user["user_id"]
        
    return UserProfileResponse(**profile_data)


@router.put(
    "/me",
    response_model=UserProfileResponse,
    summary="Update current user profile",
    description="Update profile fields (age, income, risk appetite, etc.).",
)
@limiter.limit(CRUD_RATE_LIMIT)
def update_my_profile(
    request: Request,
    body: UpdateProfileRequest,
    user: dict = Depends(get_current_user),
):
    """Update the authenticated user's profile."""
    client = get_admin_client()

    # Only update fields that were explicitly provided
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Add the ID for upsert
    update_data["id"] = user["user_id"]

    try:
        response = (
            client.table("profiles")
            .upsert(update_data)
            .execute()
        )
        clear_cache("user_profile")
    except Exception as e:
        import logging
        import traceback
        logging.getLogger("lifemap").error(f"Error updating profile: {e}")
        with open("error_log.txt", "w") as f:
            f.write(str(e) + "\n" + traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile could not be updated",
        )

    profile_data = response.data[0]
    if "id" not in profile_data:
        profile_data["id"] = user["user_id"]
        
    return UserProfileResponse(**profile_data)
