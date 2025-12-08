import asyncio
import json
import os
from typing import Any, AsyncIterator, Optional
import httpx
from pydantic import ValidationError

from evaris_client.types import (
    TestCase,
    AssessmentResult,
    AssessmentProgressEvent,
    TraceResult,
    LogResult,
    Observation,
    EvalConfig,
    JudgeConfig,
    ExperimentConfig,
    ExperimentResult,
    ComplianceFramework,
    ComplianceCheckResult,
    LogLevel,
)


class EvarisError(Exception):
    """Base exception for Evaris SDK errors."""
    pass


class EvarisStreamError(EvarisError):
    """Error during streaming operations."""
    pass


class EvarisAPIError(EvarisError):
    """Error from the Evaris API."""
    def __init__(self, message: str, status_code: int, response_body: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class EvarisClient:
    """Client for Evaris AI evaluation platform.

    Usage:
        # With explicit project_id
        client = EvarisClient(api_key="ev_...")
        result = await client.assess(
            name="my-eval",
            project_id="proj_123",
            test_cases=[TestCase(input="...", actual_output="...")],
            metrics=["faithfulness", "hallucination"]
        )

        # With default project (uses "default" project or EVARIS_PROJECT_ID env var)
        client = EvarisClient(api_key="ev_...")
        result = await client.assess(
            name="my-eval",
            test_cases=[...],
            metrics=[...]
        )

        # With streaming progress updates
        async for event in client.assess_stream(
            name="my-eval",
            test_cases=[...],
            metrics=[...]
        ):
            print(f"Progress: {event.progress}%")

    The client connects to the Evaris web backend which validates the API key
    and forwards requests to the internal evaluation server.

    LLM Judge Configuration:
        The LLM-as-Judge uses OpenRouter by default for model inference.
        Configure via JudgeConfig or environment variables:
        - OPENROUTER_API_KEY: API key for OpenRouter
        - EVARIS_JUDGE_MODEL: Model to use (default: anthropic/claude-3.5-sonnet)
    """

    DEFAULT_BASE_URL = "https://api.evaris.ai"
    DEV_BASE_URL = "http://localhost:4000"

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        project_id: Optional[str] = None,
        timeout: float = 300.0,
    ):
        self._api_key = api_key or os.getenv("EVARIS_API_KEY")
        if not self._api_key:
            raise ValueError("API key required. Set EVARIS_API_KEY or pass api_key parameter.")

        self._base_url = (base_url or os.getenv("EVARIS_BASE_URL") or self.DEFAULT_BASE_URL).rstrip("/")
        self._default_project_id = project_id or os.getenv("EVARIS_PROJECT_ID")
        self._timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    def _resolve_project_id(self, project_id: Optional[str]) -> str:
        """Resolve project_id, requiring it to be set."""
        resolved = project_id or self._default_project_id
        if not resolved:
            raise ValueError(
                "project_id is required. Either pass it explicitly, set it in the client constructor, "
                "or set the EVARIS_PROJECT_ID environment variable."
            )
        return resolved

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
        project_id: Optional[str] = None,
        experiment_id: Optional[str] = None,
        config: Optional[EvalConfig] = None,
        judge_config: Optional[JudgeConfig] = None,
        baseline_eval_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> AssessmentResult:
        """Run an evaluation and return results.

        Args:
            name: Name of the evaluation
            test_cases: List of test cases to evaluate
            metrics: List of metric names to run (e.g., ["faithfulness", "hallucination"])
            project_id: Project ID (uses default if not provided)
            experiment_id: Optional experiment ID for versioning
            config: Optional evaluation configuration for the agent being evaluated
            judge_config: Optional LLM Judge configuration (OpenRouter model, temperature)
            baseline_eval_id: Optional ID of a previous eval to compare against
            metadata: Optional metadata dictionary

        Returns:
            AssessmentResult with eval_id, status, summary, and results

        Note:
            The LLM Judge is separate from the agent being evaluated. The judge uses
            OpenRouter for inference and can be configured via judge_config or
            environment variables (OPENROUTER_API_KEY, EVARIS_JUDGE_MODEL).
        """
        client = await self._get_client()
        resolved_project_id = self._resolve_project_id(project_id)

        payload = {
            "name": name,
            "project_id": resolved_project_id,
            "test_cases": [tc.model_dump(mode="json") for tc in test_cases],
            "metrics": metrics,
            "metadata": metadata or {},
        }

        if experiment_id:
            payload["experiment_id"] = experiment_id
        if config:
            payload["config"] = config.model_dump(mode="json", exclude_none=True)
        if judge_config:
            payload["judge_config"] = judge_config.model_dump(mode="json", exclude_none=True)
        if baseline_eval_id:
            payload["baseline_eval_id"] = baseline_eval_id

        response = await client.post("/api/assess", json=payload)
        response.raise_for_status()

        return AssessmentResult.model_validate(response.json())

    async def assess_stream(
        self,
        name: str,
        test_cases: list[TestCase],
        metrics: list[str],
        project_id: Optional[str] = None,
        experiment_id: Optional[str] = None,
        config: Optional[EvalConfig] = None,
        judge_config: Optional[JudgeConfig] = None,
        baseline_eval_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> AsyncIterator[AssessmentProgressEvent]:
        """Run an evaluation with streaming progress updates.

        Yields progress events as the evaluation runs, including real-time
        results for each test case.

        Args:
            Same as assess()

        Yields:
            AssessmentProgressEvent with progress percentage and current results
        """
        client = await self._get_client()
        resolved_project_id = self._resolve_project_id(project_id)

        payload = {
            "name": name,
            "project_id": resolved_project_id,
            "test_cases": [tc.model_dump(mode="json") for tc in test_cases],
            "metrics": metrics,
            "metadata": metadata or {},
            "stream": True,
        }

        if experiment_id:
            payload["experiment_id"] = experiment_id
        if config:
            payload["config"] = config.model_dump(mode="json", exclude_none=True)
        if judge_config:
            payload["judge_config"] = judge_config.model_dump(mode="json", exclude_none=True)
        if baseline_eval_id:
            payload["baseline_eval_id"] = baseline_eval_id

        async with client.stream("POST", "/api/assess/stream", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    raw_data = line[6:]
                    try:
                        data = json.loads(raw_data)
                    except json.JSONDecodeError as e:
                        raise EvarisStreamError(
                            f"Failed to parse SSE event: {e}. Raw data: {raw_data[:200]}"
                        ) from e
                    try:
                        yield AssessmentProgressEvent.model_validate(data)
                    except ValidationError as e:
                        raise EvarisStreamError(
                            f"Server returned unexpected event format: {e}"
                        ) from e

    async def get_assessment(self, eval_id: str) -> AssessmentResult:
        """Retrieve an assessment by ID."""
        client = await self._get_client()
        response = await client.get(f"/api/assessments/{eval_id}")
        response.raise_for_status()
        return AssessmentResult.model_validate(response.json())

    async def trace(
        self,
        name: str,
        observations: list[Observation],
        project_id: Optional[str] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        environment: Optional[str] = None,
        release: Optional[str] = None,
        tags: Optional[list[str]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> TraceResult:
        """Send trace data to Evaris.

        Args:
            name: Name of the trace (usually the root operation)
            observations: List of observations (spans, generations, events)
            project_id: Project ID (uses default if not provided)
            session_id: Optional session ID for grouping traces
            user_id: Optional user ID for user tracking
            environment: Optional environment (production, staging, development)
            release: Optional release/version tag
            tags: Optional list of tags for filtering
            metadata: Optional metadata dictionary

        Returns:
            TraceResult with trace_id and metrics
        """
        client = await self._get_client()
        resolved_project_id = self._resolve_project_id(project_id)

        def serialize_observation(obs: Observation) -> dict[str, Any]:
            data = obs.model_dump(mode="json", exclude={"children"})
            data["children"] = [serialize_observation(c) for c in obs.children]
            return data

        payload = {
            "name": name,
            "project_id": resolved_project_id,
            "observations": [serialize_observation(o) for o in observations],
            "metadata": metadata or {},
        }

        if session_id:
            payload["session_id"] = session_id
        if user_id:
            payload["user_id"] = user_id
        if environment:
            payload["environment"] = environment
        if release:
            payload["release"] = release
        if tags:
            payload["tags"] = tags

        response = await client.post("/api/trace", json=payload)
        response.raise_for_status()

        return TraceResult.model_validate(response.json())

    async def log(
        self,
        level: LogLevel,
        message: str,
        project_id: Optional[str] = None,
        source: Optional[str] = None,
        agent_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> LogResult:
        """Send a log entry to Evaris.

        Args:
            level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            message: Log message
            project_id: Optional project ID
            source: Optional source identifier
            agent_id: Optional agent ID for multi-agent systems
            trace_id: Optional trace ID for correlation
            metadata: Optional metadata dictionary

        Returns:
            LogResult with log_id
        """
        client = await self._get_client()

        payload = {
            "level": level.value if isinstance(level, LogLevel) else level,
            "message": message,
            "source": source or "sdk",
            "metadata": metadata or {},
        }

        if project_id:
            payload["project_id"] = project_id
        if agent_id:
            payload["agent_id"] = agent_id
        if trace_id:
            payload["trace_id"] = trace_id

        response = await client.post("/api/log", json=payload)
        response.raise_for_status()

        return LogResult.model_validate(response.json())

    async def create_experiment(
        self,
        config: ExperimentConfig,
        project_id: Optional[str] = None,
    ) -> ExperimentResult:
        """Create a new experiment for versioning evaluations.

        Args:
            config: Experiment configuration
            project_id: Project ID (uses default if not provided)

        Returns:
            ExperimentResult with experiment_id
        """
        client = await self._get_client()
        resolved_project_id = self._resolve_project_id(project_id)

        payload = {
            "project_id": resolved_project_id,
            **config.model_dump(mode="json", exclude_none=True),
        }

        response = await client.post("/api/experiments", json=payload)
        response.raise_for_status()

        return ExperimentResult.model_validate(response.json())

    async def get_experiment(self, experiment_id: str) -> ExperimentResult:
        """Retrieve an experiment by ID."""
        client = await self._get_client()
        response = await client.get(f"/api/experiments/{experiment_id}")
        response.raise_for_status()
        return ExperimentResult.model_validate(response.json())

    async def check_compliance(
        self,
        project_id: Optional[str] = None,
        frameworks: Optional[list[ComplianceFramework]] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> list[ComplianceCheckResult]:
        """Run compliance checks for a project.

        Args:
            project_id: Project ID (uses default if not provided)
            frameworks: Optional list of frameworks to check (defaults to all)
            entity_type: Optional entity type to check (eval, trace, model, dataset)
            entity_id: Optional specific entity ID to check

        Returns:
            List of ComplianceCheckResult for each framework
        """
        client = await self._get_client()
        resolved_project_id = self._resolve_project_id(project_id)

        params: dict[str, Any] = {"project_id": resolved_project_id}
        if frameworks:
            params["frameworks"] = [f.value for f in frameworks]
        if entity_type:
            params["entity_type"] = entity_type
        if entity_id:
            params["entity_id"] = entity_id

        response = await client.post("/api/compliance/check", json=params)
        response.raise_for_status()

        return [ComplianceCheckResult.model_validate(r) for r in response.json()]

    async def get_compliance_status(
        self,
        project_id: Optional[str] = None,
    ) -> list[ComplianceCheckResult]:
        """Get current compliance status for a project.

        Args:
            project_id: Project ID (uses default if not provided)

        Returns:
            List of ComplianceCheckResult for all frameworks
        """
        client = await self._get_client()
        resolved_project_id = self._resolve_project_id(project_id)
        response = await client.get(f"/api/compliance/{resolved_project_id}")
        response.raise_for_status()
        return [ComplianceCheckResult.model_validate(r) for r in response.json()]

    def assess_sync(
        self,
        name: str,
        test_cases: list[TestCase],
        metrics: list[str],
        project_id: Optional[str] = None,
        experiment_id: Optional[str] = None,
        config: Optional[EvalConfig] = None,
        judge_config: Optional[JudgeConfig] = None,
        baseline_eval_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> AssessmentResult:
        """Synchronous version of assess().

        Note: Cannot be called from within an async context.
        """
        return asyncio.run(
            self.assess(
                name=name,
                test_cases=test_cases,
                metrics=metrics,
                project_id=project_id,
                experiment_id=experiment_id,
                config=config,
                judge_config=judge_config,
                baseline_eval_id=baseline_eval_id,
                metadata=metadata,
            )
        )

    def trace_sync(
        self,
        name: str,
        observations: list[Observation],
        project_id: Optional[str] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        environment: Optional[str] = None,
        release: Optional[str] = None,
        tags: Optional[list[str]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> TraceResult:
        """Synchronous version of trace().

        Note: Cannot be called from within an async context.
        """
        return asyncio.run(
            self.trace(
                name=name,
                observations=observations,
                project_id=project_id,
                session_id=session_id,
                user_id=user_id,
                environment=environment,
                release=release,
                tags=tags,
                metadata=metadata,
            )
        )

    def log_sync(
        self,
        level: LogLevel,
        message: str,
        project_id: Optional[str] = None,
        source: Optional[str] = None,
        agent_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> LogResult:
        """Synchronous version of log().

        Note: Cannot be called from within an async context.
        """
        return asyncio.run(
            self.log(
                level=level,
                message=message,
                project_id=project_id,
                source=source,
                agent_id=agent_id,
                trace_id=trace_id,
                metadata=metadata,
            )
        )
