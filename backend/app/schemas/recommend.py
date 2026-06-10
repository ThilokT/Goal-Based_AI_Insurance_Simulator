"""Recommendation request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional


class RecommendRequest(BaseModel):
    goals: list[dict] = Field(..., min_length=1, description="List of goal dicts with goal_type, target_amount, target_year")
    age: Optional[int] = None
    risk_appetite: Optional[str] = "moderate"
    n_results_per_goal: int = Field(default=3, ge=1, le=10)


class RankedProductResponse(BaseModel):
    product_name: str
    product_id: str
    category: str
    rank: int
    composite_score: float
    similarity_score: float
    goal_coverage_score: float
    category_fit_score: float
    matched_goals: list[str]
    description: str
    key_benefits: list[str] = Field(default_factory=list)
    reasoning: str = ""


class RecommendResponse(BaseModel):
    recommendations: list[RankedProductResponse]
    total: int
    disclaimers: list[str] = Field(default_factory=list)
