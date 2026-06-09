"""
Simulation session service — CRUD for saving/loading simulation sessions.
"""
import logging
from typing import Optional
from app.database import get_admin_client

logger = logging.getLogger("lifemap.sim_sessions")


class SimulationSessionService:
    """Manages simulation session persistence in Supabase."""

    def __init__(self):
        self.client = get_admin_client()

    def list_sessions(self, user_id: str) -> dict:
        """List all simulation sessions for a user."""
        response = (
            self.client.table("simulations")
            .select("*", count="exact")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {
            "simulations": response.data or [],
            "total": response.count or 0,
        }

    def get_session(self, session_id: str, user_id: str) -> Optional[dict]:
        """Get a simulation session with its results and recommendations."""
        # Get session
        session = (
            self.client.table("simulations")
            .select("*")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not session.data:
            return None

        # Get results
        results = (
            self.client.table("simulation_results")
            .select("*")
            .eq("simulation_id", session_id)
            .execute()
        )

        # Get recommendations
        recs = (
            self.client.table("recommendations")
            .select("*")
            .eq("simulation_id", session_id)
            .order("rank")
            .execute()
        )

        return {
            "session": session.data,
            "results": results.data or [],
            "recommendations": recs.data or [],
        }

    def save_session(
        self,
        user_id: str,
        title: str,
        profile_snapshot: dict,
        simulation_result: dict,
        recommendations: list[dict] = None,
    ) -> str:
        """
        Save a complete simulation session with results.

        Returns:
            The simulation session ID.
        """
        # Create simulation session
        session_data = {
            "user_id": user_id,
            "title": title,
            "profile_snapshot": profile_snapshot,
            "status": "completed",
            "total_monthly_savings": simulation_result.get("total_monthly_savings_required"),
            "total_gap": simulation_result.get("total_gap"),
        }
        session = (
            self.client.table("simulations")
            .insert(session_data)
            .execute()
        )
        session_id = session.data[0]["id"]

        # Save per-goal results
        for goal in simulation_result.get("goals", []):
            result_data = {
                "simulation_id": session_id,
                "user_id": user_id,
                "goal_type": goal["goal_type"],
                "target_amount": goal["target_amount"],
                "future_value": goal["future_value"],
                "years_remaining": goal["years_remaining"],
                "monthly_savings_required": goal["monthly_savings_required"],
                "current_gap": goal["current_gap"],
                "projected_corpus": goal["projected_corpus"],
                "coverage_ratio": goal["coverage_ratio"],
                "inflation_rate": goal["inflation_rate"],
                "expected_return": goal["expected_return"],
            }
            self.client.table("simulation_results").insert(result_data).execute()

        # Save recommendations if provided
        if recommendations:
            for rec in recommendations:
                rec_data = {
                    "simulation_id": session_id,
                    "user_id": user_id,
                    "product_id": rec.get("product_id", ""),
                    "product_name": rec.get("product_name", ""),
                    "category": rec.get("category"),
                    "rank": rec.get("rank"),
                    "composite_score": rec.get("composite_score"),
                    "similarity_score": rec.get("similarity_score"),
                    "goal_coverage_score": rec.get("goal_coverage_score"),
                    "category_fit_score": rec.get("category_fit_score"),
                    "matched_goals": rec.get("matched_goals", []),
                    "reasoning": rec.get("reasoning", ""),
                }
                self.client.table("recommendations").insert(rec_data).execute()

        return session_id

    def delete_session(self, session_id: str, user_id: str) -> bool:
        """Delete a simulation session (cascades to results + recommendations)."""
        response = (
            self.client.table("simulations")
            .delete()
            .eq("id", session_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(response.data)
