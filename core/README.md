# Evaris Core

AI Agent Evaluation and Observability Framework.

## Installation

```bash
pip install evaris
```

## Usage

```python
from evaris import evaluate
from evaris.metrics import ExactMatch, Faithfulness

results = evaluate(
    test_cases=[...],
    metrics=[ExactMatch(), Faithfulness()],
)
```
