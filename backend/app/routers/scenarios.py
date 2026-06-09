"""
Scenarios router — What-If comparison endpoint.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.schemas.scenarios import ScenarioRequest, ScenarioResponse, TemplateListResponse
from app.services.scenario_wrapper import run_scenario, list_templates
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, AI_RATE_LIMIT

router = APIRouter(prefix="/api", tags=["Scenarios"])


@router.post(
    "/scenarios",
    response_model=ScenarioResponse,
    summary="Run a what-if scenario",
    description=(
        "Compare baseline vs. modified simulation. "
        "Use a predefined template (e.g., 'delay_retirement_5y') or "
        "provide custom parameter overrides."
    ),
)
@limiter.limit(AI_RATE_LIMIT)
async def run_what_if(
    request: Request,
    body: ScenarioRequest,
    user: dict = Depends(get_current_user),
):
    """Run a what-if scenario comparison."""
    try:
        if not body.template and not body.custom_params:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide either 'template' or 'custom_params'",
            )

        result = run_scenario(body.model_dump())
        return ScenarioResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scenario comparison failed: {str(e)}",
        )


@router.get(
    "/scenarios/templates",
    response_model=TemplateListResponse,
    summary="List available what-if templates",
    description="Returns predefined scenario templates that can be used with /api/scenarios.",
)
@limiter.limit(AI_RATE_LIMIT)
async def get_templates(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """List all available what-if scenario templates."""
    templates = list_templates()
    return TemplateListResponse(templates=templates)
