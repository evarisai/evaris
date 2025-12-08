# Evaris Testing Guide: From Account Creation to Running Assessments

This guide walks you through setting up and testing Evaris from scratch, including account creation, project setup, and running your first assessments.

## Prerequisites

- Python 3.9+
- OpenAI API key (for your AI agent)
- OpenRouter API key (for LLM Judge - get one at https://openrouter.ai)

## Step 1: Create an Evaris Account

### Option A: Web Dashboard (Staging)

1. Navigate to: `https://staging.evaris.ai` (or `http://localhost:3000` for local dev)
2. Click "Sign Up"
3. Enter your email and create a password
4. Verify your email (check spam folder)
5. Complete organization setup:
   - Organization name: Your company or project name
   - This creates your workspace

### Option B: API Key Creation

After signing in:
1. Go to **Settings** > **API Keys**
2. Click **Create API Key**
3. Copy and save the key (starts with `ev_`)
4. Never share this key publicly

## Step 2: Environment Setup

### Install the SDK

```bash
cd sdk/python
pip install -e .
pip install openai python-dotenv
```

### Create Environment File

Create `.env` in your working directory:

```bash
# Evaris Configuration
EVARIS_API_KEY=ev_your_api_key_here
EVARIS_BASE_URL=https://staging.evaris.ai  # or http://localhost:4000

# Optional: Default project (if not specified in code)
# EVARIS_PROJECT_ID=proj_your_project_id

# Your AI Agent's API Key (for generating outputs)
OPENAI_API_KEY=sk-your_openai_key

# OpenRouter API Key (for LLM Judge - used server-side)
# This is configured on the server, not needed in client SDK
```

## Step 3: Project Setup

Projects are containers for your assessments, traces, and logs. You can either:
1. Use the default project (automatic)
2. Create a specific project

### Option A: Use Default Project

If you don't specify a `project_id`, Evaris uses a "default" project:

```python
from evaris_client import EvarisClient, TestCase

client = EvarisClient()  # Uses EVARIS_API_KEY from env

# This uses the default project automatically
result = await client.assess(
    name="my-first-assessment",
    test_cases=[...],
    metrics=["answer_relevancy", "correctness"]
)
```

### Option B: Create a Specific Project

Via the dashboard:
1. Go to **Projects** > **Create Project**
2. Enter project name and description
3. Select modes: Assessments, Observability, Monitoring
4. Copy the Project ID

Then use it in code:

```python
client = EvarisClient(project_id="proj_abc123")  # Set default for all calls

# Or per-call:
result = await client.assess(
    name="my-assessment",
    project_id="proj_abc123",  # Override per call
    test_cases=[...],
    metrics=[...]
)
```

## Step 4: Running Your First Assessment

### Basic Assessment (Pre-computed Outputs)

```python
import asyncio
from evaris_client import EvarisClient, TestCase

async def run_basic_assessment():
    client = EvarisClient()

    test_cases = [
        TestCase(
            input="What is the capital of France?",
            expected="Paris",
            actual_output="The capital of France is Paris.",
        ),
        TestCase(
            input="What is 2 + 2?",
            expected="4",
            actual_output="The answer is 4.",
        ),
    ]

    async with client:
        result = await client.assess(
            name="basic-qa-test",
            test_cases=test_cases,
            metrics=["answer_relevancy", "correctness"],
        )

        print(f"Assessment ID: {result.eval_id}")
        print(f"Status: {result.status}")
        if result.summary:
            print(f"Accuracy: {result.summary.accuracy:.1%}")

asyncio.run(run_basic_assessment())
```

### Chat Agent Assessment (Live LLM Calls)

```python
import asyncio
from openai import AsyncOpenAI
from evaris_client import EvarisClient, TestCase, JudgeConfig

async def run_chat_agent_assessment():
    openai = AsyncOpenAI()

    evaris = EvarisClient()

    questions = [
        ("What is machine learning?", "ML is a subset of AI"),
        ("Explain recursion", "A function that calls itself"),
    ]

    test_cases = []
    for question, expected in questions:
        response = await openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": question}]
        )
        test_cases.append(TestCase(
            input=question,
            expected=expected,
            actual_output=response.choices[0].message.content,
        ))

    async with evaris:
        result = await evaris.assess(
            name="chat-agent-assessment",
            test_cases=test_cases,
            metrics=["answer_relevancy", "correctness", "coherence"],
            judge_config=JudgeConfig(
                model="anthropic/claude-3.5-sonnet",
                temperature=0.0,  # Consistent judging
            ),
        )

        print(f"Assessment ID: {result.eval_id}")
        for item in result.results:
            status = "PASS" if item.passed else "FAIL"
            print(f"[{status}] {item.input[:40]}...")

asyncio.run(run_chat_agent_assessment())
```

## Step 5: Understanding the LLM Judge

### Judge vs Agent Separation

**Important**: The LLM Judge is completely separate from your AI agent:

| Component | Purpose | Provider | Configuration |
|-----------|---------|----------|---------------|
| **Your Agent** | Generates responses to assess | OpenAI, Anthropic, etc. | Your choice |
| **LLM Judge** | Assesses agent responses | OpenRouter | `JudgeConfig` |

This separation ensures:
- Your agent's API keys stay with you
- Judge uses consistent, calibrated models
- Cost optimization (judge can use different model than agent)

### Default Judge Configuration

If you don't specify `judge_config`, defaults are:

```python
JudgeConfig(
    model="anthropic/claude-3.5-sonnet",  # Via OpenRouter
    temperature=0.0,  # Low for consistency
    max_tokens=2048,
    provider="openrouter"
)
```

### Custom Judge Configuration

```python
from evaris_client import JudgeConfig

result = await client.assess(
    name="my-assessment",
    test_cases=[...],
    metrics=[...],
    judge_config=JudgeConfig(
        model="openai/gpt-4o",  # Different model via OpenRouter
        temperature=0.0,
    )
)
```

## Step 6: Available Metrics

### Core Metrics

| Metric | Description | Use Case |
|--------|-------------|----------|
| `answer_relevancy` | Response relevance to question | General QA |
| `faithfulness` | Response adheres to context | RAG systems |
| `correctness` | Factual accuracy | Factual QA |
| `coherence` | Clarity and structure | All responses |
| `hallucination` | Detects made-up information | RAG, factual |
| `toxicity` | Harmful content detection | Safety |
| `helpfulness` | Practical utility | User-facing |
| `context_relevance` | Retrieved context quality | RAG |
| `completeness` | Coverage of expected answer | Complex QA |

### RAG-Specific Assessment

For RAG systems, include context:

```python
test_case = TestCase(
    input="What is the refund policy?",
    expected="30-day money back guarantee",
    actual_output=agent_response,
    context="Our refund policy: 30-day money back guarantee for all products.",
)

result = await client.assess(
    name="rag-assessment",
    test_cases=[test_case],
    metrics=["faithfulness", "context_relevance", "hallucination"],
)
```

## Step 7: Viewing Results

### Dashboard

1. Go to your project in the dashboard
2. Click **Assessments** tab
3. Find your assessment by name or ID
4. View:
   - Summary statistics
   - Individual test results
   - LLM Judge reasoning
   - Best parameters sidebar

### Programmatic Access

```python
# Get assessment result by ID
result = await client.get_assessment("assessment_abc123")

# Access detailed results
for item in result.results:
    print(f"Input: {item.input}")
    print(f"Passed: {item.passed}")
    for score in item.scores:
        print(f"  {score.name}: {score.score:.2f}")
        if score.reasoning:
            print(f"    Reason: {score.reasoning}")
```

## Step 8: Streaming Progress (Large Assessments)

For assessments with many test cases, use streaming:

```python
async for event in client.assess_stream(
    name="large-assessment",
    test_cases=large_test_cases,
    metrics=["answer_relevancy", "correctness"],
):
    print(f"Progress: {event.progress}%")
    if event.current_result:
        status = "PASS" if event.current_result.passed else "FAIL"
        print(f"  [{status}] Test {event.current_test}")
```

## Step 9: Experiments (A/B Testing)

Track different configurations:

```python
from evaris_client import ExperimentConfig

# Create experiment
experiment = await client.create_experiment(
    config=ExperimentConfig(
        name="prompt-optimization",
        description="Testing different system prompts",
        hypothesis="Clearer prompts improve accuracy",
    )
)

# Run v1
v1_result = await client.assess(
    name="v1-basic-prompt",
    experiment_id=experiment.experiment_id,
    test_cases=test_cases,
    metrics=["correctness"],
)

# Run v2 with comparison
v2_result = await client.assess(
    name="v2-improved-prompt",
    experiment_id=experiment.experiment_id,
    baseline_eval_id=v1_result.eval_id,  # Compare against v1
    test_cases=test_cases,
    metrics=["correctness"],
)
```

## Troubleshooting

### Common Issues

**"API key required"**
- Set `EVARIS_API_KEY` environment variable
- Or pass `api_key=` to `EvarisClient()`

**"Project not found"**
- Create the project in the dashboard first
- Or use the default project (don't pass `project_id`)

**"Timeout error"**
- Increase timeout: `EvarisClient(timeout=600.0)`
- Use streaming for large assessments

**"Judge returned low scores"**
- Check that `actual_output` contains meaningful content
- Ensure `expected` matches what you're looking for
- Review the judge's `reasoning` field

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Now SDK will log detailed info
client = EvarisClient()
```

## Next Steps

1. **Run the examples**: `python examples/07_full_workflow.py`
2. **Integrate with CI/CD**: Run assessments on every PR
3. **Set up compliance**: Check ABC/SOC2/GDPR compliance
4. **Add tracing**: Instrument your agent with observations

## Support

- Documentation: https://docs.evaris.ai
- Issues: https://github.com/evarisai/evaris/issues
