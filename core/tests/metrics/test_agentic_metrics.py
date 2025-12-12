"""Tests for Agentic evaluation metrics.

This module tests:
- ToolCorrectnessMetric: Evaluates if agent used correct tools
- TaskCompletionMetric: Evaluates if agent completed the task
- StepEfficiencyMetric: Evaluates execution efficiency vs optimal steps
- PlanAdherenceMetric: Evaluates how well agent followed its plan

Following TDD: tests written before implementation.
"""

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from evaris.types import TestCase


class TestToolCorrectnessMetric:
    """Tests for ToolCorrectnessMetric.

    Formula: Number of Correctly Used Tools / Total Tools Called
    Required inputs: input, actual_output, tools_called, expected_tools
    """

    def test_config_defaults(self) -> None:
        """Test default configuration values."""
        from evaris.metrics.agentic import ToolCorrectnessConfig

        config = ToolCorrectnessConfig()
        assert config.threshold == 0.5
        assert config.tools_called_key == "tools_called"
        assert config.expected_tools_key == "expected_tools"

    def test_metric_name(self) -> None:
        """Test metric has correct name."""
        from evaris.metrics.agentic import ToolCorrectnessMetric

        metric = ToolCorrectnessMetric()
        assert metric.name == "ToolCorrectnessMetric"

    def test_validate_inputs_missing_tools_called(self) -> None:
        """Test validation fails when tools_called is missing."""
        from evaris.metrics.agentic import ToolCorrectnessMetric

        metric = ToolCorrectnessMetric()
        test_case = TestCase(
            input="Get the weather", expected=None, metadata={"expected_tools": ["get_weather"]}
        )

        with pytest.raises(ValueError, match="tools_called"):
            metric.validate_inputs(test_case, "some output")

    def test_validate_inputs_missing_expected_tools(self) -> None:
        """Test validation fails when expected_tools is missing."""
        from evaris.metrics.agentic import ToolCorrectnessMetric

        metric = ToolCorrectnessMetric()
        test_case = TestCase(
            input="Get the weather", expected=None, metadata={"tools_called": ["get_weather"]}
        )

        with pytest.raises(ValueError, match="expected_tools"):
            metric.validate_inputs(test_case, "some output")

    def test_calculate_correctness_perfect_match(self) -> None:
        """Test correctness calculation with perfect tool match."""
        from evaris.metrics.agentic import ToolCorrectnessMetric

        metric = ToolCorrectnessMetric()
        tools_called = ["get_weather", "send_notification"]
        expected_tools = ["get_weather", "send_notification"]

        score = metric._calculate_correctness(tools_called, expected_tools)

        assert score == 1.0

    def test_calculate_correctness_partial_match(self) -> None:
        """Test correctness calculation with partial tool match."""
        from evaris.metrics.agentic import ToolCorrectnessMetric

        metric = ToolCorrectnessMetric()
        tools_called = ["get_weather", "wrong_tool"]
        expected_tools = ["get_weather", "send_notification"]

        score = metric._calculate_correctness(tools_called, expected_tools)

        assert score == 0.5  # 1 correct out of 2 called

    def test_calculate_correctness_no_match(self) -> None:
        """Test correctness calculation with no tool match."""
        from evaris.metrics.agentic import ToolCorrectnessMetric

        metric = ToolCorrectnessMetric()
        tools_called = ["wrong_tool1", "wrong_tool2"]
        expected_tools = ["get_weather", "send_notification"]

        score = metric._calculate_correctness(tools_called, expected_tools)

        assert score == 0.0

    def test_calculate_correctness_no_tools_called(self) -> None:
        """Test correctness calculation when no tools were called."""
        from evaris.metrics.agentic import ToolCorrectnessMetric

        metric = ToolCorrectnessMetric()
        tools_called = []
        expected_tools = ["get_weather"]

        score = metric._calculate_correctness(tools_called, expected_tools)

        assert score == 0.0  # No tools called is failure

    @pytest.mark.asyncio
    async def test_measure_perfect_tool_usage(self) -> None:
        """Test scoring with perfect tool usage."""
        from evaris.metrics.agentic import ToolCorrectnessMetric

        metric = ToolCorrectnessMetric()
        test_case = TestCase(
            input="What's the weather in NYC?",
            expected=None,
            metadata={"tools_called": ["get_weather"], "expected_tools": ["get_weather"]},
        )

        result = await metric.a_measure(test_case, "The weather in NYC is sunny.")

        assert result.score == 1.0
        assert result.passed is True

    @pytest.mark.asyncio
    async def test_measure_wrong_tool_usage(self) -> None:
        """Test scoring with incorrect tool usage."""
        from evaris.metrics.agentic import ToolCorrectnessMetric

        metric = ToolCorrectnessMetric()
        test_case = TestCase(
            input="What's the weather in NYC?",
            expected=None,
            metadata={
                "tools_called": ["send_email"],  # Wrong tool
                "expected_tools": ["get_weather"],
            },
        )

        result = await metric.a_measure(test_case, "Email sent.")

        assert result.score == 0.0
        assert result.passed is False


