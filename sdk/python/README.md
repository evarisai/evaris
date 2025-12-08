# Evaris Python SDK

Lightweight Python client for the Evaris AI evaluation platform.

## Installation

```bash
pip install evaris-client
```

## Quick Start

```python
from evaris_client import EvarisClient, TestCase

client = EvarisClient(api_key="ev_...")

result = await client.assess(
    name="my-evaluation",
    project_id="proj_123",
    test_cases=[
        TestCase(
            input="What is the capital of France?",
            actual_output="The capital of France is Paris.",
            expected_output="Paris"
        )
    ],
    metrics=["correctness", "faithfulness"]
)

print(f"Score: {result.summary.overall_score}")
```

## Features

- Async-first with sync wrappers
- Streaming progress updates
- LLM-as-Judge with OpenRouter
- Compliance checking (SOC2, GDPR, EU AI Act)
- Tracing and observability
