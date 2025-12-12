"""Metric categories for simplified evaluation setup.

This module provides predefined metric bundles that users can reference by name,
making it easier to set up comprehensive evaluations without importing individual metrics.

Usage:
    from evaris import evaluate

    # Use predefined categories
    result = evaluate(
        name="my-eval",
        task=agent,
        data=test_cases,
        categories=["rag", "safety"],  # Predefined bundles
        metrics=[custom_metric],        # Additional custom metrics
    )
"""

import warnings
from typing import Any

from evaris.core.types import Golden, TestCase

# Metric name -> factory function mapping
# This serves as the central registry for all metrics
METRIC_REGISTRY: dict[str, tuple[type, type | None]] = {}


def _register_metrics() -> None:
    """Register all built-in metrics in the registry.

    This is called lazily to avoid circular imports.
    """
    if METRIC_REGISTRY:
        return  # Already registered

    # Import metrics here to avoid circular imports
    from evaris.metrics import (
        AnswerRelevancyConfig,
        AnswerRelevancyMetric,
        ArenaGEvalConfig,
        ArenaGEvalMetric,
        BiasConfig,
        BiasMetric,
        BLEUConfig,
        # NLP metrics
        BLEUMetric,
        ContextPrecisionConfig,
        ContextPrecisionMetric,
        ContextRecallConfig,
        ContextRecallMetric,
        ContextualRelevancyConfig,
        ContextualRelevancyMetric,
        ConversationalGEvalConfig,
        ConversationalGEvalMetric,
        ConversationCompletenessConfig,
        ConversationCompletenessMetric,
        ConversationRelevancyConfig,
        ConversationRelevancyMetric,
        DAGConfig,
        # Advanced metrics
        DAGMetric,
        # Core metrics
        ExactMatchMetric,
        FaithfulnessConfig,
        # RAG metrics
        FaithfulnessMetric,
        GEvalConfig,
        # Quality metrics
        GEvalMetric,
        HallucinationConfig,
        # Safety metrics
        HallucinationMetric,
        KnowledgeRetentionConfig,
        # Conversational metrics
        KnowledgeRetentionMetric,
        METEORConfig,
        METEORMetric,
        MisuseConfig,
        MisuseMetric,
        NonAdviceConfig,
        NonAdviceMetric,
        PIILeakageConfig,
        PIILeakageMetric,
        RAGASConfig,
        RAGASMetric,
        RoleAdherenceConfig,
        RoleAdherenceMetric,
        RoleViolationConfig,
        RoleViolationMetric,
        ROUGEConfig,
        ROUGEMetric,
        SemanticSimilarityConfig,
        SemanticSimilarityMetric,
        SummarizationConfig,
        SummarizationMetric,
        TaskCompletionConfig,
        TaskCompletionMetric,
        ToolCorrectnessConfig,
        # Agentic metrics
        ToolCorrectnessMetric,
        ToxicityConfig,
        ToxicityMetric,
    )
    from evaris.metrics.quality import JsonCorrectnessConfig, JsonCorrectnessMetric

    # Register all metrics: name -> (MetricClass, ConfigClass or None)
    METRIC_REGISTRY.update(
        {
            # RAG metrics
            "faithfulness": (FaithfulnessMetric, FaithfulnessConfig),
            "answer_relevancy": (AnswerRelevancyMetric, AnswerRelevancyConfig),
            "context_precision": (ContextPrecisionMetric, ContextPrecisionConfig),
            "context_recall": (ContextRecallMetric, ContextRecallConfig),
            "contextual_relevancy": (ContextualRelevancyMetric, ContextualRelevancyConfig),
            "ragas": (RAGASMetric, RAGASConfig),
            # Safety metrics
            "hallucination": (HallucinationMetric, HallucinationConfig),
            "toxicity": (ToxicityMetric, ToxicityConfig),
            "bias": (BiasMetric, BiasConfig),
            "pii_leakage": (PIILeakageMetric, PIILeakageConfig),
            "role_violation": (RoleViolationMetric, RoleViolationConfig),
            "non_advice": (NonAdviceMetric, NonAdviceConfig),
            "misuse": (MisuseMetric, MisuseConfig),
            # Quality metrics
            "g_eval": (GEvalMetric, GEvalConfig),
            "summarization": (SummarizationMetric, SummarizationConfig),
            "json_correctness": (JsonCorrectnessMetric, JsonCorrectnessConfig),
            # Agentic metrics
            "tool_correctness": (ToolCorrectnessMetric, ToolCorrectnessConfig),
            "task_completion": (TaskCompletionMetric, TaskCompletionConfig),
            # Conversational metrics
            "knowledge_retention": (KnowledgeRetentionMetric, KnowledgeRetentionConfig),
            "role_adherence": (RoleAdherenceMetric, RoleAdherenceConfig),
            "conversation_completeness": (
                ConversationCompletenessMetric,
                ConversationCompletenessConfig,
            ),
            "conversation_relevancy": (ConversationRelevancyMetric, ConversationRelevancyConfig),
            # Core metrics
            "exact_match": (ExactMatchMetric, None),
            "semantic_similarity": (SemanticSimilarityMetric, SemanticSimilarityConfig),
            # NLP metrics
            "bleu": (BLEUMetric, BLEUConfig),
            "rouge": (ROUGEMetric, ROUGEConfig),
            "meteor": (METEORMetric, METEORConfig),
            # Advanced metrics
            "dag": (DAGMetric, DAGConfig),
            "conversational_g_eval": (ConversationalGEvalMetric, ConversationalGEvalConfig),
            "arena_g_eval": (ArenaGEvalMetric, ArenaGEvalConfig),
        }
    )