class TestTaskCompletionMetric:
    """Tests for TaskCompletionMetric.

    Evaluates how well the agent completed its intended task.
    Required inputs: input, actual_output, task description (optional)
    """

    def test_config_defaults(self) -> None:
        """Test default configuration values."""
        from evaris.metrics.agentic import TaskCompletionConfig

        config = TaskCompletionConfig()
        assert config.threshold == 0.5
        assert config.task_key == "task"

    def test_metric_name(self) -> None:
        """Test metric has correct name."""
        from evaris.metrics.agentic import TaskCompletionMetric

        metric = TaskCompletionMetric()
        assert metric.name == "TaskCompletionMetric"

    def test_validate_inputs_missing_output(self) -> None:
        """Test validation fails when actual_output is missing."""
        from evaris.metrics.agentic import TaskCompletionMetric

        metric = TaskCompletionMetric()
        test_case = TestCase(input="Do something", expected=None)

        with pytest.raises(ValueError, match="actual_output"):
            metric.validate_inputs(test_case, None)

    @pytest.mark.asyncio
    @patch("evaris.metrics.agentic.task_completion.get_provider")
    async def test_measure_task_completed(self, mock_get_provider: Any) -> None:
        """Test scoring when task is successfully completed."""
        from evaris.metrics.agentic import TaskCompletionMetric

        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(
            return_value=MagicMock(
                content='{"score": 0.9, "task_completed": true, "reasoning": "The agent successfully retrieved the weather information for NYC as requested."}'
            )
        )
        mock_get_provider.return_value = mock_provider

        metric = TaskCompletionMetric()
        test_case = TestCase(
            input="What's the weather in NYC?",
            expected=None,
            metadata={"task": "Get weather information for a location"},
        )

        result = await metric.a_measure(test_case, "The weather in NYC is 72F and sunny.")

        assert result.score == 0.9
        assert result.passed is True
        assert result.metadata["task_completed"] is True

    @pytest.mark.asyncio
    @patch("evaris.metrics.agentic.task_completion.get_provider")
    async def test_measure_task_not_completed(self, mock_get_provider: Any) -> None:
        """Test scoring when task is not completed."""
        from evaris.metrics.agentic import TaskCompletionMetric

        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(
            return_value=MagicMock(
                content='{"score": 0.2, "task_completed": false, "reasoning": "The agent failed to provide weather information and instead gave an unrelated response."}'
            )
        )
        mock_get_provider.return_value = mock_provider

        metric = TaskCompletionMetric()
        test_case = TestCase(
            input="What's the weather in NYC?",
            expected=None,
        )

        result = await metric.a_measure(test_case, "I cannot help with that.")

        assert result.score == 0.2
        assert result.passed is False
        assert result.metadata["task_completed"] is False

    @pytest.mark.asyncio
    @patch("evaris.metrics.agentic.task_completion.get_provider")
    async def test_measure_with_trace_data(self, mock_get_provider: Any) -> None:
        """Test scoring with agent trace data in metadata."""
        from evaris.metrics.agentic import TaskCompletionMetric

        mock_provider = MagicMock()
        mock_provider.a_complete = AsyncMock(
            return_value=MagicMock(
                content='{"score": 1.0, "task_completed": true, "reasoning": "Task fully completed with all required steps executed."}'
            )
        )
        mock_get_provider.return_value = mock_provider

        metric = TaskCompletionMetric()
        test_case = TestCase(
            input="Book a flight to NYC",
            expected=None,
            metadata={
                "task": "Book a flight",
                "trace": [
                    {"step": "search_flights", "status": "success"},
                    {"step": "select_flight", "status": "success"},
                    {"step": "book_flight", "status": "success"},
                ],
            },
        )

        result = await metric.a_measure(test_case, "Flight booked successfully!")

        assert result.score == 1.0
        assert result.passed is True


