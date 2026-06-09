"""
Simulations router — session persistence + WebSocket real-time updates.
"""
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from app.schemas.simulations import (
    SimulationSessionResponse,
    SimulationSessionDetailResponse,
    SimulationSessionListResponse,
)
from app.services.simulation_session_service import SimulationSessionService
from app.services.simulation_wrapper import run_simulation
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, CRUD_RATE_LIMIT

router = APIRouter(prefix="/api/simulations", tags=["Simulation Sessions"])


@router.get(
    "",
    response_model=SimulationSessionListResponse,
    summary="List saved simulations",
    description="Returns all saved simulation sessions for the authenticated user.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def list_simulations(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """List all saved simulation sessions."""
    service = SimulationSessionService()
    result = service.list_sessions(user["user_id"])

    return SimulationSessionListResponse(
        simulations=[SimulationSessionResponse(**s) for s in result["simulations"]],
        total=result["total"],
    )


@router.get(
    "/{simulation_id}",
    response_model=SimulationSessionDetailResponse,
    summary="Get a saved simulation",
    description="Load a saved simulation with its results and recommendations.",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def get_simulation(
    request: Request,
    simulation_id: str,
    user: dict = Depends(get_current_user),
):
    """Load a saved simulation session."""
    service = SimulationSessionService()
    result = service.get_session(simulation_id, user["user_id"])

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found",
        )

    return SimulationSessionDetailResponse(
        session=SimulationSessionResponse(**result["session"]),
        results=result["results"],
        recommendations=result["recommendations"],
    )


@router.delete(
    "/{simulation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a saved simulation",
)
@limiter.limit(CRUD_RATE_LIMIT)
async def delete_simulation(
    request: Request,
    simulation_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a saved simulation session."""
    service = SimulationSessionService()
    success = service.delete_session(simulation_id, user["user_id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found",
        )


# ── WebSocket for Real-Time Simulation Updates ────────────────

@router.websocket("/ws/simulate")
async def websocket_simulate(websocket: WebSocket):
    """
    WebSocket endpoint for real-time simulation updates.

    Client sends a JSON message with simulation parameters.
    Server streams back per-goal results as they are computed.

    Message format (client → server):
    {
        "action": "simulate",
        "data": { ... SimulateRequest fields ... }
    }

    Response events (server → client):
    - {"type": "goal_result", "data": { ... per-goal result ... }}
    - {"type": "complete", "data": { ... full simulation result ... }}
    - {"type": "error", "message": "..."}
    """
    await websocket.accept()

    try:
        while True:
            # Receive simulation request
            raw = await websocket.receive_text()
            message = json.loads(raw)

            action = message.get("action")
            data = message.get("data", {})

            if action == "simulate":
                try:
                    # Run simulation
                    result = run_simulation(data)

                    # Stream per-goal results
                    for goal in result.get("goals", []):
                        await websocket.send_json({
                            "type": "goal_result",
                            "data": goal,
                        })
                        await asyncio.sleep(0.1)  # Small delay for animation

                    # Send complete result
                    await websocket.send_json({
                        "type": "complete",
                        "data": result,
                    })

                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e),
                    })

            elif action == "ping":
                await websocket.send_json({"type": "pong"})

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown action: {action}",
                })

    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close()
