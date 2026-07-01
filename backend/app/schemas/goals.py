"""Goal request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GoalRequest(BaseModel):
    goal_type: str = Field(..., description="e.g., 'retirement', 'child_education', 'home_purchase'")
    target_amount: float = Field(..., gt=0)
    target_year: int = Field(..., ge=0)
    priority: int = Field(default=1, ge=1, le=5)
    monthly_contribution: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class GoalResponse(BaseModel):
    id: str
    user_id: str
    goal_type: str
    target_amount: float
    target_year: int
    priority: int
    monthly_contribution: Optional[float] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GoalListResponse(BaseModel):
    goals: list[GoalResponse]
    total: int