# Metadata requirements for each metric
METRIC_METADATA_REQUIREMENTS: dict[str, list[str]] = {
    "faithfulness": ["context"],
    "context_precision": ["context"],
    "context_recall": ["context"],
    "contextual_relevancy": ["context"],
    "ragas": ["context"],
    "tool_correctness": ["tools_called", "expected_tools"],
    "role_violation": [],  # Optional: system_prompt
    "hallucination": [],  # Optional: context
}


# Category definitions: category_name -> list of metric names
METRIC_CATEGORIES: dict[str, list[str]] = {
    # Default category - always included unless disabled
    "default": [
        "task_completion",
        "hallucination",
    ],
    # RAG (Retrieval-Augmented Generation) metrics
    "rag": [
        "faithfulness",
        "answer_relevancy",
        "context_precision",
        "context_recall",
    ],
    # Basic safety metrics
    "safety": [
        "hallucination",
        "toxicity",
        "bias",
        "pii_leakage",
    ],
    # Comprehensive safety (all safety metrics)
    "strict_safety": [
        "hallucination",
        "toxicity",
        "bias",
        "pii_leakage",
        "role_violation",
        "non_advice",
        "misuse",
    ],
    # Agentic/tool-using agent metrics
    "agentic": [
        "tool_correctness",
        "task_completion",
    ],
    # Conversational/chatbot metrics
    "conversational": [
        "conversation_relevancy",
        "role_adherence",
        "knowledge_retention",
        "conversation_completeness",
    ],
    # Quality metrics
    "quality": [
        "summarization",
    ],
    # NLP metrics (deterministic)
    "nlp": [
        "bleu",
        "rouge",
        "meteor",
    ],
    # Minimal evaluation (fastest)
    "minimal": [
        "exact_match",
    ],
}


def get_metric_instance(name: str, config: Any | None = None) -> Any:
    """Get a metric instance by name.

    Args:
        name: Metric name (e.g., "faithfulness", "hallucination")
        config: Optional configuration for the metric

    Returns:
        Metric instance

    Raises:
        ValueError: If metric name is not recognized
    """
    _register_metrics()

    if name not in METRIC_REGISTRY:
        available = ", ".join(sorted(METRIC_REGISTRY.keys()))
        raise ValueError(f"Unknown metric '{name}'. Available metrics: {available}")

    metric_class, config_class = METRIC_REGISTRY[name]

    if config is not None:
        return metric_class(config=config)
    elif config_class is not None:
        return metric_class()
    else:
        return metric_class()


def get_available_metrics() -> list[str]:
    """Get list of all available metric names."""
    _register_metrics()
    return sorted(METRIC_REGISTRY.keys())


def get_available_categories() -> list[str]:
    """Get list of all available category names."""
    return sorted(METRIC_CATEGORIES.keys())


def get_category_metrics(category: str) -> list[str]:
    """Get metric names for a category.

    Args:
        category: Category name

    Returns:
        List of metric names in the category

    Raises:
        ValueError: If category is not recognized
    """
    if category not in METRIC_CATEGORIES:
        available = ", ".join(sorted(METRIC_CATEGORIES.keys()))
        raise ValueError(f"Unknown category '{category}'. Available categories: {available}")

    return METRIC_CATEGORIES[category].copy()


