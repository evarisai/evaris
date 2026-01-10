"""Context Entity Recall metric for RAG evaluation.

This metric evaluates retriever quality by checking if named entities from the
expected answer appear in the retrieved context. Unlike ContextRecall which
checks semantic coverage, this metric focuses on specific factual entities.

Formula: Number of Entities Found in Context / Total Entities in Expected Answer

Entity types extracted: Names, places, dates, numbers, organizations, etc.
"""

import json
from typing import Any

from pydantic import BaseModel, Field

from evaris.core.protocols import BaseMetric
from evaris.core.registry import register_metric
from evaris.core.types import MetricResult, TestCase
from evaris.providers.base import BaseLLMProvider
from evaris.providers.factory import get_provider


class ContextEntityRecallConfig(BaseModel):
    """Configuration for context entity recall metric."""

    provider: str = Field(
        default="openrouter",
        description="LLM provider name",
    )
    model: str | None = Field(
        default=None,
        description="Model to use (uses provider default if not specified)",
    )
    threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Score threshold for passing (0.0-1.0)",
    )
    context_key: str = Field(
        default="retrieval_context",
        description="Key in test_case.metadata containing the retrieval context",
    )
    temperature: float = Field(
        default=0.0,
        description="LLM temperature for deterministic results",
    )


