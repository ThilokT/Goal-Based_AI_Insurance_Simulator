"""
Recommend router — returns ranked product recommendations.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.schemas.recommend import RecommendRequest, RecommendResponse
from app.services.recommend_wrapper import get_recommendations
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, AI_RATE_LIMIT

router = APIRouter(prefix="/api", tags=["Recommendations"])


@router.post(
    "/recommend",
    response_model=RecommendResponse,
    summary="Get product recommendations",
    description=(
        "Submit user goals to get ranked insurance product recommendations. "
        "Uses vector similarity matching + composite scoring to rank products."
    ),
)
@limiter.limit(AI_RATE_LIMIT)
async def recommend(
    request: Request,
    body: RecommendRequest,
    user: dict = Depends(get_current_user),
):
    """Get ranked product recommendations for user goals."""
    try:
        result = get_recommendations(body.model_dump())

        return RecommendResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recommendation failed: {str(e)}",
        )