def resolve_categories_to_metrics(
    categories: list[str] | None = None,
    metrics: list[str | Any] | None = None,
    include_default: bool = True,
) -> list[Any]:
    """Resolve categories and metrics into a deduplicated list of metric instances.

    Args:
        categories: List of category names to include
        metrics: List of metric names or instances to include
        include_default: Whether to include "default" category automatically

    Returns:
        List of metric instances (deduplicated)

    Raises:
        ValueError: If category or metric name is not recognized
    """
    _register_metrics()

    metric_names: set[str] = set()
    metric_instances: list[Any] = []
    seen_types: set[type] = set()

    # Add default category unless disabled
    if include_default and (categories is None or "default" not in (categories or [])):
        for name in METRIC_CATEGORIES["default"]:
            metric_names.add(name)

    # Add metrics from categories
    if categories:
        for category in categories:
            if category == "none":
                # Special category to disable default
                metric_names.clear()
                continue

            if category not in METRIC_CATEGORIES:
                available = ", ".join(sorted(METRIC_CATEGORIES.keys()))
                raise ValueError(f"Unknown category '{category}'. Available: {available}")

            for name in METRIC_CATEGORIES[category]:
                metric_names.add(name)

    # Process individual metrics
    if metrics:
        for item in metrics:
            if isinstance(item, str):
                # String name - add to names set
                metric_names.add(item)
            else:
                # Already a metric instance - add directly
                metric_type = type(item)
                if metric_type not in seen_types:
                    metric_instances.append(item)
                    seen_types.add(metric_type)

    # Create instances for metric names
    for name in sorted(metric_names):  # Sort for deterministic order
        instance = get_metric_instance(name)
        metric_type = type(instance)
        if metric_type not in seen_types:
            metric_instances.append(instance)
            seen_types.add(metric_type)

    return metric_instances


def validate_metrics_for_data(
    metrics: list[Any],
    data: list[dict[str, Any] | TestCase | Golden],
) -> tuple[list[Any], list[str]]:
    """Validate metrics against data and warn about missing metadata.

    Checks if the data contains required metadata for each metric.
    Returns metrics that can run and warnings for those that will be skipped.

    Args:
        metrics: List of metric instances
        data: Dataset to validate against

    Returns:
        Tuple of (runnable_metrics, warnings)
    """
    if not data:
        return metrics, []

    # Sample first item to check metadata
    first_item = data[0]
    if isinstance(first_item, (TestCase, Golden)):
        available_keys = set(first_item.metadata.keys()) if first_item.metadata else set()
    elif isinstance(first_item, dict):
        metadata = first_item.get("metadata", {})
        available_keys = set(metadata.keys()) if metadata else set()
    else:
        available_keys = set()

    runnable_metrics: list[Any] = []
    warning_messages: list[str] = []

    for metric in metrics:
        metric_name = type(metric).__name__

        # Check if metric has required metadata keys
        required_keys: list[str] = []
        if hasattr(metric, "get_required_metadata_keys"):
            required_keys = metric.get_required_metadata_keys()
        elif hasattr(metric, "required_metadata_keys"):
            required_keys = metric.required_metadata_keys

        missing_keys = [k for k in required_keys if k not in available_keys]

        if missing_keys:
            warning_messages.append(
                f"Metric '{metric_name}' requires {missing_keys} in metadata but only "
                f"{list(available_keys) or 'none'} available. This metric will be skipped."
            )
        else:
            runnable_metrics.append(metric)

    # Emit warnings
    if warning_messages:
        warnings.warn(
            "\n".join(["Some metrics will be skipped due to missing metadata:"] + warning_messages),
            UserWarning,
            stacklevel=3,
        )

    return runnable_metrics, warning_messages


def describe_category(category: str) -> str:
    """Get a description of what a category evaluates.

    Args:
        category: Category name

    Returns:
        Human-readable description
    """
    descriptions = {
        "default": "Baseline evaluation: task completion and hallucination detection",
        "rag": "RAG evaluation: faithfulness, relevancy, and context quality",
        "safety": "Safety evaluation: hallucination, toxicity, bias, PII leakage",
        "strict_safety": "Comprehensive safety: all safety metrics plus role violation",
        "agentic": "Agent evaluation: tool usage and task completion",
        "conversational": "Conversation evaluation: relevancy, role adherence, knowledge retention",
        "quality": "Quality evaluation: summarization quality",
        "nlp": "NLP evaluation: BLEU, ROUGE, METEOR scores",
        "minimal": "Minimal evaluation: exact match only (fastest)",
    }
    return descriptions.get(
        category,
        f"Category '{category}' contains: {', '.join(METRIC_CATEGORIES.get(category, []))}",
    )
