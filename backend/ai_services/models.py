"""
Pydantic models for product data validation.
These models ensure scraped data is clean and consistent.
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