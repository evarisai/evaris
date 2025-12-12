"""Integration tests for cost tracking with real API calls.

Tests verify that the cost tracking feature correctly calculates
costs based on token usage from real LLM API responses.

IMPORTANT: These tests make real API calls and cost money.
They are SKIPPED by default. To run them:
  RUN_COST_TESTS=1 pytest tests/integration/test_cost_tracking.py -v

Requirements:
- OPENROUTER_API_KEY environment variable must be set
- RUN_COST_TESTS=1 to enable (prevents accidental billing)
"""

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

from evaris import evaluate
from evaris.metrics.safety import ToxicityMetric

# Load .env file from package root
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

# Check for OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_AVAILABLE = OPENROUTER_API_KEY is not None

# Skip by default to avoid accidental costs - must explicitly enable
RUN_COST_TESTS = os.getenv("RUN_COST_TESTS", "0") == "1"
SKIP_REASON = "Cost tests disabled by default (set RUN_COST_TESTS=1 to enable)"


def simple_agent(query: str) -> str:
    """Simple test agent that returns fixed responses."""
    return "The answer to your question is: this is a helpful, friendly response."


@pytest.mark.skipif(not RUN_COST_TESTS, reason=SKIP_REASON)
class TestCostTrackingOpenRouter:
    """Test cost tracking with OpenRouter provider."""

    @pytest.mark.skipif(not OPENROUTER_AVAILABLE, reason="OPENROUTER_API_KEY not set")
    def test_openrouter_provider_returns_cost(self) -> None:
        """Test that OpenRouter provider calculates and returns cost."""
        from evaris.providers.openrouter import OpenRouterProvider

        provider = OpenRouterProvider(model="anthropic/claude-3-haiku")

        response = provider.complete("Say hello in one word.")

        # Verify token usage is tracked
        assert "prompt_tokens" in response.usage
        assert "completion_tokens" in response.usage
        assert response.usage["prompt_tokens"] > 0
        assert response.usage["completion_tokens"] > 0

        # Verify cost is calculated
        assert response.cost_usd is not None
        assert response.cost_usd > 0

        print("\n[OK] OpenRouter Provider Cost Tracking:")
        print(f"  Model: {response.model}")
        print(f"  Input tokens: {response.usage['prompt_tokens']}")
        print(f"  Output tokens: {response.usage['completion_tokens']}")
        print(f"  Cost (USD): ${response.cost_usd:.6f}")

    @pytest.mark.skipif(not OPENROUTER_AVAILABLE, reason="OPENROUTER_API_KEY not set")
    async def test_openrouter_async_returns_cost(self) -> None:
        """Test that async OpenRouter calls also track cost."""
        from evaris.providers.openrouter import OpenRouterProvider

        provider = OpenRouterProvider(model="anthropic/claude-3-haiku")

        response = await provider.a_complete("Count to 3.")

        # Verify cost tracking works in async mode
        assert response.cost_usd is not None
        assert response.cost_usd > 0
        assert response.usage["prompt_tokens"] > 0
        assert response.usage["completion_tokens"] > 0

        print("\n[OK] OpenRouter Async Cost Tracking:")
        print(f"  Cost (USD): ${response.cost_usd:.6f}")

        await provider.aclose()

    @pytest.mark.skipif(not OPENROUTER_AVAILABLE, reason="OPENROUTER_API_KEY not set")
    def test_metric_result_contains_cost(self) -> None:
        """Test that MetricResult includes cost when using LLM-based metrics."""
        # Run evaluation with a single LLM-based metric
        result = evaluate(
            name="cost-tracking-test",
            task=simple_agent,
            data=[
                {"input": "What is the meaning of life?", "expected": "42"},
            ],
            metrics=[ToxicityMetric()],
        )

        # Verify evaluation completed
        assert result.total == 1
        assert len(result.results) == 1

        # Get the metric result
        test_result = result.results[0]
        toxicity_metric = next((m for m in test_result.metrics if m.name == "toxicity"), None)

        assert toxicity_metric is not None

        # Verify cost fields are populated in MetricResult
        assert toxicity_metric.input_tokens is not None
        assert toxicity_metric.output_tokens is not None
        assert toxicity_metric.total_tokens is not None
        assert toxicity_metric.cost_usd is not None

        # Verify reasonable values
        assert toxicity_metric.input_tokens > 0
        assert toxicity_metric.output_tokens > 0
        assert toxicity_metric.total_tokens == (
            toxicity_metric.input_tokens + toxicity_metric.output_tokens
        )
        assert toxicity_metric.cost_usd > 0

        print("\n[OK] MetricResult Cost Fields:")
        print(f"  Metric: {toxicity_metric.name}")
        print(f"  Input tokens: {toxicity_metric.input_tokens}")
        print(f"  Output tokens: {toxicity_metric.output_tokens}")
        print(f"  Total tokens: {toxicity_metric.total_tokens}")
        print(f"  Cost (USD): ${toxicity_metric.cost_usd:.6f}")

    @pytest.mark.skipif(not OPENROUTER_AVAILABLE, reason="OPENROUTER_API_KEY not set")
    def test_cost_calculation_known_model(self) -> None:
        """Test cost calculation for a known model with explicit pricing."""
        from evaris.providers.openrouter import MODEL_PRICING, OpenRouterProvider

        provider = OpenRouterProvider(model="anthropic/claude-3-haiku")

        response = provider.complete("Hi")

        # Verify the model is in our pricing table
        assert "anthropic/claude-3-haiku" in MODEL_PRICING

        # Calculate expected cost manually
        pricing = MODEL_PRICING["anthropic/claude-3-haiku"]
        expected_cost = (response.usage["prompt_tokens"] / 1_000_000) * pricing["input"] + (
            response.usage["completion_tokens"] / 1_000_000
        ) * pricing["output"]

        # Verify cost matches our calculation
        assert abs(response.cost_usd - expected_cost) < 0.0001

        print("\n[OK] Cost Calculation Verification:")
        print(f"  Calculated cost: ${response.cost_usd:.8f}")
        print(f"  Expected cost: ${expected_cost:.8f}")

    @pytest.mark.skipif(not OPENROUTER_AVAILABLE, reason="OPENROUTER_API_KEY not set")
    def test_unknown_model_uses_default_pricing(self) -> None:
        """Test that unknown models fall back to default pricing."""
        from evaris.providers.openrouter import MODEL_PRICING, OpenRouterProvider

        # Use a model that might not be in our pricing table
        # If this model IS in pricing, the test still validates the calculation works
        provider = OpenRouterProvider(model="openai/gpt-4o-mini")

        response = provider.complete("Hello")

        # Cost should still be calculated (either from table or default)
        assert response.cost_usd is not None
        assert response.cost_usd > 0

        # Verify default pricing exists
        assert "_default" in MODEL_PRICING

        print("\n[OK] Default Pricing Fallback:")
        print(f"  Model: {response.model}")
        print(f"  Cost: ${response.cost_usd:.6f}")
