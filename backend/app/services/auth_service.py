"""
Auth service — wraps Supabase Auth for signup/login.
"""
import logging
from app.database import get_admin_client

logger = logging.getLogger("lifemap.auth")


class AuthService:
    """Handles user authentication via Supabase Auth."""

    def __init__(self):
        self.client = get_admin_client()

    def signup(self, email: str, password: str, full_name: str = "") -> dict:
        """
        Create a new user account.

        Returns:
            dict with user info and session tokens.

        Raises:
            Exception if signup fails (duplicate email, weak password, etc.).
        """
        try:
            response = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {"full_name": full_name},
                },
            })

            if response.user is None:
                raise ValueError("Signup failed: no user returned")

            # Update profile with full_name if provided
            if full_name and response.user:
                try:
                    self.client.table("profiles").update(
                        {"full_name": full_name}
                    ).eq("id", str(response.user.id)).execute()
                except Exception:
                    pass  # Profile trigger may not have fired yet

            result = {
                "user_id": str(response.user.id),
                "email": response.user.email,
            }

            if response.session:
                result.update({
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "expires_in": response.session.expires_in or 3600,
                })

            return result

        except Exception as e:
            logger.error(f"Signup failed for {email}: {e}")
            raise

    def login(self, email: str, password: str) -> dict:
        """
        Sign in an existing user.

        Returns:
            dict with access_token, refresh_token, user info.

        Raises:
            Exception if credentials are invalid.
        """
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })

            if not response.session:
                raise ValueError("Login failed: no session returned")

            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_in": response.session.expires_in or 3600,
                "user_id": str(response.user.id),
                "email": response.user.email,
            }

        except Exception as e:
            logger.error(f"Login failed for {email}: {e}")
            raise