class TestStepEfficiencyMetric:
    """Tests for StepEfficiencyMetric.

    Measures how efficiently an agent completed its task by analyzing
    the execution trace for redundant or unnecessary steps.
    """

    def test_config_defaults(self) -> None:
        """Test default configuration values."""
        from evaris.metrics.agentic import StepEfficiencyConfig

        config = StepEfficiencyConfig()
        assert config.threshold == 0.5
        assert config.trace_key == "trace"
        assert config.expected_steps_key == "expected_steps"
        assert config.max_acceptable_ratio == 2.0
        assert config.temperature == 0.0

    def test_metric_initialization(self) -> None:
        """Test metric initializes correctly."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        metric = StepEfficiencyMetric()
        assert metric.threshold == 0.5

    def test_metric_with_custom_config(self) -> None:
        """Test metric with custom configuration."""
        from evaris.metrics.agentic import StepEfficiencyConfig, StepEfficiencyMetric

        config = StepEfficiencyConfig(threshold=0.7, max_acceptable_ratio=3.0)
        metric = StepEfficiencyMetric(config=config)
        assert metric.threshold == 0.7
        assert metric.config.max_acceptable_ratio == 3.0

    def test_validate_inputs_missing_trace(self) -> None:
        """Test validation fails when trace is missing."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        metric = StepEfficiencyMetric()
        test_case = TestCase(input="Search for weather", metadata={})

        with pytest.raises(ValueError, match="trace"):
            metric.validate_inputs(test_case, "Weather is sunny")

    def test_validate_inputs_empty_metadata(self) -> None:
        """Test validation fails when metadata is empty."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        metric = StepEfficiencyMetric()
        test_case = TestCase(input="Search for weather", metadata={})

        with pytest.raises(ValueError, match="trace"):
            metric.validate_inputs(test_case, "Weather is sunny")

    def test_ratio_score_optimal(self) -> None:
        """Test ratio score when actual equals expected steps."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        metric = StepEfficiencyMetric()
        score = metric._calculate_ratio_score(3, 3)
        assert score == 1.0

    def test_ratio_score_under_expected(self) -> None:
        """Test ratio score when actual is less than expected."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        metric = StepEfficiencyMetric()
        score = metric._calculate_ratio_score(2, 3)
        assert score == 1.0

    def test_ratio_score_over_expected(self) -> None:
        """Test ratio score when actual exceeds expected."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        metric = StepEfficiencyMetric()
        score = metric._calculate_ratio_score(4, 2)  # ratio = 2.0
        assert score == 0.0  # At max_acceptable_ratio

    def test_ratio_score_partial(self) -> None:
        """Test ratio score with partial inefficiency."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        metric = StepEfficiencyMetric()
        score = metric._calculate_ratio_score(3, 2)  # ratio = 1.5
        assert 0.0 < score < 1.0

    @pytest.mark.asyncio
    async def test_measure_with_expected_steps_optimal(self) -> None:
        """Test scoring when actual matches expected steps."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        metric = StepEfficiencyMetric()
        test_case = TestCase(
            input="Search for weather",
            metadata={
                "trace": [
                    {"action": "search", "query": "weather NYC"},
                    {"action": "parse_result"},
                ],
                "expected_steps": 2,
            },
        )

        result = await metric.a_measure(test_case, "Weather is sunny")

        assert result.score == 1.0
        assert result.passed is True
        assert result.metadata["total_steps"] == 2
        assert result.metadata["expected_steps"] == 2
        assert result.metadata["used_llm_analysis"] is False

    @pytest.mark.asyncio
    async def test_measure_with_expected_steps_inefficient(self) -> None:
        """Test scoring when actual exceeds expected steps."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        metric = StepEfficiencyMetric()
        test_case = TestCase(
            input="Search for weather",
            metadata={
                "trace": [
                    {"action": "search", "query": "weather NYC"},
                    {"action": "search", "query": "NYC weather"},  # redundant
                    {"action": "search", "query": "weather in New York"},  # redundant
                    {"action": "parse_result"},
                ],
                "expected_steps": 2,
            },
        )

        result = await metric.a_measure(test_case, "Weather is sunny")

        assert result.score < 1.0
        assert result.metadata["total_steps"] == 4
        assert result.metadata["redundant_steps"] == 2
        assert result.metadata["used_llm_analysis"] is False

    @pytest.mark.asyncio
    @patch("evaris.metrics.agentic.step_efficiency.get_provider")
    async def test_measure_with_llm_analysis(self, mock_get_provider: Any) -> None:
        """Test LLM-based efficiency analysis when no expected_steps."""
        from evaris.metrics.agentic import StepEfficiencyMetric

        mock_provider = MagicMock()
        mock_response = MagicMock()
        mock_response.content = """{
            "total_steps": 3,
            "redundant_steps": 1,
            "failed_retries": 0,
            "unnecessary_steps": 0,
            "efficiency_score": 0.75,
            "issues": ["Redundant search query"],
            "reasoning": "Minor redundancy detected"
        }"""
        mock_response.usage = {"prompt_tokens": 100, "completion_tokens": 50}
        mock_response.cost_usd = 0.001
        mock_provider.a_complete = AsyncMock(return_value=mock_response)
        mock_get_provider.return_value = mock_provider

        metric = StepEfficiencyMetric()
        test_case = TestCase(
            input="Search for weather",
            metadata={
                "trace": [
                    {"action": "search", "query": "weather NYC"},
                    {"action": "search", "query": "NYC weather"},
                    {"action": "parse_result"},
                ],
            },
        )

        result = await metric.a_measure(test_case, "Weather is sunny")

        assert result.score == 0.75
        assert result.passed is True
        assert result.metadata["used_llm_analysis"] is True
        assert result.metadata["redundant_steps"] == 1
        assert result.input_tokens == 100
        assert result.output_tokens == 50
        assert result.cost_usd == 0.001


class TestPlanAdherenceMetric:
    """Tests for PlanAdherenceMetric.

    Measures how well an agent followed its planned execution by comparing
    the plan against actual execution trace.
    """

    def test_config_defaults(self) -> None:
        """Test default configuration values."""
        from evaris.metrics.agentic import PlanAdherenceConfig

        config = PlanAdherenceConfig()
        assert config.threshold == 0.7
        assert config.plan_key == "plan"
        assert config.trace_key == "trace"
        assert config.strict_order is False
        assert config.temperature == 0.0

    def test_metric_initialization(self) -> None:
        """Test metric initializes correctly."""
        from evaris.metrics.agentic import PlanAdherenceMetric

        metric = PlanAdherenceMetric()
        assert metric.threshold == 0.7

    def test_metric_with_custom_config(self) -> None:
        """Test metric with custom configuration."""
        from evaris.metrics.agentic import PlanAdherenceConfig, PlanAdherenceMetric

        config = PlanAdherenceConfig(threshold=0.8, strict_order=True)
        metric = PlanAdherenceMetric(config=config)
        assert metric.threshold == 0.8
        assert metric.config.strict_order is True

    def test_validate_inputs_missing_plan(self) -> None:
        """Test validation fails when plan is missing."""
        from evaris.metrics.agentic import PlanAdherenceMetric

        metric = PlanAdherenceMetric()
        test_case = TestCase(
            input="Book a flight",
            metadata={"trace": [{"action": "search"}]},
        )

        with pytest.raises(ValueError, match="plan"):
            metric.validate_inputs(test_case, "Flight booked")

    def test_validate_inputs_missing_trace(self) -> None:
        """Test validation fails when trace is missing."""
        from evaris.metrics.agentic import PlanAdherenceMetric

        metric = PlanAdherenceMetric()
        test_case = TestCase(
            input="Book a flight",
            metadata={"plan": [{"step": 1, "action": "search"}]},
        )

        with pytest.raises(ValueError, match="trace"):
            metric.validate_inputs(test_case, "Flight booked")

    def test_validate_inputs_empty_metadata(self) -> None:
        """Test validation fails when metadata is empty (missing required keys)."""
        from evaris.metrics.agentic import PlanAdherenceMetric

        metric = PlanAdherenceMetric()
        test_case = TestCase(input="Book a flight", metadata={})

        with pytest.raises(ValueError, match="metadata"):
            metric.validate_inputs(test_case, "Flight booked")

    @pytest.mark.asyncio
    @patch("evaris.metrics.agentic.plan_adherence.get_provider")
    async def test_measure_perfect_adherence(self, mock_get_provider: Any) -> None:
        """Test scoring when execution perfectly follows plan."""
        from evaris.metrics.agentic import PlanAdherenceMetric

        mock_provider = MagicMock()
        mock_response = MagicMock()
        mock_response.content = """{
            "adherence_score": 1.0,
            "planned_steps_total": 3,
            "planned_steps_executed": 3,
            "skipped_steps": [],
            "unplanned_steps": [],
            "order_violations": 0,
            "goal_achieved": true,
            "reasoning": "All planned steps executed in correct order"
        }"""
        mock_response.usage = {"prompt_tokens": 150, "completion_tokens": 60}
        mock_response.cost_usd = 0.002
        mock_provider.a_complete = AsyncMock(return_value=mock_response)
        mock_get_provider.return_value = mock_provider

        metric = PlanAdherenceMetric()
        test_case = TestCase(
            input="Book a flight to NYC",
            metadata={
                "plan": [
                    {"step": 1, "action": "search_flights"},
                    {"step": 2, "action": "compare_prices"},
                    {"step": 3, "action": "book_flight"},
                ],
                "trace": [
                    {"action": "search_flights", "dest": "NYC"},
                    {"action": "compare_prices", "count": 5},
                    {"action": "book_flight", "id": "FL123"},
                ],
            },
        )

        result = await metric.a_measure(test_case, "Flight booked")

        assert result.score == 1.0
        assert result.passed is True
        assert result.metadata["planned_steps_total"] == 3
        assert result.metadata["planned_steps_executed"] == 3
        assert result.metadata["goal_achieved"] is True
        assert result.input_tokens == 150
        assert result.cost_usd == 0.002

    @pytest.mark.asyncio
    @patch("evaris.metrics.agentic.plan_adherence.get_provider")
    async def test_measure_partial_adherence(self, mock_get_provider: Any) -> None:
        """Test scoring when execution partially follows plan."""
        from evaris.metrics.agentic import PlanAdherenceMetric

        mock_provider = MagicMock()
        mock_response = MagicMock()
        mock_response.content = """{
            "adherence_score": 0.6,
            "planned_steps_total": 3,
            "planned_steps_executed": 2,
            "skipped_steps": ["compare_prices"],
            "unplanned_steps": [],
            "order_violations": 0,
            "goal_achieved": true,
            "reasoning": "Skipped price comparison step"
        }"""
        mock_response.usage = {"prompt_tokens": 150, "completion_tokens": 60}
        mock_response.cost_usd = 0.002
        mock_provider.a_complete = AsyncMock(return_value=mock_response)
        mock_get_provider.return_value = mock_provider

        metric = PlanAdherenceMetric()
        test_case = TestCase(
            input="Book a flight to NYC",
            metadata={
                "plan": [
                    {"step": 1, "action": "search_flights"},
                    {"step": 2, "action": "compare_prices"},
                    {"step": 3, "action": "book_flight"},
                ],
                "trace": [
                    {"action": "search_flights", "dest": "NYC"},
                    {"action": "book_flight", "id": "FL123"},  # Skipped compare
                ],
            },
        )

        result = await metric.a_measure(test_case, "Flight booked")

        assert result.score == 0.6
        assert result.passed is False  # Below 0.7 threshold
        assert result.metadata["skipped_steps"] == ["compare_prices"]
        assert result.metadata["planned_steps_executed"] == 2

    @pytest.mark.asyncio
    @patch("evaris.metrics.agentic.plan_adherence.get_provider")
    async def test_cost_tracking(self, mock_get_provider: Any) -> None:
        """Test that cost tracking fields are populated."""
        from evaris.metrics.agentic import PlanAdherenceMetric

        mock_provider = MagicMock()
        mock_response = MagicMock()
        mock_response.content = """{
            "adherence_score": 0.9,
            "planned_steps_total": 2,
            "planned_steps_executed": 2,
            "skipped_steps": [],
            "unplanned_steps": [],
            "order_violations": 0,
            "goal_achieved": true,
            "reasoning": "Good adherence"
        }"""
        mock_response.usage = {"prompt_tokens": 200, "completion_tokens": 80}
        mock_response.cost_usd = 0.003
        mock_provider.a_complete = AsyncMock(return_value=mock_response)
        mock_get_provider.return_value = mock_provider

        metric = PlanAdherenceMetric()
        test_case = TestCase(
            input="Book a flight",
            metadata={
                "plan": [{"action": "search"}, {"action": "book"}],
                "trace": [{"action": "search"}, {"action": "book"}],
            },
        )

        result = await metric.a_measure(test_case, "Done")

        assert result.input_tokens == 200
        assert result.output_tokens == 80
        assert result.total_tokens == 280
        assert result.cost_usd == 0.003


class TestAgenticMetricsIntegration:
    """Integration tests for Agentic metrics."""

    def test_all_agentic_metrics_importable(self) -> None:
        """Test all agentic metrics can be imported."""
        from evaris.metrics.agentic import (
            PlanAdherenceMetric,
            StepEfficiencyMetric,
            TaskCompletionMetric,
            ToolCorrectnessMetric,
        )

        assert ToolCorrectnessMetric is not None
        assert TaskCompletionMetric is not None
        assert StepEfficiencyMetric is not None
        assert PlanAdherenceMetric is not None

    def test_metrics_share_base_class(self) -> None:
        """Test all agentic metrics inherit from BaseMetric."""
        from evaris.core.protocols import BaseMetric
        from evaris.metrics.agentic import (
            PlanAdherenceMetric,
            StepEfficiencyMetric,
            TaskCompletionMetric,
            ToolCorrectnessMetric,
        )

        assert issubclass(ToolCorrectnessMetric, BaseMetric)
        assert issubclass(TaskCompletionMetric, BaseMetric)
        assert issubclass(StepEfficiencyMetric, BaseMetric)
        assert issubclass(PlanAdherenceMetric, BaseMetric)
