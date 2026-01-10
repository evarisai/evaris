"""Tests for Context Entity Recall metric."""

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from evaris.metrics.rag.context_entity_recall import (
    ContextEntityRecallConfig,
    ContextEntityRecallMetric,
)
from evaris.types import TestCase


class TestContextEntityRecallConfig:
    """Tests for ContextEntityRecallConfig."""

    def test_default_config(self) -> None:
        """Test default configuration values."""
        config = ContextEntityRecallConfig()

        assert config.provider == "openrouter"
        assert config.model is None
        assert config.threshold == 0.5
        assert config.context_key == "retrieval_context"
        assert config.temperature == 0.0

    def test_custom_config(self) -> None:
        """Test custom configuration values."""
        config = ContextEntityRecallConfig(
            provider="anthropic",
            model="claude-3-haiku",
            threshold=0.8,
            context_key="custom_context",
            temperature=0.1,
        )

        assert config.provider == "anthropic"
        assert config.model == "claude-3-haiku"
        assert config.threshold == 0.8
        assert config.context_key == "custom_context"
        assert config.temperature == 0.1

    def test_threshold_validation(self) -> None:
        """Test threshold value constraints."""
        with pytest.raises(ValueError):
            ContextEntityRecallConfig(threshold=-0.1)

        with pytest.raises(ValueError):
            ContextEntityRecallConfig(threshold=1.5)


