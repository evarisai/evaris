"""
Experiment Versioning Example

Demonstrates using experiments to track and compare different configurations.
Experiments help you:
- Version your prompts and model parameters
- Compare A/B test results
- Track improvement over time
"""

import asyncio
import os
from dotenv import load_dotenv

from evaris_client import (
    EvarisClient,
    TestCase,
    EvalConfig,
    ExperimentConfig,
)

load_dotenv()


def create_test_cases() -> list[TestCase]:
    """Shared test cases for both experiments."""
    return [
        TestCase(
            input="Explain quantum computing to a 10-year-old",
            expected="Simple explanation using everyday analogies",
            actual_output="",  # Will be filled by different configs
        ),
        TestCase(
            input="What are the benefits of cloud computing?",
            expected="Scalability, cost-effectiveness, accessibility",
            actual_output="",
        ),
        TestCase(
            input="How does encryption work?",
            expected="Clear explanation of encoding and keys",
            actual_output="",
        ),
    ]


async def run_experiment_v1(client: EvarisClient, experiment_id: str) -> str:
    """Run evaluation with version 1 configuration (basic prompt)."""

    # Simulate agent outputs with basic prompt
    test_cases = [
        TestCase(
            input="Explain quantum computing to a 10-year-old",
            expected="Simple explanation using everyday analogies",
            actual_output="Quantum computing uses quantum mechanics principles like superposition and entanglement to process information in ways classical computers cannot.",
        ),
        TestCase(
            input="What are the benefits of cloud computing?",
            expected="Scalability, cost-effectiveness, accessibility",
            actual_output="Cloud computing offers scalability, reduced costs, and remote access to computing resources.",
        ),
        TestCase(
            input="How does encryption work?",
            expected="Clear explanation of encoding and keys",
            actual_output="Encryption uses mathematical algorithms to transform plaintext into ciphertext using encryption keys.",
        ),
    ]

    result = await client.assess(
        name="experiment-v1-eval",
        project_id="proj_example",
        test_cases=test_cases,
        metrics=["answer_relevancy", "coherence", "simplicity"],
        experiment_id=experiment_id,
        config=EvalConfig(
            model="gpt-4o-mini",
            temperature=0.0,
            system_prompt="You are a helpful assistant.",  # Basic prompt
        ),
        metadata={
            "prompt_version": "v1",
            "prompt_strategy": "basic",
        },
    )

    return result.eval_id


async def run_experiment_v2(
    client: EvarisClient, experiment_id: str, baseline_eval_id: str
) -> str:
    """Run evaluation with version 2 configuration (improved prompt)."""

    # Simulate agent outputs with improved prompt (more accessible language)
    test_cases = [
        TestCase(
            input="Explain quantum computing to a 10-year-old",
            expected="Simple explanation using everyday analogies",
            actual_output="Imagine you have a magical coin that can be both heads AND tails at the same time until you look at it. Quantum computers use tiny particles that work like these magical coins to solve puzzles much faster than regular computers!",
        ),
        TestCase(
            input="What are the benefits of cloud computing?",
            expected="Scalability, cost-effectiveness, accessibility",
            actual_output="Cloud computing is like renting a super-powered computer instead of buying one. You can use as much as you need (scalability), pay only for what you use (cost-effective), and access it from anywhere with internet (accessible).",
        ),
        TestCase(
            input="How does encryption work?",
            expected="Clear explanation of encoding and keys",
            actual_output="Encryption is like a secret code. You have a special key that scrambles your message into gibberish. Only someone with the matching key can unscramble it back to read it. This keeps your information safe from people who shouldn't see it.",
        ),
    ]

    result = await client.assess(
        name="experiment-v2-eval",
        project_id="proj_example",
        test_cases=test_cases,
        metrics=["answer_relevancy", "coherence", "simplicity"],
        experiment_id=experiment_id,
        baseline_eval_id=baseline_eval_id,  # Compare against v1
        config=EvalConfig(
            model="gpt-4o-mini",
            temperature=0.0,
            system_prompt="You are a friendly teacher who explains complex topics using simple analogies and everyday examples. Always use language appropriate for a 10-year-old.",
        ),
        metadata={
            "prompt_version": "v2",
            "prompt_strategy": "simplified_with_analogies",
        },
    )

    return result.eval_id


async def main():
    client = EvarisClient(
        api_key=os.getenv("EVARIS_API_KEY"),
        base_url=os.getenv("EVARIS_BASE_URL", "http://localhost:4000"),
    )

    async with client:
        # Create experiment for tracking
        print("Creating experiment...")
        experiment = await client.create_experiment(
            project_id="proj_example",
            config=ExperimentConfig(
                name="prompt-optimization-experiment",
                description="Testing different prompt strategies for accessibility",
                hypothesis="Using analogies and simpler language will improve coherence and relevancy scores",
                config={
                    "target_metrics": ["coherence", "simplicity", "answer_relevancy"],
                    "model": "gpt-4o-mini",
                },
                tags=["prompt-engineering", "accessibility"],
            ),
        )

        print(f"Experiment ID: {experiment.experiment_id}")
        print(f"Version: {experiment.version}")

        # Run version 1 (baseline)
        print("\nRunning Experiment V1 (baseline)...")
        v1_eval_id = await run_experiment_v1(client, experiment.experiment_id)
        print(f"V1 Eval ID: {v1_eval_id}")

        # Run version 2 (with comparison)
        print("\nRunning Experiment V2 (with improvements)...")
        v2_eval_id = await run_experiment_v2(
            client, experiment.experiment_id, baseline_eval_id=v1_eval_id
        )
        print(f"V2 Eval ID: {v2_eval_id}")

        # Fetch updated experiment with both evals
        print("\nFetching experiment results...")
        updated_experiment = await client.get_experiment(experiment.experiment_id)

        print(f"\n{'='*60}")
        print(f"EXPERIMENT RESULTS")
        print(f"{'='*60}")
        print(f"Name: {updated_experiment.name}")
        print(f"Evals Run: {len(updated_experiment.evals)}")

        for eval_result in updated_experiment.evals:
            print(f"\n  Eval: {eval_result.name}")
            if eval_result.summary:
                print(f"    Accuracy: {eval_result.summary.accuracy:.1%}")
                print(f"    Passed: {eval_result.summary.passed}/{eval_result.summary.total}")


if __name__ == "__main__":
    asyncio.run(main())
