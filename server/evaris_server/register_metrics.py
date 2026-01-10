"""Register all default metrics with the metric registry.

This module is imported at server startup to populate the registry with
all available metrics. Metrics can then be referenced by name in evaluate calls.

Available metrics:
- answer_relevancy: RAG answer relevance
- faithfulness: Factual consistency
- correctness: Answer correctness (exact or semantic)
- context_relevance: Context-to-query relevance
- hallucination: Hallucination detection
- exact_match: Exact string matching
- semantic_similarity: Embedding-based similarity
- llm_judge: Custom LLM-based evaluation
"""

from evaris.core.registry import get_metric_registry
from evaris.metrics import (
    AnswerRelevancyMetric,
    BiasMetric,
    BLEUMetric,
    ContextEntityRecallMetric,
    ContextPrecisionMetric,
    ContextRecallMetric,
    ContextRelevanceMetric,
    ContextualRelevancyMetric,
    ExactMatchMetric,
    FaithfulnessMetric,
    GEvalMetric,
    HallucinationMetric,
    JsonCorrectnessMetric,
    LLMJudgeMetric,
    METEORMetric,
    PIILeakageMetric,
    ROUGEMetric,
    SemanticSimilarityMetric,
    SummarizationMetric,
    TaskCompletionMetric,
    ToolCorrectnessMetric,
    ToxicityMetric,
)


def register_all_metrics() -> None:
    """Register all default metrics with the registry."""
    registry = get_metric_registry()

    metrics_to_register = {
        "exact_match": ExactMatchMetric,
        "semantic_similarity": SemanticSimilarityMetric,
        "llm_judge": LLMJudgeMetric,
        "faithfulness": FaithfulnessMetric,
        "context_relevance": ContextRelevanceMetric,
        "answer_relevancy": AnswerRelevancyMetric,
        "context_precision": ContextPrecisionMetric,
        "context_recall": ContextRecallMetric,
        "context_entity_recall": ContextEntityRecallMetric,
        "contextual_relevancy": ContextualRelevancyMetric,
        "hallucination": HallucinationMetric,
        "bias": BiasMetric,
        "toxicity": ToxicityMetric,
        "pii_leakage": PIILeakageMetric,
        "tool_correctness": ToolCorrectnessMetric,
        "task_completion": TaskCompletionMetric,
        "g_eval": GEvalMetric,
        "json_correctness": JsonCorrectnessMetric,
        "summarization": SummarizationMetric,
        "bleu": BLEUMetric,
        "rouge": ROUGEMetric,
        "meteor": METEORMetric,
        # Aliases for common usage
        "correctness": ExactMatchMetric,
    }

    for name, metric_class in metrics_to_register.items():
        try:
            registry.register(name, metric_class, overwrite=True)
        except Exception as e:
            print(f"Warning: Failed to register metric '{name}': {e}")

    print(f"  Metrics registered: {len(registry.list_metrics())}")
