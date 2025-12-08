# Evaris Python SDK Examples

Cookbook-style examples demonstrating how to use the Evaris SDK for AI evaluation and observability.

## Prerequisites

```bash
pip install -e .

pip install openai python-dotenv
```

## Environment Setup

Create a `.env` file:

```
EVARIS_API_KEY=ev_your_api_key
EVARIS_BASE_URL=http://localhost:4000  # For local development
OPENAI_API_KEY=sk_your_openai_key  # For chat agent examples
```

## Examples

### 1. Basic Evaluation (`01_basic_eval.py`)
Run a simple evaluation with pre-computed outputs. Good starting point for understanding the SDK.

### 2. Chat Agent Evaluation (`02_chat_agent_eval.py`)
Evaluate a chat agent with real LLM calls. Demonstrates end-to-end evaluation workflow.

### 3. Streaming Progress (`03_streaming_eval.py`)
Real-time progress updates during evaluation using SSE streaming.

### 4. Experiment Versioning (`04_experiments.py`)
Track and compare different configurations using experiments.

### 5. Tracing and Observability (`05_tracing.py`)
Instrument your application with traces and observations.

### 6. Compliance Checking (`06_compliance.py`)
Run ABC compliance checks (SOC2, GDPR, EU AI Act).

## Running Examples

```bash
python examples/01_basic_eval.py

python -m asyncio examples/02_chat_agent_eval.py
```
