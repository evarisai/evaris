"""
Chat Agent Assessment Example

Demonstrates assessing a chat agent with real LLM calls.
This is the typical production workflow:
1. Define your chat agent (uses OpenAI)
2. Generate outputs for test inputs
3. Run Evaris assessment with LLM Judge (uses OpenRouter)

Key concept: Your agent and the LLM Judge are SEPARATE:
- Agent: Uses your OpenAI/Anthropic key to generate responses
- Judge: Uses OpenRouter (configured server-side) to assess responses
"""

import asyncio
import os
from typing import Optional
from dotenv import load_dotenv

try:
    from openai import AsyncOpenAI
except ImportError:
    raise ImportError("Install openai: pip install openai")

from evaris_client import EvarisClient, TestCase, JudgeConfig

load_dotenv()


class SimpleChatAgent:
    """A simple chat agent using OpenAI's API."""

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        system_prompt: Optional[str] = None,
    ):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = model
        self.system_prompt = system_prompt or (
            "You are a helpful assistant. Provide clear, accurate, and concise answers."
        )

    async def chat(self, message: str) -> str:
        """Send a message and get a response."""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": message},
            ],
            temperature=0.7,
            max_tokens=500,
        )
        return response.choices[0].message.content or ""


async def generate_test_cases(agent: SimpleChatAgent) -> list[TestCase]:
    """Generate test cases by running the agent on test inputs."""

    # Define test inputs with expected outputs and context
    test_inputs = [
        {
            "input": "What are the three laws of thermodynamics?",
            "expected": "The three laws cover energy conservation, entropy increase, and absolute zero",
            "context": "Thermodynamics is a branch of physics dealing with heat, work, and temperature.",
        },
        {
            "input": "Summarize the plot of Romeo and Juliet in 2 sentences.",
            "expected": "Two young lovers from feuding families fall in love and marry secretly. Their tragic deaths ultimately reconcile their families.",
            "context": "Romeo and Juliet is a tragedy written by William Shakespeare about two star-crossed lovers.",
        },
        {
            "input": "What is the difference between a list and a tuple in Python?",
            "expected": "Lists are mutable (can be changed), tuples are immutable (cannot be changed)",
            "context": "Python is a programming language with various data structures including lists and tuples.",
        },
        {
            "input": "Explain what an API is to a non-technical person.",
            "expected": "An API is like a waiter in a restaurant - it takes your order (request), communicates with the kitchen (server), and brings back your food (response).",
            "context": None,
        },
        {
            "input": "What causes the sky to be blue?",
            "expected": "Rayleigh scattering - shorter blue wavelengths scatter more than other colors",
            "context": "Light from the sun contains all colors. As it passes through Earth's atmosphere, it interacts with gas molecules.",
        },
    ]

    test_cases = []
    for test in test_inputs:
        print(f"Generating output for: {test['input'][:40]}...")
        actual_output = await agent.chat(test["input"])

        test_cases.append(
            TestCase(
                input=test["input"],
                expected=test["expected"],
                actual_output=actual_output,
                context=test.get("context"),
            )
        )

    return test_cases


async def main():
    # Initialize the chat agent (YOUR agent - uses YOUR OpenAI key)
    agent = SimpleChatAgent(
        model="gpt-4o-mini",
        system_prompt="You are a knowledgeable assistant. Provide accurate, educational answers.",
    )

    # Initialize Evaris client
    # No project_id needed - uses default project
    evaris = EvarisClient(
        base_url=os.getenv("EVARIS_BASE_URL", "http://localhost:4000"),
    )

    async with evaris:
        # Generate test cases with actual agent outputs
        print("Generating agent outputs for test cases...\n")
        test_cases = await generate_test_cases(agent)

        # Run assessment with LLM Judge
        # The judge is SEPARATE from your agent - uses OpenRouter server-side
        print("\nRunning Evaris assessment...")
        result = await evaris.assess(
            name="chat-agent-v1-assessment",
            test_cases=test_cases,
            metrics=[
                "answer_relevancy",  # Is the answer relevant to the question?
                "faithfulness",  # Does the answer stick to the provided context?
                "correctness",  # Is the answer factually correct?
                "coherence",  # Is the answer well-structured and logical?
            ],
            # Configure the LLM Judge (uses OpenRouter)
            judge_config=JudgeConfig(
                model="anthropic/claude-3.5-sonnet",  # Judge model via OpenRouter
                temperature=0.0,  # Low temp for consistent judging
            ),
            metadata={
                "agent_model": agent.model,
                "agent_prompt": agent.system_prompt[:100],
            },
        )

        # Display results
        print(f"\nEval ID: {result.eval_id}")
        print(f"Status: {result.status}")

        if result.summary:
            print(f"\n{'='*60}")
            print(f"EVALUATION SUMMARY")
            print(f"{'='*60}")
            print(f"Total Test Cases: {result.summary.total}")
            print(f"Passed: {result.summary.passed}")
            print(f"Failed: {result.summary.failed}")
            print(f"Accuracy: {result.summary.accuracy:.1%}")
            if result.summary.avg_latency_ms:
                print(f"Avg Latency: {result.summary.avg_latency_ms:.0f}ms")
            if result.summary.total_cost:
                print(f"Total Cost: ${result.summary.total_cost:.4f}")

        # Detailed results
        print(f"\n{'='*60}")
        print(f"DETAILED RESULTS")
        print(f"{'='*60}")

        for i, item in enumerate(result.results, 1):
            status = "PASS" if item.passed else "FAIL"
            print(f"\n[{status}] Test {i}: {item.input[:50]}...")
            print(f"  Output: {item.actual_output[:80]}...")

            for score in item.scores:
                score_status = "PASS" if score.passed else "FAIL"
                print(f"  {score.name}: {score.score:.2f} [{score_status}]")
                if score.reasoning and not score.passed:
                    print(f"    Reason: {score.reasoning[:100]}...")


if __name__ == "__main__":
    asyncio.run(main())
