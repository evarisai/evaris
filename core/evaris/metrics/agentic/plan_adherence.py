"""Plan Adherence metric for agent evaluation.

This metric evaluates how well an agent followed its planned execution steps
by comparing the plan against the actual execution trace.

Evaluates:
- Step alignment (did the agent do what was planned?)
- Order adherence (did steps happen in the planned order?)
- Deviations (unplanned steps or skipped planned steps)
- Plan completion (were all planned steps executed?)
"""

import json
from typing import Any

from pydantic import BaseModel, Field

from evaris.core.protocols import BaseMetric
from evaris.core.types import MetricResult, TestCase
from evaris.providers.base import BaseLLMProvider
from evaris.providers.factory import get_provider


class PlanAdherenceConfig(BaseModel):
    """Configuration for plan adherence metric."""

    provider: str = Field(
        default="openrouter",
        description="LLM provider name",
    )
    model: str | None = Field(
        default=None,
        description="Model to use (uses provider default if not specified)",
    )
    threshold: float = Field(
        default=0.7,
        description="Minimum adherence score to pass (0.0-1.0)",
    )
    plan_key: str = Field(
        default="plan",
        description="Key in metadata containing the execution plan",
    )
    trace_key: str = Field(
        default="trace",
        description="Key in metadata containing the execution trace",
    )
    strict_order: bool = Field(
        default=False,
        description="Whether step order must exactly match the plan",
    )
    temperature: float = Field(
        default=0.0,
        description="LLM temperature for deterministic results",
    )


