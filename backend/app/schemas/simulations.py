"""Simulation session persistence schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SimulationSessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    status: str
    total_monthly_savings: Optional[float] = None
    total_gap: Optional[float] = None
    profile_snapshot: dict
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SimulationSessionDetailResponse(BaseModel):
    session: SimulationSessionResponse
    results: list[dict] = Field(default_factory=list)
    recommendations: list[dict] = Field(default_factory=list)


class SimulationSessionListResponse(BaseModel):
    simulations: list[SimulationSessionResponse]
    total: int
