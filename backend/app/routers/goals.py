"""
Goals router — CRUD endpoints for user financial goals.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.schemas.goals import GoalRequest, GoalResponse, GoalListResponse
from app.services.goal_service import GoalService
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, CRUD_RATE_LIMIT

router = APIRouter(prefix="/api/goals", tags=["Goals"])


@router.get(
    "",
    response_model=GoalListResponse,
    summary="List user goals",
    description="Returns all active financial goals for the authenticated user.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def list_goals(request: Request, user: dict = Depends(get_current_user)):
    """List all goals for the current user."""
    service = GoalService()
    result = service.list_goals(user["user_id"])

    return GoalListResponse(
        goals=[GoalResponse(**g) for g in result["goals"]],
        total=result["total"],
    )


@router.post(
    "",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new goal",
    description="Create a new financial goal (e.g., retirement, child education).",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def create_goal(
    request: Request,
    body: GoalRequest,
    user: dict = Depends(get_current_user),
):
    """Create a new financial goal."""
    service = GoalService()
    goal = service.create_goal(user["user_id"], body.model_dump())

    return GoalResponse(**goal)


@router.put(
    "/{goal_id}",
    response_model=GoalResponse,
    summary="Update a goal",
    description="Update an existing financial goal.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def update_goal(
    request: Request,
    goal_id: str,
    body: GoalRequest,
    user: dict = Depends(get_current_user),
):
    """Update an existing goal."""
    service = GoalService()
    goal = service.update_goal(goal_id, user["user_id"], body.model_dump(exclude_none=True))

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    return GoalResponse(**goal)


@router.delete(
    "/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a goal",
    description="Soft-delete a financial goal.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def delete_goal(
    request: Request,
    goal_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a goal (soft-delete)."""
    service = GoalService()
    success = service.delete_goal(goal_id, user["user_id"])

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )
