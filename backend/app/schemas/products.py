"""Product request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProductResponse(BaseModel):
    id: str
    product_id: str
    name: str
    category: str
    description: Optional[str] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    policy_term_min: Optional[int] = None
    policy_term_max: Optional[int] = None
    key_benefits: list = Field(default_factory=list)
    goals_supported: list = Field(default_factory=list)
    is_active: bool = True
    created_at: Optional[datetime] = None


class CreateProductRequest(BaseModel):
    product_id: str = Field(..., min_length=3)
    name: str = Field(..., min_length=3)
    category: str
    description: Optional[str] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    policy_term_min: Optional[int] = None
    policy_term_max: Optional[int] = None
    key_benefits: list = Field(default_factory=list)
    goals_supported: list = Field(default_factory=list)


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
    total: int
