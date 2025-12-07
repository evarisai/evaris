"""Internal authentication middleware."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel

from evaris_server.config import Settings, get_settings

AUTH_HEADERS = {"WWW-Authenticate": "Bearer"}


class InternalAuthContext(BaseModel):
    """Authenticated context from evaris-web."""

    organization_id: str
    project_id: str
    user_id: str
    permissions: list[str] = []
    issued_at: datetime | None = None
    expires_at: datetime | None = None


def _auth_error(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers=AUTH_HEADERS,
    )


def decode_internal_token(token: str, settings: Settings) -> InternalAuthContext:
    """Decode and validate the internal JWT token from evaris-web."""
    try:
        payload = jwt.decode(
            token,
            settings.internal_jwt_secret,
            algorithms=[settings.internal_jwt_algorithm],
        )
    except JWTError as e:
        raise _auth_error(f"Token decode failed: {str(e)}")

    organization_id = payload.get("organization_id")
    if not organization_id:
        raise _auth_error("Token missing required 'organization_id' claim")

    project_id = payload.get("project_id")
    if not project_id:
        raise _auth_error("Token missing required 'project_id' claim")

    user_id = payload.get("user_id")
    if not user_id:
        raise _auth_error("Token missing required 'user_id' claim")

    exp = payload.get("exp")
    if exp:
        exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
        if exp_dt < datetime.now(timezone.utc):
            raise _auth_error("Token has expired")

    iat = payload.get("iat")
    return InternalAuthContext(
        organization_id=organization_id,
        project_id=project_id,
        user_id=user_id,
        permissions=payload.get("permissions", []),
        issued_at=datetime.fromtimestamp(iat, tz=timezone.utc) if iat else None,
        expires_at=datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None,
    )


async def verify_internal_request(
    x_context_token: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> InternalAuthContext:
    """FastAPI dependency to verify internal requests from evaris-web."""
    if not x_context_token:
        raise _auth_error("Missing internal authentication token")

    return decode_internal_token(x_context_token, settings)


def create_internal_token(
    organization_id: str,
    project_id: str,
    user_id: str,
    settings: Settings,
    permissions: list[str] | None = None,
    expires_in_seconds: int = 300,
) -> str:
    """Create an internal JWT token (for testing or evaris-web reference)."""
    now = datetime.now(timezone.utc)
    payload = {
        "organization_id": organization_id,
        "project_id": project_id,
        "user_id": user_id,
        "permissions": permissions or ["read", "write"],
        "iat": int(now.timestamp()),
        "exp": int(now.timestamp()) + expires_in_seconds,
    }

    token: str = jwt.encode(
        payload,
        settings.internal_jwt_secret,
        algorithm=settings.internal_jwt_algorithm,
    )
    return token
