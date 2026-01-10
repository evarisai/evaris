"""E2E tests for Context Entity Recall metric.

These tests require running services (evaris-server) and are skipped by default.
Run with: pytest tests/e2e -v --e2e
"""

from datetime import UTC, datetime
from typing import Any

import pytest

pytestmark = pytest.mark.e2e


class TestContextEntityRecallE2E:

    @pytest.fixture
    def rag_test_cases(self) -> list[dict[str, Any]]:
        """Sample RAG test cases with retrieval context."""
        return [
            {
                "input": "Who founded Microsoft and when?",
                "expected": "Microsoft was founded by Bill Gates and Paul Allen in 1975.",
                "metadata": {
                    "retrieval_context": [
                        "Bill Gates and Paul Allen founded Microsoft Corporation in 1975.",
                        "The company started in Albuquerque, New Mexico.",
                    ]
                },
            },
            {
                "input": "What is the capital of France?",
                "expected": "Paris is the capital of France. It is located on the Seine River.",
                "metadata": {
                    "retrieval_context": [
                        "Paris is the capital and largest city of France.",
                        "The city is situated on the Seine River.",
                    ]
                },
            },
            {
                "input": "Who invented the telephone?",
                "expected": "Alexander Graham Bell invented the telephone in 1876.",
                "metadata": {
                    "retrieval_context": [
                        "Alexander Graham Bell was awarded the first patent for the telephone in 1876.",
                        "Bell was a Scottish-born inventor and scientist.",
                    ]
                },
            },
        ]

    def test_assess_sync_with_context_entity_recall(
        self,
        evaris_client: Any,
        rag_test_cases: list[dict[str, Any]],
        cleanup_assessments: list[str],
    ) -> None:
        """Test synchronous assessment with context_entity_recall metric."""
        from evaris import TestCase

        test_cases = [
            TestCase(
                input=tc["input"],
                expected=tc["expected"],
                actual_output=f"Response to: {tc['input']}",
                metadata=tc.get("metadata", {}),
            )
            for tc in rag_test_cases
        ]

        result = evaris_client.assess_sync(
            name=f"e2e-context-entity-recall-{datetime.now(UTC).isoformat()}",
            test_cases=test_cases,
            metrics=["context_entity_recall"],
            metadata={
                "test_type": "e2e",
                "metric": "context_entity_recall",
                "timestamp": datetime.now(UTC).isoformat(),
            },
        )

        cleanup_assessments.append(result.assessment_id)

        assert result.assessment_id is not None
        assert result.summary is not None
        assert result.summary.total == len(test_cases)
        assert len(result.results) == len(test_cases)

        for test_result in result.results:
            metric_names = [m.name for m in test_result.scores]
            assert "context_entity_recall" in metric_names

            cer_metric = next(m for m in test_result.scores if m.name == "context_entity_recall")
            assert 0.0 <= cer_metric.score <= 1.0
            assert isinstance(cer_metric.passed, bool)

    @pytest.mark.asyncio
    async def test_assess_async_with_context_entity_recall(
        self,
        async_evaris_client: Any,
        rag_test_cases: list[dict[str, Any]],
    ) -> None:
        """Test asynchronous assessment with context_entity_recall metric."""
        from evaris import TestCase

        test_cases = [
            TestCase(
                input=tc["input"],
                expected=tc["expected"],
                actual_output=f"Response to: {tc['input']}",
                metadata=tc.get("metadata", {}),
            )
            for tc in rag_test_cases[:1]
        ]

        result = await async_evaris_client.assess(
            name=f"e2e-async-context-entity-recall-{
                datetime.now(UTC).isoformat()}",
            test_cases=test_cases,
            metrics=["context_entity_recall"],
        )

        assert result.assessment_id is not None
        assert result.summary is not None
        assert result.summary.total == 1

    def test_assess_combined_rag_metrics(
        self,
        evaris_client: Any,
        rag_test_cases: list[dict[str, Any]],
        cleanup_assessments: list[str],
    ) -> None:
        """Test assessment with multiple RAG metrics including context_entity_recall."""
        from evaris import TestCase

        test_cases = [
            TestCase(
                input=rag_test_cases[0]["input"],
                expected=rag_test_cases[0]["expected"],
                actual_output="Bill Gates and Paul Allen started Microsoft in 1975.",
                metadata=rag_test_cases[0]["metadata"],
            )
        ]

        result = evaris_client.assess_sync(
            name=f"e2e-combined-rag-{datetime.now(UTC).isoformat()}",
            test_cases=test_cases,
            metrics=["context_entity_recall", "context_recall"],
            metadata={"test_type": "e2e_combined_rag"},
        )

        cleanup_assessments.append(result.assessment_id)

        assert result.summary is not None
        assert result.summary.total == 1
        metric_names = [m.name for m in result.results[0].scores]
        assert "context_entity_recall" in metric_names
        assert "context_recall" in metric_names

    @pytest.mark.asyncio
    async def test_context_entity_recall_with_ragas(self) -> None:
        """Test RAGAS composite with context_entity_recall enabled.

        This test uses local evaluate_async() because RAGASMetric with custom
        configuration requires passing a metric instance, not a string name.
        The server-side assess() API only accepts metric names as strings.
        """
        from evaris import evaluate_async
        from evaris.metrics import RAGASConfig, RAGASMetric

        def dummy_task(input: str) -> str:
            return "Microsoft was founded by Bill Gates and Paul Allen."

        ragas_config = RAGASConfig(include_context_entity_recall=True)
        ragas_metric = RAGASMetric(config=ragas_config)

        result = await evaluate_async(
            name="e2e-ragas-with-entity-recall",
            task=dummy_task,
            data=[
                {
                    "input": "Who founded Microsoft?",
                    "expected": "Bill Gates and Paul Allen founded Microsoft.",
                    "metadata": {
                        "retrieval_context": [
                            "Bill Gates and Paul Allen started Microsoft in 1975.",
                        ],
                        "context": "Bill Gates and Paul Allen started Microsoft in 1975.",
                    },
                }
            ],
            metrics=[ragas_metric],
        )

        assert result.total == 1
        assert len(result.results) == 1

        test_result = result.results[0]
        ragas_result = next(m for m in test_result.metrics if m.name == "ragas")
        assert ragas_result.metadata is not None
        assert "component_scores" in ragas_result.metadata
        assert "context_entity_recall" in ragas_result.metadata["component_scores"]

    def test_metadata_structure_e2e(
        self,
        evaris_client: Any,
        cleanup_assessments: list[str],
    ) -> None:
        """Test that E2E result contains expected metadata structure."""
        from evaris import TestCase

        test_case = TestCase(
            input="Test input",
            expected="Test expected with Entity1 and Entity2",
            actual_output="Test output",
            metadata={
                "retrieval_context": [
                    "Context mentioning Entity1.",
                    "Another context with Entity2.",
                ]
            },
        )

        result = evaris_client.assess_sync(
            name=f"e2e-metadata-test-{datetime.now(UTC).isoformat()}",
            test_cases=[test_case],
            metrics=["context_entity_recall"],
        )

        cleanup_assessments.append(result.assessment_id)

        cer_metric = result.results[0].scores[0]

        expected_metadata_keys = [
            "entities",
            "verdicts",
            "total_entities",
            "found_entities",
        ]

        for key in expected_metadata_keys:
            assert key in cer_metric.metadata, f"Missing metadata key: {key}"
