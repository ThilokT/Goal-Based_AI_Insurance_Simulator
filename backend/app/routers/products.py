"""
Products router — list, get, and create insurance products.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from app.schemas.products import ProductResponse, CreateProductRequest, ProductListResponse
from app.services.product_service import ProductService
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, CRUD_RATE_LIMIT

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get(
    "",
    response_model=ProductListResponse,
    summary="List insurance products",
    description="Returns a paginated list of insurance products. Optionally filter by category.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def list_products(
    request: Request,
    category: str = Query(None, description="Filter by category (e.g., 'term_insurance', 'ulip')"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    """List products with optional category filter."""
    service = ProductService()
    result = service.list_products(category=category, limit=limit, offset=offset)

    return ProductListResponse(
        products=[ProductResponse(**p) for p in result["products"]],
        total=result["total"],
    )


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Get a single product",
    description="Returns detailed information about a specific insurance product.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def get_product(
    request: Request,
    product_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single product by its product_id."""
    service = ProductService()
    product = service.get_product(product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{product_id}' not found",
        )

    return ProductResponse(**product)


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or upsert a product",
    description="Admin endpoint to create or update an insurance product.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def create_product(
    request: Request,
    body: CreateProductRequest,
    user: dict = Depends(get_current_user),
):
    """Create or upsert a product (admin operation)."""
    service = ProductService()
    product = service.create_product(body.model_dump())

    return ProductResponse(**product)
