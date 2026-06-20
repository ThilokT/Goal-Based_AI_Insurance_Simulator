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
    # ── What-If Parameters ──────────────────────────────
    inflation_rate: Optional[float] = Field(None, ge=0.01, le=0.20, description="Override inflation rate (e.g. 0.06 for 6%)")
    existing_savings: Optional[float] = Field(0.0, ge=0, description="Lump sum already saved (INR)")
    annual_increment_percent: Optional[float] = Field(0.0, ge=0, le=0.50, description="Annual salary/SIP step-up rate (e.g. 0.08 for 8%)")
    retirement_age: Optional[int] = Field(60, ge=40, le=80, description="Target retirement age")
    child_education_abroad: Optional[bool] = Field(False, description="Apply 2.2x multiplier to education goals")
    expected_return_override: Optional[float] = Field(None, ge=0.01, le=0.25, description="Override expected return rate")


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
    # ── Product Recommendation ──────────────────────────
    recommended_product_name: Optional[str] = None
    recommended_product_category: Optional[str] = None
    recommended_product_id: Optional[str] = None


class YearlyProjection(BaseModel):
    year: int
    age: int
    total_invested: float
    projected_corpus: float


class SimulateResponse(BaseModel):
    simulation_id: Optional[str] = None
    user_age: int
    total_monthly_savings_required: float
    total_gap: float
    goals: list[GoalResultResponse]
    yearly_projections: list[YearlyProjection] = Field(default_factory=list)
    disclaimers: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    timestamp: Optional[datetime] = None


class ProductSimulateRequest(BaseModel):
    """Input for simulating a specific product directly."""
    monthly_premium: float = Field(..., gt=0, description="Monthly premium amount in INR")
    tenure_years: int = Field(..., gt=0, description="Investment duration in years")
    risk_appetite: str = Field("moderate", description="User's risk appetite: conservative, moderate, aggressive")
    user_age: int = Field(..., gt=0)


class ProductSimulateResponse(BaseModel):
    """Output for a product-specific simulation."""
    product_name: str
    product_category: str
    monthly_premium: float
    tenure_years: int
    total_invested: float
    projected_corpus: float
    expected_return_rate: float
    yearly_projections: list[YearlyProjection]
    warnings: list[str] = Field(default_factory=list)
    disclaimers: list[str] = Field(default_factory=list)
