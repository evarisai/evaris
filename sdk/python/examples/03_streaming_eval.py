"""
Streaming Evaluation Example

Demonstrates real-time progress updates during evaluation using SSE (Server-Sent Events).
Useful for long-running evaluations where you want to show progress to users.
"""

import asyncio
import os
from dotenv import load_dotenv

from evaris_client import EvarisClient, TestCase, EvalConfig

load_dotenv()


def create_sample_test_cases() -> list[TestCase]:
    """Create a larger set of test cases to demonstrate streaming."""
    return [
        TestCase(
            input="What is machine learning?",
            expected="ML is a subset of AI where computers learn from data",
            actual_output="Machine learning is a type of artificial intelligence that allows computers to learn and improve from experience without being explicitly programmed.",
        ),
        TestCase(
            input="Explain the concept of recursion",
            expected="A function that calls itself to solve smaller subproblems",
            actual_output="Recursion is a programming technique where a function calls itself to solve a problem by breaking it down into smaller, similar subproblems until reaching a base case.",
        ),
        TestCase(
            input="What is the difference between HTTP and HTTPS?",
            expected="HTTPS adds SSL/TLS encryption for secure communication",
            actual_output="HTTPS is HTTP with encryption. The 'S' stands for 'Secure' and uses SSL/TLS protocols to encrypt data transmitted between the client and server.",
        ),
        TestCase(
            input="Define a database index",
            expected="A data structure that improves query performance",
            actual_output="A database index is a data structure that improves the speed of data retrieval operations on a database table at the cost of additional writes and storage space.",
        ),
        TestCase(
            input="What is REST API?",
            expected="Representational State Transfer - architectural style for web services",
            actual_output="REST (Representational State Transfer) is an architectural style for designing networked applications. It uses standard HTTP methods and is stateless.",
        ),
        TestCase(
            input="Explain containerization",
            expected="Packaging applications with dependencies into isolated containers",
            actual_output="Containerization packages an application with all its dependencies into a standardized unit (container) that can run consistently across different computing environments.",
        ),
        TestCase(
            input="What is Git branching?",
            expected="Creating parallel development lines in version control",
            actual_output="Git branching allows you to diverge from the main line of development and work independently without affecting the main codebase.",
        ),
        TestCase(
            input="Define microservices architecture",
            expected="Application as collection of small, independent services",
            actual_output="Microservices architecture structures an application as a collection of loosely coupled, independently deployable services, each running a unique process.",
        ),
    ]


async def main():
    client = EvarisClient(
        api_key=os.getenv("EVARIS_API_KEY"),
        base_url=os.getenv("EVARIS_BASE_URL", "http://localhost:4000"),
    )

    async with client:
        test_cases = create_sample_test_cases()

        print(f"Starting streaming evaluation with {len(test_cases)} test cases...")
        print("=" * 60)

        final_result = None

        # Stream progress events
        async for event in client.assess_stream(
            name="streaming-eval-demo",
            project_id="proj_example",  # Replace with your project ID
            test_cases=test_cases,
            metrics=["answer_relevancy", "correctness", "coherence"],
            config=EvalConfig(
                model="gpt-4o-mini",
                temperature=0.0,
            ),
        ):
            # Display progress
            progress_bar = "#" * (event.progress // 5) + "-" * (20 - event.progress // 5)
            print(f"\r[{progress_bar}] {event.progress}% | {event.status}", end="")

            # Show current test being evaluated
            if event.current_test is not None and event.total_tests:
                print(f" | Test {event.current_test + 1}/{event.total_tests}", end="")

            # Show result as it comes in
            if event.current_result:
                status = "PASS" if event.current_result.passed else "FAIL"
                print(f"\n  [{status}] {event.current_result.input[:40]}...")

            # Capture final result
            if event.status == "completed":
                final_result = event

        print("\n" + "=" * 60)
        print("EVALUATION COMPLETE")
        print("=" * 60)

        if final_result:
            print(f"Eval ID: {final_result.eval_id}")
            print(f"Final Status: {final_result.status}")
            if final_result.message:
                print(f"Message: {final_result.message}")


if __name__ == "__main__":
    asyncio.run(main())