class PlanAdherenceMetric(BaseMetric):
    """Plan Adherence metric for agent evaluation.

    Measures how well an agent followed its planned execution by comparing
    the plan against actual execution trace using LLM-as-judge.

    Required metadata:
    - plan: The planned execution steps (list or dict)
    - trace: The actual execution trace (list of steps)

    Scoring:
    - 1.0: Perfect adherence, all planned steps executed in order
    - 0.7-0.9: Minor deviations or reordering
    - 0.4-0.6: Significant deviations
    - 0.1-0.3: Major deviations from plan
    - 0.0: Plan not followed at all

    Example:
        >>> metric = PlanAdherenceMetric()
        >>> test_case = TestCase(
        ...     input="Book a flight to NYC",
        ...     metadata={
        ...         "plan": [
        ...             {"step": 1, "action": "search_flights"},
        ...             {"step": 2, "action": "compare_prices"},
        ...             {"step": 3, "action": "book_flight"},
        ...         ],
        ...         "trace": [
        ...             {"action": "search_flights", "params": {"dest": "NYC"}},
        ...             {"action": "book_flight", "id": "FL123"},  # skipped compare
        ...         ]
        ...     }
        ... )
        >>> result = await metric.a_measure(test_case, "Flight booked")
    """

    threshold: float = 0.7

    def __init__(self, config: PlanAdherenceConfig | None = None):
        """Initialize plan adherence metric."""
        self.config = config or PlanAdherenceConfig()
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
        if not test_case.metadata:
            raise ValueError("Plan adherence metric requires metadata")
        if self.config.plan_key not in test_case.metadata:
            raise ValueError(f"Plan adherence metric requires '{self.config.plan_key}' in metadata")
        if self.config.trace_key not in test_case.metadata:
            raise ValueError(
                f"Plan adherence metric requires '{self.config.trace_key}' in metadata"
            )

    def _build_adherence_prompt(
        self,
        input_query: str,
        plan: list[dict[str, Any]] | dict[str, Any],
        trace: list[dict[str, Any]],
        actual_output: str,
    ) -> str:
        """Build prompt for LLM adherence analysis."""
        plan_str = json.dumps(plan, indent=2)
        trace_str = json.dumps(trace, indent=2)
        order_requirement = (
            "Steps MUST be executed in the exact order specified in the plan."
            if self.config.strict_order
            else "Steps should generally follow the planned order, but minor reordering is acceptable if logical."
        )

        return f"""Analyze how well an agent followed its execution plan.

Task: {input_query}

Execution Plan:
{plan_str}

Actual Execution Trace:
{trace_str}

Final Output: {actual_output}

Order Requirement: {order_requirement}

Analyze the execution and determine:
1. Which planned steps were executed correctly?
2. Which planned steps were skipped or incomplete?
3. Were there any unplanned steps (deviations)?
4. Did the execution order match the plan?
5. Was the overall goal achieved despite any deviations?

Respond with ONLY a JSON object:
{{"adherence_score": <float 0.0-1.0>, "planned_steps_total": <int>, "planned_steps_executed": <int>, "skipped_steps": [<step descriptions>], "unplanned_steps": [<step descriptions>], "order_violations": <int>, "goal_achieved": true/false, "reasoning": "explanation"}}

Scoring guidelines:
- 1.0: All planned steps executed in correct order, no unplanned steps
- 0.8-0.9: All key steps executed, minor reordering or small additions
- 0.6-0.7: Most steps executed but some skipped or significant additions
- 0.4-0.5: Plan partially followed, several deviations
- 0.2-0.3: Major deviations from plan
- 0.0-0.1: Plan was not followed at all

Your response:"""

    def _parse_adherence_analysis(self, response: str) -> dict[str, Any]:
        """Parse adherence analysis response."""
        try:
            content = response.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            data = json.loads(content)
            return {
                "adherence_score": float(data.get("adherence_score", 0.5)),
                "planned_steps_total": int(data.get("planned_steps_total", 0)),
                "planned_steps_executed": int(data.get("planned_steps_executed", 0)),
                "skipped_steps": data.get("skipped_steps", []),
                "unplanned_steps": data.get("unplanned_steps", []),
                "order_violations": int(data.get("order_violations", 0)),
                "goal_achieved": data.get("goal_achieved", False),
                "reasoning": data.get("reasoning", ""),
            }
        except (json.JSONDecodeError, ValueError, IndexError):
            return {
                "adherence_score": 0.5,
                "planned_steps_total": 0,
                "planned_steps_executed": 0,
                "skipped_steps": [],
                "unplanned_steps": [],
                "order_violations": 0,
                "goal_achieved": False,
                "reasoning": "Failed to parse analysis",
            }

    async def a_measure(
        self,
        test_case: TestCase,
        actual_output: Any,
    ) -> MetricResult:
        """Measure plan adherence.

        Args:
            test_case: Test case with plan and trace in metadata
            actual_output: Agent's final response

        Returns:
            MetricResult with adherence score and analysis
        """
        self.validate_inputs(test_case, actual_output)

        plan = test_case.metadata[self.config.plan_key]  # type: ignore
        trace = test_case.metadata[self.config.trace_key]  # type: ignore

        provider = self._get_provider()
        input_str = str(test_case.input) if test_case.input else ""
        output_str = str(actual_output)

        adherence_prompt = self._build_adherence_prompt(input_str, plan, trace, output_str)
        adherence_response = await provider.a_complete(adherence_prompt)

        input_tokens = adherence_response.usage.get("prompt_tokens", 0)
        output_tokens = adherence_response.usage.get("completion_tokens", 0)
        total_cost = adherence_response.cost_usd or 0.0

        analysis = self._parse_adherence_analysis(adherence_response.content)
        score = max(0.0, min(1.0, analysis["adherence_score"]))
        passed = score >= self.threshold

        # Build reasoning summary
        exec_ratio = f"{analysis['planned_steps_executed']}/{analysis['planned_steps_total']}"
        reasoning = (
            f"Plan adherence: {score:.2f}. "
            f"Executed {exec_ratio} planned steps. "
            f"{analysis['order_violations']} order violations. "
            f"Goal {'achieved' if analysis['goal_achieved'] else 'not achieved'}."
        )

        return MetricResult(
            name="plan_adherence",
            score=score,
            passed=passed,
            input_tokens=input_tokens if input_tokens > 0 else None,
            output_tokens=output_tokens if output_tokens > 0 else None,
            total_tokens=(input_tokens + output_tokens) if input_tokens > 0 else None,
            cost_usd=total_cost if total_cost > 0 else None,
            reasoning=reasoning,
            metadata={
                "planned_steps_total": analysis["planned_steps_total"],
                "planned_steps_executed": analysis["planned_steps_executed"],
                "skipped_steps": analysis["skipped_steps"],
                "unplanned_steps": analysis["unplanned_steps"],
                "order_violations": analysis["order_violations"],
                "goal_achieved": analysis["goal_achieved"],
                "strict_order": self.config.strict_order,
                "detailed_reasoning": analysis["reasoning"],
            },
        )