class TestContextEntityRecallMetric:
    """Tests for ContextEntityRecallMetric."""

    @pytest.fixture
    def metric(self) -> ContextEntityRecallMetric:
        """Create metric instance for testing."""
        return ContextEntityRecallMetric()

    @pytest.fixture
    def sample_test_case(self) -> TestCase:
        """Create sample test case."""
        return TestCase(
            input="Who founded Microsoft?",
            expected="Microsoft was founded by Bill Gates and Paul Allen in 1975",
            metadata={
                "retrieval_context": [
                    "Bill Gates and Paul Allen founded Microsoft in Albuquerque, New Mexico.",
                    "The company was established in 1975 and later moved to Seattle.",
                ]
            },
        )

    def test_metric_initialization(self, metric: ContextEntityRecallMetric) -> None:
        """Test metric initializes correctly."""
        assert metric.config is not None
        assert metric.threshold == 0.5
        assert metric._provider is None

    def test_metric_initialization_with_custom_config(self) -> None:
        """Test metric with custom config."""
        config = ContextEntityRecallConfig(threshold=0.7)
        metric = ContextEntityRecallMetric(config)
        assert metric.threshold == 0.7

    def test_get_required_metadata_keys(self, metric: ContextEntityRecallMetric) -> None:
        """Test required metadata keys."""
        keys = metric.get_required_metadata_keys()
        assert keys == ["retrieval_context"]

    def test_validate_inputs_missing_input(self, metric: ContextEntityRecallMetric) -> None:
        """Test validation fails when input is missing."""
        test_case = TestCase(
            input=None,
            expected="Some expected output",
            metadata={"retrieval_context": ["context"]},
        )

        with pytest.raises(ValueError, match="input"):
            metric.validate_inputs(test_case, "output")

    def test_validate_inputs_missing_expected(self, metric: ContextEntityRecallMetric) -> None:
        """Test validation fails when expected is missing."""
        test_case = TestCase(
            input="What is the capital?",
            expected=None,
            metadata={"retrieval_context": ["context"]},
        )

        with pytest.raises(ValueError, match="expected"):
            metric.validate_inputs(test_case, "output")

    def test_validate_inputs_missing_context(self, metric: ContextEntityRecallMetric) -> None:
        """Test validation fails when context is missing."""
        test_case = TestCase(
            input="What is the capital?",
            expected="Paris",
            metadata={},
        )

        with pytest.raises(ValueError, match="retrieval_context"):
            metric.validate_inputs(test_case, "output")

    def test_validate_inputs_empty_context(self, metric: ContextEntityRecallMetric) -> None:
        """Test validation fails when context is empty."""
        test_case = TestCase(
            input="What is the capital?",
            expected="Paris",
            metadata={"retrieval_context": []},
        )

        with pytest.raises(ValueError, match="non-empty list"):
            metric.validate_inputs(test_case, "output")

    def test_validate_inputs_success(
        self, metric: ContextEntityRecallMetric, sample_test_case: TestCase
    ) -> None:
        """Test validation passes with valid inputs."""
        metric.validate_inputs(sample_test_case, "output")

    @pytest.mark.asyncio
    @patch("evaris.metrics.rag.context_entity_recall.get_provider")
    async def test_measure_full_recall(
        self, mock_get_provider: Any, sample_test_case: TestCase
    ) -> None:
        """Test measurement when all entities are found."""
        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(
            side_effect=[
                MagicMock(
                    content='{"entities": ["Microsoft", "Bill Gates", "Paul Allen", "1975"]}'
                ),
                MagicMock(
                    content="""{
                        "verdicts": [
                            {"entity": "Microsoft", "found": true, "evidence": "Microsoft in Albuquerque"},
                            {"entity": "Bill Gates", "found": true, "evidence": "Bill Gates and Paul Allen"},
                            {"entity": "Paul Allen", "found": true, "evidence": "Bill Gates and Paul Allen"},
                            {"entity": "1975", "found": true, "evidence": "established in 1975"}
                        ]
                    }"""
                ),
            ]
        )
        mock_get_provider.return_value = mock_provider

        metric = ContextEntityRecallMetric()
        result = await metric.a_measure(sample_test_case, "Bill Gates founded Microsoft")

        assert result.name == "context_entity_recall"
        assert result.score == 1.0
        assert result.passed is True
        assert result.metadata["total_entities"] == 4
        assert result.metadata["found_entities"] == 4

    @pytest.mark.asyncio
    @patch("evaris.metrics.rag.context_entity_recall.get_provider")
    async def test_measure_partial_recall(
        self, mock_get_provider: Any, sample_test_case: TestCase
    ) -> None:
        """Test measurement when some entities are found."""
        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(
            side_effect=[
                MagicMock(content='{"entities": ["Microsoft", "Bill Gates", "Seattle", "2020"]}'),
                MagicMock(
                    content="""{
                        "verdicts": [
                            {"entity": "Microsoft", "found": true, "evidence": "Microsoft in Albuquerque"},
                            {"entity": "Bill Gates", "found": true, "evidence": "Bill Gates and Paul Allen"},
                            {"entity": "Seattle", "found": true, "evidence": "moved to Seattle"},
                            {"entity": "2020", "found": false, "evidence": null}
                        ]
                    }"""
                ),
            ]
        )
        mock_get_provider.return_value = mock_provider

        metric = ContextEntityRecallMetric()
        result = await metric.a_measure(sample_test_case, "output")

        assert result.score == 0.75
        assert result.passed is True
        assert result.metadata["total_entities"] == 4
        assert result.metadata["found_entities"] == 3
        assert "2020" in result.metadata["missing_entities"]

    @pytest.mark.asyncio
    @patch("evaris.metrics.rag.context_entity_recall.get_provider")
    async def test_measure_no_recall(
        self, mock_get_provider: Any, sample_test_case: TestCase
    ) -> None:
        """Test measurement when no entities are found."""
        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(
            side_effect=[
                MagicMock(content='{"entities": ["Apple", "Steve Jobs", "2007"]}'),
                MagicMock(
                    content="""{
                        "verdicts": [
                            {"entity": "Apple", "found": false, "evidence": null},
                            {"entity": "Steve Jobs", "found": false, "evidence": null},
                            {"entity": "2007", "found": false, "evidence": null}
                        ]
                    }"""
                ),
            ]
        )
        mock_get_provider.return_value = mock_provider

        metric = ContextEntityRecallMetric()
        result = await metric.a_measure(sample_test_case, "output")

        assert result.score == 0.0
        assert result.passed is False
        assert result.metadata["total_entities"] == 3
        assert result.metadata["found_entities"] == 0

    @pytest.mark.asyncio
    @patch("evaris.metrics.rag.context_entity_recall.get_provider")
    async def test_measure_no_entities_extracted(
        self, mock_get_provider: Any, sample_test_case: TestCase
    ) -> None:
        """Test measurement when no entities are extracted from expected."""
        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(return_value=MagicMock(content='{"entities": []}'))
        mock_get_provider.return_value = mock_provider

        metric = ContextEntityRecallMetric()
        result = await metric.a_measure(sample_test_case, "output")

        assert result.score == 1.0
        assert result.passed is True
        assert result.metadata["total_entities"] == 0
        assert "No entities extracted" in result.metadata.get("reason", "")

    @pytest.mark.asyncio
    @patch("evaris.metrics.rag.context_entity_recall.get_provider")
    async def test_measure_invalid_json_extraction(
        self, mock_get_provider: Any, sample_test_case: TestCase
    ) -> None:
        """Test handling of invalid JSON from extraction."""
        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(return_value=MagicMock(content="not valid json"))
        mock_get_provider.return_value = mock_provider

        metric = ContextEntityRecallMetric()
        result = await metric.a_measure(sample_test_case, "output")

        assert result.score == 1.0
        assert result.metadata["total_entities"] == 0

    @pytest.mark.asyncio
    @patch("evaris.metrics.rag.context_entity_recall.get_provider")
    async def test_measure_invalid_json_verification(
        self, mock_get_provider: Any, sample_test_case: TestCase
    ) -> None:
        """Test handling of invalid JSON from verification."""
        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(
            side_effect=[
                MagicMock(content='{"entities": ["Microsoft"]}'),
                MagicMock(content="not valid json"),
            ]
        )
        mock_get_provider.return_value = mock_provider

        metric = ContextEntityRecallMetric()
        result = await metric.a_measure(sample_test_case, "output")

        assert result.score == 0.0
        assert result.metadata["verdicts"] == []

    @pytest.mark.asyncio
    @patch("evaris.metrics.rag.context_entity_recall.get_provider")
    async def test_metadata_contains_entities(
        self, mock_get_provider: Any, sample_test_case: TestCase
    ) -> None:
        """Test that metadata contains all expected fields."""
        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(
            side_effect=[
                MagicMock(content='{"entities": ["Microsoft", "Bill Gates"]}'),
                MagicMock(
                    content="""{
                        "verdicts": [
                            {"entity": "Microsoft", "found": true, "evidence": "found"},
                            {"entity": "Bill Gates", "found": false, "evidence": null}
                        ]
                    }"""
                ),
            ]
        )
        mock_get_provider.return_value = mock_provider

        metric = ContextEntityRecallMetric()
        result = await metric.a_measure(sample_test_case, "output")

        assert "entities" in result.metadata
        assert "verdicts" in result.metadata
        assert "total_entities" in result.metadata
        assert "found_entities" in result.metadata
        assert "missing_entities" in result.metadata
        assert "found_entity_names" in result.metadata
        assert "context_count" in result.metadata

        assert result.metadata["entities"] == ["Microsoft", "Bill Gates"]
        assert result.metadata["missing_entities"] == ["Bill Gates"]
        assert result.metadata["found_entity_names"] == ["Microsoft"]
        assert result.metadata["context_count"] == 2

    @pytest.mark.asyncio
    @patch("evaris.metrics.rag.context_entity_recall.get_provider")
    async def test_custom_threshold(self, mock_get_provider: Any) -> None:
        """Test that custom threshold affects pass/fail."""
        test_case = TestCase(
            input="Question",
            expected="Answer with Entity1 and Entity2",
            metadata={"retrieval_context": ["Some context"]},
        )

        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(
            side_effect=[
                MagicMock(content='{"entities": ["Entity1", "Entity2"]}'),
                MagicMock(
                    content="""{
                        "verdicts": [
                            {"entity": "Entity1", "found": true, "evidence": "found"},
                            {"entity": "Entity2", "found": false, "evidence": null}
                        ]
                    }"""
                ),
            ]
        )
        mock_get_provider.return_value = mock_provider

        config = ContextEntityRecallConfig(threshold=0.6)
        metric = ContextEntityRecallMetric(config)
        result = await metric.a_measure(test_case, "output")

        assert result.score == 0.5
        assert result.passed is False

    def test_build_extraction_prompt(self, metric: ContextEntityRecallMetric) -> None:
        """Test extraction prompt building."""
        prompt = metric._build_extraction_prompt("Bill Gates founded Microsoft in 1975")

        assert "Bill Gates" in prompt
        assert "Microsoft" in prompt
        assert "1975" in prompt
        assert "entities" in prompt
        assert "JSON" in prompt

    def test_build_verification_prompt(self, metric: ContextEntityRecallMetric) -> None:
        """Test verification prompt building."""
        entities = ["Microsoft", "Bill Gates"]
        contexts = ["Context chunk 1", "Context chunk 2"]

        prompt = metric._build_verification_prompt(entities, contexts)

        assert "Microsoft" in prompt
        assert "Bill Gates" in prompt
        assert "Context chunk 1" in prompt
        assert "Context chunk 2" in prompt
        assert "verdicts" in prompt

    def test_parse_entities_valid(self, metric: ContextEntityRecallMetric) -> None:
        """Test parsing valid entity response."""
        response = '{"entities": ["Microsoft", "Bill Gates", "1975"]}'
        entities = metric._parse_entities(response)

        assert entities == ["Microsoft", "Bill Gates", "1975"]

    def test_parse_entities_invalid(self, metric: ContextEntityRecallMetric) -> None:
        """Test parsing invalid entity response."""
        response = "not valid json"
        entities = metric._parse_entities(response)

        assert entities == []

    def test_parse_verdicts_valid(self, metric: ContextEntityRecallMetric) -> None:
        """Test parsing valid verdict response."""
        response = '{"verdicts": [{"entity": "Microsoft", "found": true}]}'
        verdicts = metric._parse_verdicts(response)

        assert len(verdicts) == 1
        assert verdicts[0]["entity"] == "Microsoft"
        assert verdicts[0]["found"] is True

    def test_parse_verdicts_invalid(self, metric: ContextEntityRecallMetric) -> None:
        """Test parsing invalid verdict response."""
        response = "not valid json"
        verdicts = metric._parse_verdicts(response)

        assert verdicts == []

    def test_calculate_score_empty(self, metric: ContextEntityRecallMetric) -> None:
        """Test score calculation with empty verdicts."""
        score = metric._calculate_score([])
        assert score == 0.0

    def test_calculate_score_all_found(self, metric: ContextEntityRecallMetric) -> None:
        """Test score calculation when all entities found."""
        verdicts = [
            {"entity": "A", "found": True},
            {"entity": "B", "found": True},
        ]
        score = metric._calculate_score(verdicts)
        assert score == 1.0

    def test_calculate_score_none_found(self, metric: ContextEntityRecallMetric) -> None:
        """Test score calculation when no entities found."""
        verdicts = [
            {"entity": "A", "found": False},
            {"entity": "B", "found": False},
        ]
        score = metric._calculate_score(verdicts)
        assert score == 0.0

    def test_calculate_score_partial(self, metric: ContextEntityRecallMetric) -> None:
        """Test score calculation with partial match."""
        verdicts = [
            {"entity": "A", "found": True},
            {"entity": "B", "found": False},
            {"entity": "C", "found": True},
            {"entity": "D", "found": False},
        ]
        score = metric._calculate_score(verdicts)
        assert score == 0.5


class TestContextEntityRecallRegistration:
    """Tests for metric registration."""

    def test_metric_is_registered(self) -> None:
        """Test that metric is registered in the global registry."""
        from evaris.core.registry import get_metric_registry

        registry = get_metric_registry()
        assert registry.is_registered("context_entity_recall")

    def test_metric_can_be_resolved(self) -> None:
        """Test that metric can be resolved by name."""
        from evaris.core.registry import resolve_metric

        metric = resolve_metric("context_entity_recall")
        assert isinstance(metric, ContextEntityRecallMetric)
