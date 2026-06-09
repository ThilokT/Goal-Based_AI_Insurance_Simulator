"""
Goal service — CRUD operations on the goals table.
All queries are scoped to the authenticated user via service key + user_id filter.
"""
import logging
from typing import Optional
from app.database import get_admin_client

logger = logging.getLogger("lifemap.goals")


class GoalService:
    """CRUD for user financial goals in Supabase."""

    def __init__(self):
        self.client = get_admin_client()
        self.table = "goals"

    def list_goals(self, user_id: str, is_active: bool = True) -> dict:
        """List all goals for a user."""
        query = (
            self.client.table(self.table)
            .select("*", count="exact")
            .eq("user_id", user_id)
        )
        if is_active is not None:
            query = query.eq("is_active", is_active)

        response = query.order("priority").execute()

        return {
            "goals": response.data or [],
            "total": response.count or 0,
        }

    def get_goal(self, goal_id: str, user_id: str) -> Optional[dict]:
        """Get a single goal by ID (scoped to user)."""
        response = (
            self.client.table(self.table)
            .select("*")
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return response.data

    def create_goal(self, user_id: str, data: dict) -> dict:
        """Create a new goal for the user."""
        data["user_id"] = user_id
        response = (
            self.client.table(self.table)
            .insert(data)
            .execute()
        )
        return response.data[0] if response.data else {}

    def update_goal(self, goal_id: str, user_id: str, data: dict) -> dict:
        """Update an existing goal (scoped to user)."""
        response = (
            self.client.table(self.table)
            .update(data)
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .execute()
        )
        return response.data[0] if response.data else {}

    def delete_goal(self, goal_id: str, user_id: str) -> bool:
        """Soft-delete a goal."""
        response = (
            self.client.table(self.table)
            .update({"is_active": False})
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(response.data)
