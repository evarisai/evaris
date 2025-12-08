"""LLM Judge metric with tool calling support.

This module provides the LLM Judge metric which assesses agent outputs
using LLM-based judgment via OpenRouter. It supports three modes:

1. Standalone Mode (default): Direct LLM assessment
   >>> judge = LLMJudge(provider="openrouter")

2. Tool Mode: LLM can call tools to verify outputs
   >>> judge = LLMJudge(
   ...     provider="openrouter",
   ...     mode="tools",
   ...     tools=["code_executor", "web_search"]
   ... )

3. Meta Mode: LLM synthesizes judgment from other metrics' results
   >>> judge = LLMJudge(mode="meta")

Example usage:
    >>> from evaris.metrics.llm_judge import LLMJudge, JudgeConfig, JudgeMode
    >>> from evaris.types import TestCase
    >>>
    >>> judge = LLMJudge()
    >>> test_case = TestCase(input="What is 2+2?", expected="4")
    >>> result = await judge.a_measure(test_case, "The answer is 4")
"""

from evaris.metrics.llm_judge.judge import (
    JudgeConfig,
    JudgeMode,
    LLMJudge,
)
from evaris.metrics.llm_judge.prompts import (
    METRIC_PROMPTS,
    get_custom_prompt,
    get_metric_prompt,
)

LLMJudgeMetric = LLMJudge
LLMJudgeConfig = JudgeConfig

__all__ = [
    "LLMJudge",
    "LLMJudgeMetric",
    "JudgeConfig",
    "LLMJudgeConfig",
    "JudgeMode",
    "METRIC_PROMPTS",
    "get_metric_prompt",
    "get_custom_prompt",
]
