"""Database client with Prisma and RLS context management."""

import re
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from prisma import Prisma
from prisma.engine.errors import EngineConnectionError

from evaris_server.config import Settings, get_settings

# CUID format: starts with 'c' followed by 24 lowercase alphanumeric chars
# This is the standard format used by Prisma's @default(cuid())
CUID_PATTERN = re.compile(r"^c[a-z0-9]{24}$")


class Database:
    """Prisma database client with RLS context support.

    Usage:
        db = Database(settings)
        await db.connect()

        async with db.with_org_context("org_xxx") as client:
            evals = await client.eval.find_many()

        await db.disconnect()
    """

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._client: Prisma | None = None

    async def connect(self) -> None:
        """Establish connection to PostgreSQL via Prisma."""
        if self._client is not None:
            return

        self._client = Prisma()
        await self._client.connect()

    async def disconnect(self) -> None:
        """Close the Prisma connection."""
        if self._client:
            await self._client.disconnect()
            self._client = None

    @property
    def client(self) -> Prisma:
        """Get the Prisma client, raising if not connected."""
        if self._client is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._client

    async def _set_rls_context(
        self,
        organization_id: str,
        is_admin: bool = False,
    ) -> None:
        """Set RLS context variables for the current session.

        Security: Uses parameterized queries via set_config() to prevent SQL injection.
        The organization_id is also validated against strict CUID format.
        """
        # Strict CUID validation to prevent SQL injection
        # CUID format: 'c' + 24 lowercase alphanumeric chars (total 25 chars)
        if not organization_id or not CUID_PATTERN.match(organization_id):
            raise ValueError("Invalid organization_id format: must be a valid CUID")

        # Use parameterized query via set_config() instead of string interpolation
        # set_config(setting_name, new_value, is_local) - is_local=false makes it session-wide
        await self.client.execute_raw(
            "SELECT set_config('app.current_organization_id', $1, false)",
            organization_id,
        )
        if is_admin:
            await self.client.execute_raw("SELECT set_config('app.is_admin', 'true', false)")

    async def _reset_rls_context(self) -> None:
        """Reset RLS context variables."""
        await self.client.execute_raw("RESET app.current_organization_id")
        await self.client.execute_raw("RESET app.is_admin")

    @asynccontextmanager
    async def with_org_context(
        self,
        organization_id: str,
        is_admin: bool = False,
    ) -> AsyncGenerator[Prisma, None]:
        """Get the Prisma client with RLS context set for the given organization."""
        await self._set_rls_context(organization_id, is_admin)
        try:
            yield self.client
        finally:
            await self._reset_rls_context()

    async def health_check(self) -> bool:
        """Check database connectivity."""
        try:
            await self.client.execute_raw("SELECT 1")
            return True
        except (EngineConnectionError, RuntimeError, Exception):
            return False


_database: Database | None = None


async def get_database() -> Database:
    """Get the global database instance."""
    global _database
    if _database is None:
        _database = Database()
        await _database.connect()
    return _database


async def close_database() -> None:
    """Close the global database instance."""
    global _database
    if _database is not None:
        await _database.disconnect()
        _database = None
