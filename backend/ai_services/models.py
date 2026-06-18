"""
Pydantic models for product data validation and API contracts.

These models define the shared data structures between the AI/ML layer
and the Backend Developer's API routes. They serve as the contract
ensuring clean integration.
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime
from enum import Enum


class ProductCategory(str, Enum):
    TERM = "term_insurance"
    ULIP = "ulip"
    SAVINGS = "savings"
    RETIREMENT = "retirement"
    CHILD = "child"
    HEALTH = "health"
    PROTECTION = "protection"
    OTHER = "other"


class ProductFeature(BaseModel):
    """A single product feature (e.g., 'Min Entry Age: 18 years')."""
    feature_name: str
    feature_value: str
    feature_description: Optional[str] = None


class ScrapedProduct(BaseModel):
    """Validated product data from the scraper."""
    product_name: str = Field(..., min_length=3)
    product_code: Optional[str] = None
    category: ProductCategory = ProductCategory.OTHER
    sub_category: Optional[str] = None
    description: str = Field(..., min_length=20)
    features: list[ProductFeature] = Field(default_factory=list)
    eligibility: dict = Field(default_factory=dict)
    brochure_url: Optional[str] = None
    source_url: str
    last_scraped: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    raw_chunks: list[str] = Field(default_factory=list, description="Raw text chunks from the full PDF for semantic RAG")

    class Config:
        json_schema_extra = {
            "example": {
                "product_name": "ICICI Pru iProtect Smart",
                "category": "term_insurance",
                "description": "A comprehensive term insurance plan...",
                "features": [
                    {
                        "feature_name": "Life Cover",
                        "feature_value": "Up to ₹5 Crore",
                        "feature_description": "Provides financial security..."
                    }
                ],
                "eligibility": {
                    "min_entry_age": "18 years",
                    "max_entry_age": "65 years",
                    "min_sum_assured": "₹50 Lakhs"
                },
                "source_url": "https://www.iciciprulife.com/term-insurance/iprotect-smart.html"
            }
        }


# ── Financial Goal Models ─────────────────────────────────

class FinancialGoal(BaseModel):
    """A single financial goal extracted from user conversation."""
    goal_type: str = Field(..., description="e.g., 'retirement', 'child_education', 'home_purchase'")
    target_amount: Optional[float] = Field(None, gt=0, description="Target corpus in INR")
    target_year: Optional[int] = Field(None, description="Year by which goal should be achieved")
    priority: int = Field(default=1, ge=1, le=5, description="1=highest, 5=lowest")
    monthly_contribution: Optional[float] = Field(None, description="Monthly savings towards this goal")
    notes: Optional[str] = None


class UserProfile(BaseModel):
    """Structured user profile extracted from chat conversation."""
    age: Optional[int] = Field(None, ge=18, le=100)
    annual_income: Optional[float] = Field(None, gt=0, description="Annual income in INR")
    monthly_expenses: Optional[float] = Field(None, ge=0)
    existing_coverage: Optional[float] = Field(None, ge=0, description="Existing insurance cover in INR")
    dependents: Optional[int] = Field(None, ge=0)
    risk_appetite: Optional[str] = Field(None, description="'conservative', 'moderate', 'aggressive'")
    goals: list[FinancialGoal] = Field(default_factory=list)
    city: Optional[str] = None
    marital_status: Optional[str] = None
    occupation: Optional[str] = None


class SimulationResult(BaseModel):
    """Output of a single-goal corpus simulation."""
    goal_type: str
    target_amount: float
    future_value: float = Field(..., description="Inflation-adjusted target amount")
    years_remaining: int
    monthly_savings_required: float
    current_gap: float = Field(..., description="Shortfall between projected corpus and target")
    projected_corpus: float = Field(..., description="Corpus at target date with current savings")
    coverage_ratio: float = Field(..., ge=0, description="Projected / Required, capped at 1.0")
    inflation_rate: float
    expected_return: float


class MultiGoalSimulationResult(BaseModel):
    """Aggregated simulation output for all user goals."""
    user_age: int
    total_monthly_savings_required: float
    total_gap: float
    goals: list[SimulationResult]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ProductMatch(BaseModel):
    """A product matched to a user's goals via vector similarity."""
    product_name: str
    product_id: str
    category: str
    similarity_score: float = Field(..., ge=0, le=1)
    matched_goals: list[str]
    description: str
    key_benefits: list[str] = Field(default_factory=list)


class RankedProduct(BaseModel):
    """A product with a composite ranking score."""
    product_name: str
    product_id: str
    category: str
    rank: int
    composite_score: float = Field(..., ge=0, le=100)
    similarity_score: float
    goal_coverage_score: float
    category_fit_score: float
    matched_goals: list[str]
    description: str
    key_benefits: list[str] = Field(default_factory=list)
    reasoning: str = ""


class WhatIfScenario(BaseModel):
    """Input for a what-if simulation."""
    scenario_name: str = Field(..., description="e.g., 'Delay retirement by 5 years'")
    modified_params: dict = Field(..., description="Parameters to override in the simulation")


class WhatIfResult(BaseModel):
    """Comparison between baseline and modified simulation."""
    scenario_name: str
    baseline: MultiGoalSimulationResult
    modified: MultiGoalSimulationResult
    delta_monthly_savings: float
    delta_total_gap: float
    summary: str = Field(..., description="Human-readable summary of changes")


class GuardrailResult(BaseModel):
    """Output of the guardrails validation layer."""
    is_valid: bool
    original_data: dict
    sanitized_data: dict
    warnings: list[str] = Field(default_factory=list)
    disclaimers: list[str] = Field(default_factory=list)