"""
Basic Assessment Example

Demonstrates running a simple assessment with pre-computed outputs.
This is the simplest way to use Evaris - you provide both inputs and outputs,
and Evaris runs the metrics to assess quality.
"""

import asyncio
import os
from dotenv import load_dotenv

from evaris_client import EvarisClient, TestCase

load_dotenv()


async def main():
    # Initialize client - uses EVARIS_API_KEY and EVARIS_PROJECT_ID from env
    # project_id is required - get it from dashboard after creating a project
    client = EvarisClient(
        base_url=os.getenv("EVARIS_BASE_URL", "http://localhost:4000"),
        project_id=os.getenv("EVARIS_PROJECT_ID"),
    )

    async with client:
        # Define test cases with pre-computed outputs
        test_cases = [
            TestCase(
                input="What is the capital of France?",
                expected="Paris",
                actual_output="The capital of France is Paris.",
                context="France is a country in Western Europe. Its capital city is Paris.",
            ),
            TestCase(
                input="Explain photosynthesis in simple terms",
                expected="Plants convert sunlight into energy",
                actual_output="Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar.",
                metadata={"difficulty": "medium"},
            ),
            TestCase(
                input="What is 2 + 2?",
                expected="4",
                actual_output="The answer is 4.",
            ),
        ]

        # Run assessment with selected metrics
        # - answer_relevancy: Does the answer address the question?
        # - faithfulness: Is the answer grounded in the provided context?
        # - llm_judge: General semantic correctness (compares actual vs expected)
        result = await client.assess(
            name="basic-qa-assessment",
            test_cases=test_cases,
            metrics=["answer_relevancy", "faithfulness", "llm_judge"],
            metadata={"run_type": "example", "version": "1.0"},
        )

        print(f"Eval ID: {result.eval_id}")
        print(f"Status: {result.status}")

        if result.summary:
            print(f"\nSummary:")
            print(f"  Total: {result.summary.total}")
            print(f"  Passed: {result.summary.passed}")
            print(f"  Failed: {result.summary.failed}")
            print(f"  Accuracy: {result.summary.accuracy:.1%}")

        print(f"\nResults:")
        for item in result.results:
            print(f"\n  Input: {item.input[:50]}...")
            print(f"  Passed: {item.passed}")
            for score in item.scores:
                status = "PASS" if score.passed else "FAIL"
                print(f"    {score.name}: {score.score:.2f} [{status}]")
                if score.reasoning:
                    print(f"      Reason: {score.reasoning[:100]}...")


if __name__ == "__main__":
    asyncio.run(main())
