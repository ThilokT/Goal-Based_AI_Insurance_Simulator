"""User profile request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserProfileResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    age: Optional[int] = None
    annual_income: Optional[float] = None
    monthly_expenses: Optional[float] = None
    existing_coverage: Optional[float] = None
    dependents: Optional[int] = None
    risk_appetite: Optional[str] = None
    city: Optional[str] = None
    marital_status: Optional[str] = None
    occupation: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = Field(None, ge=18, le=100)
    annual_income: Optional[float] = Field(None, gt=0)
    monthly_expenses: Optional[float] = Field(None, ge=0)
    existing_coverage: Optional[float] = Field(None, ge=0)
    dependents: Optional[int] = Field(None, ge=0)
    risk_appetite: Optional[str] = Field(None, pattern="^(conservative|moderate|aggressive)$")
    city: Optional[str] = None
    marital_status: Optional[str] = None
    occupation: Optional[str] = None
