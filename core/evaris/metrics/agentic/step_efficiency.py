"""Step Efficiency metric for agent evaluation.

This metric evaluates how efficiently an agent completed a task by comparing
the actual number of steps taken against expected/optimal steps.

Detects:
- Redundant steps (repeated actions)
- Failed retries
- Unnecessary tool calls
- Inefficient execution paths
"""

import json
from typing import Any

from pydantic import BaseModel, Field

from evaris.core.protocols import BaseMetric
from evaris.core.types import MetricResult, TestCase
from evaris.providers.base import BaseLLMProvider
from evaris.providers.factory import get_provider


class StepEfficiencyConfig(BaseModel):
    """Configuration for step efficiency metric."""

    provider: str = Field(
        default="openrouter",
        description="LLM provider name",
    )
    model: str | None = Field(
        default=None,
        description="Model to use (uses provider default if not specified)",
    )
    threshold: float = Field(
        default=0.5,
        description="Minimum efficiency score to pass (0.0-1.0)",
    )
    trace_key: str = Field(
        default="trace",
        description="Key in metadata containing agent trace/steps",
    )
    expected_steps_key: str = Field(
        default="expected_steps",
        description="Key in metadata for expected step count (optional)",
    )
    max_acceptable_ratio: float = Field(
        default=2.0,
        description="Maximum ratio of actual/expected steps before score drops to 0",
    )
    temperature: float = Field(
        default=0.0,
        description="LLM temperature for deterministic results",
    )


