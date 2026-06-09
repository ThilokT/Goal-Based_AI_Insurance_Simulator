"""
Conversation service — CRUD for chat sessions and messages.
"""
import logging
from typing import Optional
from app.database import get_admin_client

logger = logging.getLogger("lifemap.conversations")


class ConversationService:
    """Manages chat conversations and messages in Supabase."""

    def __init__(self):
        self.client = get_admin_client()

    def list_conversations(self, user_id: str) -> list[dict]:
        """List all conversations for a user (most recent first)."""
        response = (
            self.client.table("conversations")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .order("updated_at", desc=True)
            .execute()
        )
        return response.data or []

    def get_conversation(self, conversation_id: str, user_id: str) -> Optional[dict]:
        """Get a conversation with all its messages."""
        # Get conversation
        conv_response = (
            self.client.table("conversations")
            .select("*")
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not conv_response.data:
            return None

        # Get messages
        msg_response = (
            self.client.table("messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .execute()
        )

        return {
            "conversation": conv_response.data,
            "messages": msg_response.data or [],
        }

    def create_conversation(self, user_id: str, title: str = "New Conversation") -> dict:
        """Create a new conversation."""
        response = (
            self.client.table("conversations")
            .insert({"user_id": user_id, "title": title})
            .execute()
        )
        return response.data[0] if response.data else {}

    def add_message(
        self,
        conversation_id: str,
        user_id: str,
        role: str,
        content: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Add a message to a conversation."""
        data = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "metadata": metadata or {},
        }
        response = (
            self.client.table("messages")
            .insert(data)
            .execute()
        )

        # Update conversation's updated_at
        self.client.table("conversations").update(
            {"updated_at": "now()"}
        ).eq("id", conversation_id).execute()

        return response.data[0] if response.data else {}

    def update_context(self, conversation_id: str, context: dict) -> None:
        """Update the extracted context for a conversation."""
        self.client.table("conversations").update(
            {"extracted_context": context}
        ).eq("id", conversation_id).execute()

    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Soft-delete a conversation."""
        response = (
            self.client.table("conversations")
            .update({"is_active": False})
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(response.data)
