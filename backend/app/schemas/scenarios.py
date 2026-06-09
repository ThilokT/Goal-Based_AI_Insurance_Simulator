"""Scenario (What-If) request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from app.schemas.simulate import SimulateRequest, SimulateResponse


class ScenarioRequest(BaseModel):
    profile: SimulateRequest = Field(..., description="Baseline user profile and goals")
    template: Optional[str] = Field(None, description="Predefined template key, e.g. 'delay_retirement_5y'")
    custom_params: Optional[dict] = Field(None, description="Custom parameter overrides for what-if")
    scenario_name: Optional[str] = Field(None, description="Display name for custom scenario")


class ScenarioResponse(BaseModel):
    scenario_name: str
    baseline: SimulateResponse
    modified: SimulateResponse
    delta_monthly_savings: float
    delta_total_gap: float
    summary: str


class TemplateListResponse(BaseModel):
    templates: list[dict]
