"""RAG (Retrieval-Augmented Generation) evaluation metrics.

This module provides metrics for evaluating RAG pipelines:
- AnswerRelevancyMetric: Measures if answer addresses the input query
- ContextPrecisionMetric: Measures if relevant contexts rank higher
- ContextRecallMetric: Measures if all relevant info was retrieved
- ContextEntityRecallMetric: Measures if entities from expected answer are in context
- ContextualRelevancyMetric: Measures if retrieved context is relevant to query
- RAGASMetric: Composite metric combining all RAG metrics
"""

from evaris.metrics.rag.answer_relevancy import (
    AnswerRelevancyConfig,
    AnswerRelevancyMetric,
)
from evaris.metrics.rag.context_entity_recall import (
    ContextEntityRecallConfig,
    ContextEntityRecallMetric,
)
from evaris.metrics.rag.context_precision import (
    ContextPrecisionConfig,
    ContextPrecisionMetric,
)
from evaris.metrics.rag.context_recall import (
    ContextRecallConfig,
    ContextRecallMetric,
)
from evaris.metrics.rag.contextual_relevancy import (
    ContextualRelevancyConfig,
    ContextualRelevancyMetric,
)
from evaris.metrics.rag.ragas import (
    RAGASConfig,
    RAGASMetric,
)

__all__ = [
    "AnswerRelevancyMetric",
    "AnswerRelevancyConfig",
    "ContextEntityRecallMetric",
    "ContextEntityRecallConfig",
    "ContextPrecisionMetric",
    "ContextPrecisionConfig",
    "ContextRecallMetric",
    "ContextRecallConfig",
    "ContextualRelevancyMetric",
    "ContextualRelevancyConfig",
    "RAGASMetric",
    "RAGASConfig",
]