class StepEfficiencyMetric(BaseMetric):
    """Step Efficiency metric for agent evaluation.

    Measures how efficiently an agent completed its task by analyzing
    the execution trace for redundant or unnecessary steps.

    Required metadata:
    - trace: List of steps/actions taken by the agent

    Optional metadata:
    - expected_steps: Expected number of steps for optimal execution

    Scoring:
    - If expected_steps provided: min(expected_steps / actual_steps, 1.0)
    - If not provided: LLM analyzes trace for efficiency

    Example:
        >>> metric = StepEfficiencyMetric()
        >>> test_case = TestCase(
        ...     input="Search for weather in NYC",
        ...     metadata={
        ...         "trace": [
        ...             {"action": "search", "query": "weather NYC"},
        ...             {"action": "search", "query": "NYC weather"},  # redundant
        ...             {"action": "parse_result", "data": "..."}
        ...         ],
        ...         "expected_steps": 2
        ...     }
        ... )
        >>> result = await metric.a_measure(test_case, "Weather is sunny")
    """

    threshold: float = 0.5

    def __init__(self, config: StepEfficiencyConfig | None = None):
        """Initialize step efficiency metric."""
        self.config = config or StepEfficiencyConfig()
        self.threshold = self.config.threshold
        self._provider: BaseLLMProvider | None = None

    def _get_provider(self) -> BaseLLMProvider:
        """Get or create the LLM provider."""
        if self._provider is None:
            self._provider = get_provider(
                provider=self.config.provider,
                model=self.config.model,
                temperature=self.config.temperature,
            )
        return self._provider

    def validate_inputs(self, test_case: TestCase, actual_output: Any) -> None:
        """Validate inputs."""
        if not test_case.metadata or self.config.trace_key not in test_case.metadata:
            raise ValueError(
                f"Step efficiency metric requires '{self.config.trace_key}' in metadata"
            )

    def _calculate_ratio_score(self, actual_steps: int, expected_steps: int) -> float:
        """Calculate efficiency score based on step ratio."""
        if actual_steps <= 0:
            return 0.0
        if expected_steps <= 0:
            return 1.0

        ratio = actual_steps / expected_steps

        if ratio <= 1.0:
            return 1.0
        elif ratio >= self.config.max_acceptable_ratio:
            return 0.0
        else:
            # Linear interpolation between 1.0 (ratio=1) and 0.0 (ratio=max)
            return 1.0 - (ratio - 1.0) / (self.config.max_acceptable_ratio - 1.0)

    def _build_analysis_prompt(
        self,
        input_query: str,
        trace: list[dict[str, Any]],
        actual_output: str,
    ) -> str:
        """Build prompt for LLM efficiency analysis."""
        trace_str = json.dumps(trace, indent=2)

        return f"""Analyze the efficiency of this agent's execution trace.

Task: {input_query}

Execution Trace (steps taken):
{trace_str}

Final Output: {actual_output}

Analyze the trace and identify:
1. Total steps taken
2. Redundant steps (repeated or unnecessary actions)
3. Failed attempts that were retried
4. Steps that could have been avoided
5. Overall efficiency assessment

Respond with ONLY a JSON object:
{{"total_steps": <int>, "redundant_steps": <int>, "failed_retries": <int>, "unnecessary_steps": <int>, "efficiency_score": <float 0.0-1.0>, "issues": ["issue1", "issue2"], "reasoning": "explanation"}}

Efficiency guidelines:
- 1.0: Optimal execution, no wasted steps
- 0.7-0.9: Mostly efficient with minor redundancy
- 0.4-0.6: Noticeable inefficiency
- 0.1-0.3: Many wasted steps
- 0.0: Highly inefficient execution

Your response:"""

    def _parse_analysis(self, response: str) -> dict[str, Any]:
        """Parse efficiency analysis response."""
        try:
            content = response.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            data = json.loads(content)
            return {
                "total_steps": int(data.get("total_steps", 0)),
                "redundant_steps": int(data.get("redundant_steps", 0)),
                "failed_retries": int(data.get("failed_retries", 0)),
                "unnecessary_steps": int(data.get("unnecessary_steps", 0)),
                "efficiency_score": float(data.get("efficiency_score", 0.5)),
                "issues": data.get("issues", []),
                "reasoning": data.get("reasoning", ""),
            }
        except (json.JSONDecodeError, ValueError, IndexError):
            return {
                "total_steps": 0,
                "redundant_steps": 0,
                "failed_retries": 0,
                "unnecessary_steps": 0,
                "efficiency_score": 0.5,
                "issues": [],
                "reasoning": "Failed to parse analysis",
            }

    async def a_measure(
        self,
        test_case: TestCase,
        actual_output: Any,
    ) -> MetricResult:
        """Measure step efficiency.

        Args:
            test_case: Test case with trace in metadata
            actual_output: Agent's final response

        Returns:
            MetricResult with efficiency score and analysis
        """
        self.validate_inputs(test_case, actual_output)

        trace = test_case.metadata[self.config.trace_key]  # type: ignore
        actual_steps = len(trace) if isinstance(trace, list) else 0

        # Check if expected steps provided
        expected_steps = None
        if test_case.metadata:
            expected_steps = test_case.metadata.get(self.config.expected_steps_key)

        input_tokens = 0
        output_tokens = 0
        total_cost = 0.0

        if expected_steps is not None and isinstance(expected_steps, int):
            # Simple ratio-based scoring
            score = self._calculate_ratio_score(actual_steps, expected_steps)
            analysis = {
                "total_steps": actual_steps,
                "expected_steps": expected_steps,
                "redundant_steps": max(0, actual_steps - expected_steps),
                "failed_retries": 0,
                "unnecessary_steps": 0,
                "efficiency_score": score,
                "issues": (
                    [f"Took {actual_steps - expected_steps} extra steps"]
                    if actual_steps > expected_steps
                    else []
                ),
                "reasoning": f"Ratio-based: {actual_steps}/{expected_steps} steps",
            }
        else:
            # LLM-based analysis
            provider = self._get_provider()
            input_str = str(test_case.input) if test_case.input else ""
            output_str = str(actual_output)

            analysis_prompt = self._build_analysis_prompt(input_str, trace, output_str)
            analysis_response = await provider.a_complete(analysis_prompt)

            input_tokens = analysis_response.usage.get("prompt_tokens", 0)
            output_tokens = analysis_response.usage.get("completion_tokens", 0)
            total_cost = analysis_response.cost_usd or 0.0

            analysis = self._parse_analysis(analysis_response.content)
            score = analysis["efficiency_score"]

        score = max(0.0, min(1.0, score))
        passed = score >= self.threshold

        return MetricResult(
            name="step_efficiency",
            score=score,
            passed=passed,
            input_tokens=input_tokens if input_tokens > 0 else None,
            output_tokens=output_tokens if output_tokens > 0 else None,
            total_tokens=(input_tokens + output_tokens) if input_tokens > 0 else None,
            cost_usd=total_cost if total_cost > 0 else None,
            reasoning=analysis.get("reasoning", ""),
            metadata={
                "total_steps": analysis.get("total_steps", actual_steps),
                "redundant_steps": analysis.get("redundant_steps", 0),
                "failed_retries": analysis.get("failed_retries", 0),
                "unnecessary_steps": analysis.get("unnecessary_steps", 0),
                "issues": analysis.get("issues", []),
                "expected_steps": expected_steps,
                "used_llm_analysis": expected_steps is None,
            },
        )