@register_metric("context_entity_recall")
class ContextEntityRecallMetric(BaseMetric):
    """Context Entity Recall metric for RAG evaluation.

    Measures if the retrieval context contains all named entities mentioned
    in the expected answer. Higher recall means better entity coverage.

    This metric is complementary to ContextRecall:
    - ContextRecall: Checks if statements are attributable to context
    - ContextEntityRecall: Checks if specific entities are present in context

    Required inputs:
    - input: The user query
    - expected: The expected/reference answer (evaluated for entities)
    - retrieval_context: List of retrieved context chunks (in metadata)

    Algorithm:
    1. Extract named entities from expected_output (via LLM)
    2. Check if each entity appears in the retrieval_context (via LLM)
    3. Calculate: entities_found / total_entities

    Example:
        >>> metric = ContextEntityRecallMetric()
        >>> test_case = TestCase(
        ...     input="Who founded Microsoft?",
        ...     expected="Microsoft was founded by Bill Gates and Paul Allen in 1975",
        ...     metadata={"retrieval_context": ["Bill Gates and Paul Allen..."]}
        ... )
        >>> result = await metric.a_measure(test_case, "Bill Gates founded it")
        >>> # Entities: ["Microsoft", "Bill Gates", "Paul Allen", "1975"]
    """

    threshold: float = 0.5

    def __init__(self, config: ContextEntityRecallConfig | None = None):
        """Initialize context entity recall metric.

        Args:
            config: Configuration for the metric. If None, uses defaults.
        """
        self.config = config or ContextEntityRecallConfig()
        self.threshold = self.config.threshold
        self._provider: BaseLLMProvider | None = None

    def _get_provider(self) -> BaseLLMProvider:
        """Get or create the LLM provider."""
        if self._provider is None:
            self._provider = get_provider(
                provider=self.config.provider,
                model=self.config.model,
                temperature=self.config.temperature,
            )
        return self._provider

    def get_required_metadata_keys(self) -> list[str]:
        """Get the list of required metadata keys.

        Returns:
            List containing the configured context_key
        """
        return [self.config.context_key]

    def validate_inputs(self, test_case: TestCase, actual_output: Any) -> None:
        """Validate inputs for context entity recall.

        Args:
            test_case: Test case with input, expected, and retrieval_context
            actual_output: Generated response (not used in this metric)

        Raises:
            ValueError: If required inputs are missing
        """
        if not test_case.input:
            raise ValueError("Context entity recall metric requires 'input' in test case")

        if not test_case.expected:
            raise ValueError("Context entity recall metric requires 'expected' in test case")

        context_key = self.config.context_key
        if not test_case.metadata or context_key not in test_case.metadata:
            raise ValueError(
                f"Context entity recall metric requires '{context_key}' in test_case.metadata"
            )

        context = test_case.metadata[context_key]
        if not context or not isinstance(context, list):
            raise ValueError(f"'{context_key}' must be a non-empty list of context strings")

    def _build_extraction_prompt(self, text: str) -> str:
        """Build prompt to extract named entities from text.

        Args:
            text: The text to extract entities from

        Returns:
            Prompt for entity extraction
        """
        return f"""Extract all named entities from the following text.
Include: person names, organization names, locations, dates, numbers, product names, and other proper nouns.

Text:
{text}

Respond with ONLY a JSON object in this format:
{{"entities": ["entity1", "entity2", ...]}}

Important:
- Each entity should be a distinct named item
- Include full names (e.g., "Bill Gates" not just "Bill")
- Include dates in their original format (e.g., "1975", "January 15, 2020")
- Include numbers that represent specific values (e.g., "$50 billion", "3.14")
- If no entities found, return {{"entities": []}}

Your response:"""

    def _build_verification_prompt(
        self,
        entities: list[str],
        contexts: list[str],
    ) -> str:
        """Build prompt to verify entity presence in context.

        Args:
            entities: List of entities extracted from expected output
            contexts: List of retrieval context strings

        Returns:
            Prompt for entity verification
        """
        entities_json = json.dumps(entities)
        context_text = "\n---\n".join(contexts)

        return f"""For each entity, determine if it appears or is mentioned in the given context.
An entity is "found" if the context explicitly mentions it or contains equivalent information.

Context:
{context_text}

Entities to check:
{entities_json}

Respond with ONLY a JSON object in this format:
{{"verdicts": [
  {{"entity": "entity name", "found": true or false, "evidence": "quote from context or null"}},
  ...
]}}

For each entity:
- "found": true if the entity appears in the context (exact match or clear reference)
- "found": false if the entity is not mentioned in the context
- "evidence": brief quote showing where entity was found, or null if not found

Your response:"""

    def _parse_entities(self, response: str) -> list[str]:
        """Parse entity extraction response.

        Args:
            response: LLM response with extracted entities

        Returns:
            List of extracted entities
        """
        try:
            data = json.loads(response.strip())
            return list(data.get("entities", []))
        except json.JSONDecodeError:
            return []

    def _parse_verdicts(self, response: str) -> list[dict[str, Any]]:
        """Parse entity verification verdicts response.

        Args:
            response: LLM response with verification verdicts

        Returns:
            List of verdict dictionaries
        """
        try:
            data = json.loads(response.strip())
            return list(data.get("verdicts", []))
        except json.JSONDecodeError:
            return []

    def _calculate_score(self, verdicts: list[dict[str, Any]]) -> float:
        """Calculate entity recall score from verdicts.

        Args:
            verdicts: List of entity verification verdict dictionaries

        Returns:
            Score between 0 and 1
        """
        if not verdicts:
            return 0.0

        found_count = sum(1 for v in verdicts if v.get("found") is True)
        return found_count / len(verdicts)

    async def a_measure(
        self,
        test_case: TestCase,
        actual_output: Any,
    ) -> MetricResult:
        """Measure context entity recall.

        Args:
            test_case: Test case with input, expected, and retrieval_context
            actual_output: Generated response (not directly used)

        Returns:
            MetricResult with entity recall score
        """
        self.validate_inputs(test_case, actual_output)

        provider = self._get_provider()
        context_key = self.config.context_key
        contexts = test_case.metadata[context_key]

        # Step 1: Extract entities from expected output
        extraction_prompt = self._build_extraction_prompt(str(test_case.expected))
        extraction_response = await provider.a_complete(extraction_prompt)
        entities = self._parse_entities(extraction_response.content)

        if not entities:
            return MetricResult(
                name="context_entity_recall",
                score=1.0,
                passed=True,
                metadata={
                    "entities": [],
                    "verdicts": [],
                    "reason": "No entities extracted from expected output",
                    "total_entities": 0,
                    "found_entities": 0,
                },
            )

        # Step 2: Verify each entity against context
        verification_prompt = self._build_verification_prompt(entities, contexts)
        verification_response = await provider.a_complete(verification_prompt)
        verdicts = self._parse_verdicts(verification_response.content)

        # Step 3: Calculate entity recall score
        score = self._calculate_score(verdicts)
        passed = score >= self.threshold

        found_entities = [v.get("entity") for v in verdicts if v.get("found") is True]
        missing_entities = [v.get("entity") for v in verdicts if v.get("found") is not True]

        return MetricResult(
            name="context_entity_recall",
            score=score,
            passed=passed,
            metadata={
                "entities": entities,
                "verdicts": verdicts,
                "total_entities": len(entities),
                "found_entities": len(found_entities),
                "missing_entities": missing_entities,
                "found_entity_names": found_entities,
                "context_count": len(contexts),
            },
        )
