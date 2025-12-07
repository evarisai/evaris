"""Main FastAPI application for evaris-server."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from evaris_server.config import get_settings
from evaris_server.db import get_database
from evaris_server.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    settings = get_settings()

    print("Starting evaris-server...")
    print(f"  Environment: {settings.environment}")
    print(f"  Judge model: {settings.judge_model}")

    db = await get_database()
    print("  Database: connected")

    yield

    print("Shutting down evaris-server...")
    await db.disconnect()
    print("  Database: disconnected")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="evaris-server",
        description="Internal evaluation server for Evaris platform",
        version="0.1.0",
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url="/redoc" if settings.environment == "development" else None,
        openapi_url="/openapi.json" if settings.environment == "development" else None,
        lifespan=lifespan,
    )

    if settings.environment == "development":
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000", "http://localhost:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "evaris_server.app:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
    )
