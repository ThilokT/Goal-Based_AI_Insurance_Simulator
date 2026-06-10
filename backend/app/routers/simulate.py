"""
Simulate router — runs financial simulations via P3's engine.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.schemas.simulate import SimulateRequest, SimulateResponse
from app.services.simulation_wrapper import run_simulation
from app.services.simulation_session_service import SimulationSessionService
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, AI_RATE_LIMIT

router = APIRouter(prefix="/api", tags=["Simulation"])


@router.post(
    "/simulate",
    response_model=SimulateResponse,
    summary="Run a financial simulation",
    description=(
        "Submit user profile and goals to run a multi-goal financial simulation. "
        "Returns inflation-adjusted targets, monthly SIP requirements, coverage ratios, "
        "and gap analysis for each goal."
    ),
)
@limiter.limit(AI_RATE_LIMIT)
async def simulate(
    request: Request,
    body: SimulateRequest,
    user: dict = Depends(get_current_user),
):
    """Run a multi-goal simulation and save the session."""
    try:
        # Run simulation via P3's engine
        result = run_simulation(body.model_dump())

        # Save simulation session to DB
        session_service = SimulationSessionService()
        session_id = session_service.save_session(
            user_id=user["user_id"],
            title=f"Simulation for {len(body.goals)} goals",
            profile_snapshot=body.model_dump(),
            simulation_result=result,
        )

        return SimulateResponse(
            simulation_id=session_id,
            **result,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation failed: {str(e)}",
        )
