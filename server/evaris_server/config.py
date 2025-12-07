"""Configuration for evaris-server."""

import logging
from functools import lru_cache
from typing import Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Server configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8080
    environment: str = "development"
    debug: bool = False

    # Database (PostgreSQL)
    database_url: str = "postgresql://localhost:5432/evaris"

    # Internal authentication (from evaris-web)
    # Security: Must be changed from default in production
    internal_jwt_secret: str = "change-me-in-production"
    internal_jwt_algorithm: str = "HS256"

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        """Validate security-critical settings."""
        # Enforce JWT secret in production
        if self.environment == "production":
            if self.internal_jwt_secret == "change-me-in-production":
                raise ValueError(
                    "CRITICAL: internal_jwt_secret must be set in production. "
                    "Set INTERNAL_JWT_SECRET environment variable."
                )
        elif self.internal_jwt_secret == "change-me-in-production":
            logger.warning(
                "Using insecure default JWT secret. " "Set INTERNAL_JWT_SECRET for production."
            )
        return self

    # LLM Provider for Judge (Evaris's API keys)
    openrouter_api_key: Optional[str] = None
    judge_model: str = "openai/gpt-4o-mini"
    judge_provider: str = "openrouter"

    # Observability
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
