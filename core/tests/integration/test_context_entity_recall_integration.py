"""Integration tests for Context Entity Recall metric with real LLM calls.

These tests require the OPENROUTER_API_KEY environment variable to be set.
They are skipped automatically if the API key is not available.
"""

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

from evaris.metrics.rag.context_entity_recall import (
    ContextEntityRecallConfig,
    ContextEntityRecallMetric,
)
from evaris.types import TestCase

env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_AVAILABLE = OPENROUTER_API_KEY is not None


@pytest.mark.skipif(not OPENROUTER_AVAILABLE, reason="OPENROUTER_API_KEY not set")
class TestContextEntityRecallIntegration:
    """Integration tests with real LLM calls."""

    @pytest.fixture
    def metric(self) -> ContextEntityRecallMetric:
        """Create metric instance with real provider."""
        return ContextEntityRecallMetric()

    @pytest.fixture
    def full_recall_test_case(self) -> TestCase:
        """Test case where all entities should be found."""
        return TestCase(
            input="Who founded Microsoft and when?",
            expected="Microsoft was founded by Bill Gates and Paul Allen in 1975 in Albuquerque, New Mexico.",
            metadata={
                "retrieval_context": [
                    "Bill Gates and Paul Allen founded Microsoft Corporation in 1975.",
                    "The company was originally based in Albuquerque, New Mexico before moving to Seattle.",
                    "Microsoft has grown to become one of the largest technology companies in the world.",
                ]
            },
        )

    @pytest.fixture
    def partial_recall_test_case(self) -> TestCase:
        """Test case where some entities should be missing."""
        return TestCase(
            input="Tell me about the iPhone launch",
            expected="Steve Jobs unveiled the iPhone at Macworld 2007 in San Francisco on January 9, 2007.",
            metadata={
                "retrieval_context": [
                    "Apple introduced the iPhone in 2007.",
                    "Steve Jobs was the CEO of Apple at the time.",
                ]
            },
        )

    @pytest.fixture
    def no_recall_test_case(self) -> TestCase:
        """Test case where no entities should be found."""
        return TestCase(
            input="What is Python?",
            expected="Python was created by Guido van Rossum and released in 1991.",
            metadata={
                "retrieval_context": [
                    "JavaScript is a programming language commonly used for web development.",
                    "Java was developed by Sun Microsystems.",
                ]
            },
        )

    @pytest.mark.asyncio
    async def test_real_entity_extraction_full_recall(
        self, metric: ContextEntityRecallMetric, full_recall_test_case: TestCase
    ) -> None:
        """Test real entity extraction with expected full recall."""
        result = await metric.a_measure(full_recall_test_case, "Some output")

        assert result.name == "context_entity_recall"
        assert 0.0 <= result.score <= 1.0
        assert result.metadata["total_entities"] > 0
        assert isinstance(result.metadata["entities"], list)
        assert isinstance(result.metadata["verdicts"], list)

        expected_entities = ["Microsoft", "Bill Gates", "Paul Allen", "1975"]
        found_any = any(entity in result.metadata["entities"] for entity in expected_entities)
        assert (
            found_any
        ), f"Expected to find some of {expected_entities}, got {result.metadata['entities']}"

    @pytest.mark.asyncio
    async def test_real_entity_extraction_partial_recall(
        self, metric: ContextEntityRecallMetric, partial_recall_test_case: TestCase
    ) -> None:
        """Test real entity extraction with expected partial recall."""
        result = await metric.a_measure(partial_recall_test_case, "Some output")

        assert result.name == "context_entity_recall"
        assert result.metadata["total_entities"] > 0
        assert result.metadata["found_entities"] < result.metadata["total_entities"]
        assert len(result.metadata["missing_entities"]) > 0

    @pytest.mark.asyncio
    async def test_real_entity_extraction_no_recall(
        self, metric: ContextEntityRecallMetric, no_recall_test_case: TestCase
    ) -> None:
        """Test real entity extraction with expected no recall."""
        result = await metric.a_measure(no_recall_test_case, "Some output")

        assert result.name == "context_entity_recall"
        assert result.score < 0.5

    @pytest.mark.asyncio
    async def test_result_structure(
        self, metric: ContextEntityRecallMetric, full_recall_test_case: TestCase
    ) -> None:
        """Test that result has expected structure."""
        result = await metric.a_measure(full_recall_test_case, "Some output")

        assert hasattr(result, "name")
        assert hasattr(result, "score")
        assert hasattr(result, "passed")
        assert hasattr(result, "metadata")

        assert "entities" in result.metadata
        assert "verdicts" in result.metadata
        assert "total_entities" in result.metadata
        assert "found_entities" in result.metadata
        assert "missing_entities" in result.metadata
        assert "context_count" in result.metadata

    @pytest.mark.asyncio
    async def test_custom_threshold(self, full_recall_test_case: TestCase) -> None:
        """Test that custom threshold affects pass/fail."""
        low_threshold_metric = ContextEntityRecallMetric(ContextEntityRecallConfig(threshold=0.3))
        high_threshold_metric = ContextEntityRecallMetric(ContextEntityRecallConfig(threshold=0.95))

        low_result = await low_threshold_metric.a_measure(full_recall_test_case, "output")
        high_result = await high_threshold_metric.a_measure(full_recall_test_case, "output")

        if low_result.score >= 0.3:
            assert low_result.passed is True
        if high_result.score < 0.95:
            assert high_result.passed is False

    @pytest.mark.asyncio
    async def test_entity_types_extracted(self, metric: ContextEntityRecallMetric) -> None:
        """Test that various entity types are extracted."""
        test_case = TestCase(
            input="Company info",
            expected=(
                "Apple Inc. was founded on April 1, 1976 by Steve Jobs. "
                "The company is worth over $3 trillion and is headquartered in Cupertino, California."
            ),
            metadata={
                "retrieval_context": [
                    "Apple Inc. was founded by Steve Jobs, Steve Wozniak, and Ronald Wayne on April 1, 1976.",
                    "The company is headquartered in Cupertino, California.",
                    "Apple has a market cap exceeding $3 trillion.",
                ]
            },
        )

        result = await metric.a_measure(test_case, "output")

        assert result.metadata["total_entities"] >= 3
        assert result.score >= 0.5


@pytest.mark.skipif(not OPENROUTER_AVAILABLE, reason="OPENROUTER_API_KEY not set")
class TestContextEntityRecallWithEvaluate:
    """Integration tests using the evaluate() function."""

    @pytest.mark.asyncio
    async def test_evaluate_with_context_entity_recall(self) -> None:
        """Test using context_entity_recall in evaluate_async()."""
        from evaris import evaluate_async

        def dummy_task(input: str) -> str:
            return f"Response to: {input}"

        result = await evaluate_async(
            name="context-entity-recall-integration-test",
            task=dummy_task,
            data=[
                {
                    "input": "Who founded Microsoft?",
                    "expected": "Bill Gates and Paul Allen founded Microsoft",
                    "metadata": {
                        "retrieval_context": [
                            "Bill Gates and Paul Allen started Microsoft in 1975."
                        ]
                    },
                }
            ],
            metrics=["context_entity_recall"],
        )

        assert result.total == 1
        assert len(result.results) == 1
        assert "context_entity_recall" in [m.name for m in result.results[0].metrics]
