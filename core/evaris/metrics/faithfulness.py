"""Faithfulness metric for RAG evaluation.

This metric evaluates whether the agent's output is factually consistent with the
provided context. It checks if the answer can be derived *solely* from the context,
detecting hallucinations.
"""

import json
import re
from typing import Any

from pydantic import BaseModel, Field

from evaris.core.protocols import BaseMetric
from evaris.core.types import MetricResult, MissingRequirementError, TestCase
from evaris.providers.base import BaseLLMProvider
from evaris.providers.factory import get_provider


class FaithfulnessConfig(BaseModel):
    """Configuration for faithfulness metric."""

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
        description="Score threshold for passing (0.0-1.0)",
    )
    context_key: str = Field(
        default="context",
        description="Key in test_case.metadata containing the context",
    )
    temperature: float = Field(
        default=0.0,
        description="LLM temperature for deterministic results",
    )


class FaithfulnessMetric(BaseMetric):
    """Faithfulness metric for RAG evaluation.

    Measures if the generated answer is faithful to the retrieved context.
    High score means the answer is supported by the context.
    Low score means the answer contains hallucinations or information not in context.

    This metric is referenceless - it requires context but not expected output.

    Algorithm:
    1. Extract claims from the actual output
    2. Check each claim against the provided context
    3. Calculate: supported_claims / total_claims

    ABC Compliance:
    - O.c.1: Uses LLM-as-a-judge for semantic verification
    - O.c.2: Detects hallucinations (unsupported claims)
    """

    threshold: float = 0.7

    def __init__(self, config: FaithfulnessConfig | None = None):
        """Initialize faithfulness metric.

        Args:
            config: Configuration for faithfulness. If None, uses defaults.
        """
        self.config = config or FaithfulnessConfig()
        self.threshold = self.config.threshold
        self._provider: BaseLLMProvider | None = None

    def get_required_metadata_keys(self) -> list[str]:
        """Get the list of required metadata keys for faithfulness metric.

        Returns:
            List containing the configured context_key
        """
        return [self.config.context_key]

    def _get_provider(self) -> BaseLLMProvider:
        """Get or create the LLM provider."""
        if self._provider is None:
            self._provider = get_provider(
                provider=self.config.provider,
                model=self.config.model,
                temperature=self.config.temperature,
            )
        return self._provider

    def _get_context(self, test_case: TestCase) -> Any:
        """Extract context from test case metadata.

        Args:
            test_case: Test case

        Returns:
            Context value

        Raises:
            MissingRequirementError: If context is missing
        """
        context_key = self.config.context_key
        context = test_case.metadata.get(context_key)
        if context is None:
            raise MissingRequirementError(
                metric_name=self.name,
                missing_keys=[context_key],
                available_keys=list(test_case.metadata.keys()),
            )
        return context

    def _build_faithfulness_prompt(self, context: Any, actual_output: Any) -> str:
        """Build the faithfulness evaluation prompt.

        Args:
            context: Retrieved context
            actual_output: Agent's actual output

        Returns:
            Formatted evaluation prompt
        """
        context_str = context if isinstance(context, str) else str(context)

        return f"""You are an expert evaluator for RAG (Retrieval-Augmented Generation) systems.
Your task is to evaluate the FAITHFULNESS of the Response to the provided Context.

Context:
{context_str}

Response:
{actual_output}

Evaluate if the Response is faithful to the Context.
- The response must be derived SOLELY from the provided Context.
- Any claim not supported by the Context is a hallucination.
- If the response uses outside knowledge not present in the Context, it is not faithful.
- If the response contradicts the Context, it is not faithful.

Respond with ONLY a JSON object in this exact format:
{{"score": <float between 0.0 and 1.0>, "reasoning": "<brief explanation>", "unsupported_claims": ["<list any claims not supported by context>"]}}

Score Guidelines:
- 1.0: All claims in the response are fully supported by the Context.
- 0.7-0.9: Most claims are supported with minor unsupported inferences.
- 0.4-0.6: Mix of supported and unsupported claims.
- 0.1-0.3: Mostly unsupported or fabricated.
- 0.0: The response contradicts the Context or contains entirely unsupported claims.

Your response:"""

    def _parse_response(self, response: str) -> tuple[float, str, list[str]]:
        """Parse LLM response to extract score, reasoning, and unsupported claims.

        Args:
            response: Raw LLM response

        Returns:
            Tuple of (score, reasoning, unsupported_claims)
        """
        try:
            data = json.loads(response.strip())
            score = float(data.get("score", 0.0))
            reasoning = str(data.get("reasoning", ""))
            unsupported = list(data.get("unsupported_claims", []))
            return score, reasoning, unsupported
        except (json.JSONDecodeError, ValueError):
            # Fallback to regex extraction
            score_match = re.search(r"score[:\s]+([0-9]+\.?[0-9]*)", response, re.IGNORECASE)
            if not score_match:
                return 0.0, f"Failed to parse response: {response}", []

            try:
                return float(score_match.group(1)), response, []
            except ValueError:
                return 0.0, f"Failed to parse response: {response}", []

    async def a_measure(
        self,
        test_case: TestCase,
        actual_output: Any,
    ) -> MetricResult:
        """Measure faithfulness of output to context.

        Args:
            test_case: Test case with context in metadata
            actual_output: Generated response

        Returns:
            MetricResult with faithfulness score
        """
        context = self._get_context(test_case)
        provider = self._get_provider()

        prompt = self._build_faithfulness_prompt(context, actual_output)
        response = await provider.a_complete(prompt)

        score, reasoning, unsupported_claims = self._parse_response(response.content)
        score = max(0.0, min(1.0, score))
        passed = score >= self.threshold

        return MetricResult(
            name="faithfulness",
            score=score,
            passed=passed,
            status="passed" if passed else "failed",
            reasoning=reasoning,
            metadata={
                "unsupported_claims": unsupported_claims,
                "context_length": len(str(context)),
                "provider": self.config.provider,
                "model": self.config.model or "default",
            },
        )
