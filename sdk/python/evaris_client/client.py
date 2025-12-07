import os
from typing import Any, Optional
import httpx

from evaris_client.types import (
    TestCase,
    AssessmentResult,
    TraceResult,
    LogResult,
    Span,
)


class EvarisClient:
    """Lightweight client for Evaris AI evaluation platform.

    Usage:
        client = EvarisClient(api_key="ev_...")

        result = await client.assess(
            name="my-eval",
            test_cases=[TestCase(input="...", actual_output="...")],
            metrics=["faithfulness"]
        )

    The client connects to the Evaris web backend which validates the API key
    and forwards requests to the internal evaluation server.
    """

    # Production URL - points to the web backend API gateway
    DEFAULT_BASE_URL = "https://api.evaris.ai"
    # Development URL - for local testing
    DEV_BASE_URL = "http://localhost:4000"

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 120.0,
    ):
        self._api_key = api_key or os.getenv("EVARIS_API_KEY")
        if not self._api_key:
            raise ValueError("API key required. Set EVARIS_API_KEY or pass api_key parameter.")

        self._base_url = (base_url or os.getenv("EVARIS_BASE_URL") or self.DEFAULT_BASE_URL).rstrip("/")
        self._timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                headers=self._get_headers(),
                timeout=self._timeout,
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "EvarisClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()

    async def assess(
        self,
        name: str,
        test_cases: list[TestCase],
        metrics: list[str],
        metadata: Optional[dict[str, Any]] = None,
    ) -> AssessmentResult:
        """Run an evaluation and return results."""
        client = await self._get_client()

        payload = {
            "name": name,
            "test_cases": [tc.model_dump() for tc in test_cases],
            "metrics": metrics,
            "metadata": metadata or {},
        }

        response = await client.post("/api/assess", json=payload)
        response.raise_for_status()

        return AssessmentResult.model_validate(response.json())

    async def trace(
        self,
        name: str,
        spans: list[Span],
        metadata: Optional[dict[str, Any]] = None,
    ) -> TraceResult:
        """Send trace data to Evaris."""
        client = await self._get_client()

        def serialize_span(span: Span) -> dict[str, Any]:
            data = span.model_dump()
            data["children"] = [serialize_span(c) for c in span.children]
            return data

        payload = {
            "name": name,
            "spans": [serialize_span(s) for s in spans],
            "metadata": metadata or {},
        }

        response = await client.post("/api/trace", json=payload)
        response.raise_for_status()

        return TraceResult.model_validate(response.json())

    async def log(
        self,
        level: str,
        message: str,
        source: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> LogResult:
        """Send a log entry to Evaris."""
        client = await self._get_client()

        payload = {
            "level": level,
            "message": message,
            "source": source or "sdk",
            "metadata": metadata or {},
        }

        response = await client.post("/api/log", json=payload)
        response.raise_for_status()

        return LogResult.model_validate(response.json())

    async def get_assessment(self, eval_id: str) -> AssessmentResult:
        """Retrieve an assessment by ID."""
        client = await self._get_client()

        response = await client.get(f"/api/assessments/{eval_id}")
        response.raise_for_status()

        return AssessmentResult.model_validate(response.json())

    def assess_sync(
        self,
        name: str,
        test_cases: list[TestCase],
        metrics: list[str],
        metadata: Optional[dict[str, Any]] = None,
    ) -> AssessmentResult:
        """Synchronous version of assess()."""
        import asyncio
        return asyncio.get_event_loop().run_until_complete(
            self.assess(name, test_cases, metrics, metadata)
        )
