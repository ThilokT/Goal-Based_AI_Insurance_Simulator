"""Simulation request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GoalInput(BaseModel):
    goal_type: str
    target_amount: float = Field(..., gt=0)
    target_year: int
    priority: int = Field(default=1, ge=1, le=5)
    monthly_contribution: Optional[float] = None


class SimulateRequest(BaseModel):
    age: int = Field(..., ge=18, le=100)
    annual_income: Optional[float] = Field(None, gt=0)
    monthly_expenses: Optional[float] = Field(None, ge=0)
    dependents: Optional[int] = Field(None, ge=0)
    risk_appetite: Optional[str] = "moderate"
    goals: list[GoalInput] = Field(..., min_length=1)


class GoalResultResponse(BaseModel):
    goal_type: str
    target_amount: float
    future_value: float
    years_remaining: int
    monthly_savings_required: float
    current_gap: float
    projected_corpus: float
    coverage_ratio: float
    inflation_rate: float
    expected_return: float


class SimulateResponse(BaseModel):
    simulation_id: Optional[str] = None
    user_age: int
    total_monthly_savings_required: float
    total_gap: float
    goals: list[GoalResultResponse]
    disclaimers: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    timestamp: Optional[datetime] = None
