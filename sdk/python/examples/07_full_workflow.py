"""
Full Workflow Example

End-to-end demonstration of the complete Evaris workflow:
1. Create an experiment to track versions
2. Build and run a chat agent
3. Evaluate the agent with multiple metrics
4. Stream progress in real-time
5. Send traces for observability
6. Run compliance checks

This is the recommended starting point for understanding the full platform.
"""

import asyncio
import os
import uuid
from datetime import datetime, timezone
from typing import Optional
from dotenv import load_dotenv

try:
    from openai import AsyncOpenAI
except ImportError:
    raise ImportError("Install openai: pip install openai")

from evaris_client import (
    EvarisClient,
    TestCase,
    EvalConfig,
    ExperimentConfig,
    Observation,
    ObservationType,
    TraceStatus,
    LogLevel,
    ComplianceFramework,
)

load_dotenv()


class EvaluatedChatAgent:
    """A chat agent with built-in evaluation and observability."""

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        system_prompt: str = "You are a helpful assistant.",
        project_id: str = "proj_example",
    ):
        self.openai = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.evaris = EvarisClient(
            api_key=os.getenv("EVARIS_API_KEY"),
            base_url=os.getenv("EVARIS_BASE_URL", "http://localhost:4000"),
        )
        self.model = model
        self.system_prompt = system_prompt
        self.project_id = project_id
        self.experiment_id: Optional[str] = None

    async def setup_experiment(self, name: str, hypothesis: str) -> str:
        """Create an experiment to track this evaluation run."""
        async with self.evaris:
            experiment = await self.evaris.create_experiment(
                project_id=self.project_id,
                config=ExperimentConfig(
                    name=name,
                    description=f"Evaluating {self.model} with custom system prompt",
                    hypothesis=hypothesis,
                    config={
                        "model": self.model,
                        "system_prompt": self.system_prompt,
                    },
                    tags=["automated", "chat-agent"],
                ),
            )
            self.experiment_id = experiment.experiment_id
            return experiment.experiment_id

    async def chat(self, message: str, session_id: str) -> tuple[str, dict]:
        """
        Send a message and get a response.
        Returns: (response_text, usage_stats)
        """
        start_time = datetime.now(timezone.utc)

        response = await self.openai.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": message},
            ],
            temperature=0.7,
            max_tokens=500,
        )

        end_time = datetime.now(timezone.utc)

        usage = {
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            "total_tokens": response.usage.total_tokens if response.usage else 0,
            "duration_ms": int((end_time - start_time).total_seconds() * 1000),
        }

        return response.choices[0].message.content or "", usage

    async def chat_with_trace(
        self,
        message: str,
        session_id: str,
        user_id: str = "anonymous",
    ) -> tuple[str, str]:
        """Chat with full tracing for observability."""
        span_id = str(uuid.uuid4())
        start_time = datetime.now(timezone.utc)

        response_text, usage = await self.chat(message, session_id)

        end_time = datetime.now(timezone.utc)

        # Create observation for this generation
        observation = Observation(
            span_id=span_id,
            type=ObservationType.GENERATION,
            name="chat_completion",
            start_time=start_time,
            end_time=end_time,
            duration_ms=usage["duration_ms"],
            status=TraceStatus.OK,
            model=self.model,
            model_params={"temperature": 0.7, "max_tokens": 500},
            input={"system": self.system_prompt[:100], "user": message},
            output=response_text,
            input_tokens=usage["prompt_tokens"],
            output_tokens=usage["completion_tokens"],
            total_tokens=usage["total_tokens"],
        )

        # Send trace
        async with self.evaris:
            trace_result = await self.evaris.trace(
                name="chat_completion",
                project_id=self.project_id,
                observations=[observation],
                session_id=session_id,
                user_id=user_id,
                environment="development",
                tags=["chat", "demo"],
            )

            return response_text, trace_result.trace_id

    async def run_evaluation(
        self,
        test_inputs: list[dict],
        eval_name: str,
        stream_progress: bool = True,
    ) -> str:
        """
        Run evaluation on test inputs.

        Args:
            test_inputs: List of dicts with 'input', 'expected', and optional 'context'
            eval_name: Name for this evaluation run
            stream_progress: Whether to stream progress updates

        Returns:
            Eval ID
        """
        # Generate outputs for all test cases
        print(f"Generating {len(test_inputs)} test case outputs...")
        test_cases = []

        for i, test in enumerate(test_inputs):
            print(f"  [{i+1}/{len(test_inputs)}] {test['input'][:40]}...")
            output, _ = await self.chat(test["input"], session_id="eval_session")

            test_cases.append(
                TestCase(
                    input=test["input"],
                    expected=test.get("expected"),
                    actual_output=output,
                    context=test.get("context"),
                    metadata=test.get("metadata", {}),
                )
            )

        # Run evaluation
        async with self.evaris:
            if stream_progress:
                print(f"\nRunning evaluation with streaming...")
                eval_id = None

                async for event in self.evaris.assess_stream(
                    name=eval_name,
                    project_id=self.project_id,
                    test_cases=test_cases,
                    metrics=[
                        "answer_relevancy",
                        "correctness",
                        "coherence",
                        "faithfulness",
                    ],
                    experiment_id=self.experiment_id,
                    config=EvalConfig(
                        model="gpt-4o-mini",
                        temperature=0.0,
                    ),
                ):
                    eval_id = event.eval_id
                    bar = "#" * (event.progress // 5) + "-" * (20 - event.progress // 5)
                    print(f"\r  [{bar}] {event.progress}%", end="", flush=True)

                    if event.current_result:
                        status = "PASS" if event.current_result.passed else "FAIL"
                        print(f" [{status}]", end="")

                print()  # New line after progress
                return eval_id

            else:
                result = await self.evaris.assess(
                    name=eval_name,
                    project_id=self.project_id,
                    test_cases=test_cases,
                    metrics=[
                        "answer_relevancy",
                        "correctness",
                        "coherence",
                        "faithfulness",
                    ],
                    experiment_id=self.experiment_id,
                    config=EvalConfig(
                        model="gpt-4o-mini",
                        temperature=0.0,
                    ),
                )
                return result.eval_id

    async def check_compliance(self) -> None:
        """Run compliance checks on the project."""
        async with self.evaris:
            results = await self.evaris.check_compliance(
                project_id=self.project_id,
                frameworks=[ComplianceFramework.ABC, ComplianceFramework.GDPR],
            )

            print("\nCompliance Status:")
            for check in results:
                status = "OK" if check.status.value == "COMPLIANT" else check.status.value
                print(f"  {check.framework.value}: {status} ({check.score:.0%})")


async def main():
    print("=" * 60)
    print("EVARIS FULL WORKFLOW DEMO")
    print("=" * 60)

    # Initialize agent
    agent = EvaluatedChatAgent(
        model="gpt-4o-mini",
        system_prompt="You are a knowledgeable assistant. Provide accurate, helpful answers.",
        project_id="proj_example",  # Replace with your project ID
    )

    # Step 1: Create experiment
    print("\n[1/5] Creating experiment...")
    experiment_id = await agent.setup_experiment(
        name="chat-agent-quality-eval",
        hypothesis="Clearer system prompts improve answer relevancy scores",
    )
    print(f"  Experiment ID: {experiment_id}")

    # Step 2: Test the agent interactively with tracing
    print("\n[2/5] Testing agent with tracing...")
    session_id = f"demo_{uuid.uuid4().hex[:8]}"

    test_messages = [
        "What is Python?",
        "How do I create a list in Python?",
    ]

    for msg in test_messages:
        response, trace_id = await agent.chat_with_trace(
            message=msg,
            session_id=session_id,
            user_id="demo_user",
        )
        print(f"  Q: {msg}")
        print(f"  A: {response[:100]}...")
        print(f"  Trace: {trace_id}")

    # Step 3: Run full evaluation
    print("\n[3/5] Running evaluation...")

    test_inputs = [
        {
            "input": "What is the difference between a list and a dictionary in Python?",
            "expected": "Lists are ordered sequences, dictionaries are key-value pairs",
            "context": "Python has multiple data structures including lists (ordered, indexed) and dictionaries (key-value mappings).",
        },
        {
            "input": "Explain what an API is",
            "expected": "Interface for software components to communicate",
        },
        {
            "input": "What is version control?",
            "expected": "System for tracking changes to code over time",
            "context": "Version control systems like Git help developers track and manage changes to source code.",
        },
        {
            "input": "What does REST stand for?",
            "expected": "Representational State Transfer",
        },
        {
            "input": "Explain the concept of a database index",
            "expected": "Data structure that speeds up data retrieval",
            "context": "Database indexes are structures that improve query performance by providing quick access paths to data.",
        },
    ]

    eval_id = await agent.run_evaluation(
        test_inputs=test_inputs,
        eval_name="chat-quality-eval-v1",
        stream_progress=True,
    )
    print(f"  Eval ID: {eval_id}")

    # Step 4: Check compliance
    print("\n[4/5] Running compliance checks...")
    await agent.check_compliance()

    # Step 5: Log completion
    print("\n[5/5] Logging workflow completion...")
    async with agent.evaris:
        await agent.evaris.log(
            level=LogLevel.INFO,
            message=f"Full workflow completed for experiment {experiment_id}",
            project_id=agent.project_id,
            metadata={
                "experiment_id": experiment_id,
                "eval_id": eval_id,
                "test_count": len(test_inputs),
            },
        )

    print("\n" + "=" * 60)
    print("WORKFLOW COMPLETE")
    print("=" * 60)
    print(f"  Experiment: {experiment_id}")
    print(f"  Evaluation: {eval_id}")
    print(f"  Session: {session_id}")
    print("\nView results in the Evaris dashboard!")


if __name__ == "__main__":
    asyncio.run(main())
