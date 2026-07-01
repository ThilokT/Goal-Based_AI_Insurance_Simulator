"""
Supabase client — provides admin and per-user client instances.

- Admin client: uses the service_role key, bypasses RLS (for server-side ops).
- User client: uses the anon key + user JWT, RLS is enforced.
"""
from functools import lru_cache
from supabase import create_client, Client
from app.config import get_settings


@lru_cache(maxsize=1)
def get_admin_client() -> Client:
    """
    Admin Supabase client (service_role key).
    Bypasses RLS — use only for server-side operations like
    product upserts, scheduled jobs, and migrations.
    """
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def get_user_client(access_token: str) -> Client:
    """
    Per-user Supabase client with the user's JWT set.
    RLS policies are enforced — the user can only see their own data.
    """
    settings = get_settings()
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.auth.set_session(access_token, "")
    return client
