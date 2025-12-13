#!/usr/bin/env python3
"""Evaris Evaluation Runner for GitHub Actions.

This script runs LLM evaluations via the Evaris API and outputs results
for GitHub Actions. All evaluation execution and storage happens server-side.
"""

import json
import os
import sys
from pathlib import Path


def get_env(key: str, default: str = "") -> str:
    """Get environment variable with default."""
    return os.environ.get(key, default)


def get_env_bool(key: str, default: bool = False) -> bool:
    """Get boolean environment variable."""
    value = get_env(key, str(default)).lower()
    return value in ("true", "1", "yes")


def get_env_float(key: str, default: float = 0.0) -> float:
    """Get float environment variable."""
    try:
        return float(get_env(key, str(default)))
    except ValueError:
        return default


def load_dataset(path: str) -> list[dict]:
    """Load test dataset from file."""
    if not path:
        return []

    file_path = Path(path)
    if not file_path.exists():
        print(f"Warning: Dataset file not found: {path}")
        return []

    with open(file_path) as f:
        if file_path.suffix == ".jsonl":
            return [json.loads(line) for line in f if line.strip()]
        else:
            data = json.load(f)
            return data if isinstance(data, list) else [data]


def set_output(name: str, value: str) -> None:
    """Set GitHub Actions output."""
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a") as f:
            f.write(f"{name}={value}\n")
    print(f"::set-output name={name}::{value}")


def get_pr_info() -> dict:
    """Extract PR information from GitHub context."""
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if not event_path or not Path(event_path).exists():
        return {}

    try:
        with open(event_path) as f:
            event = json.load(f)

        pr = event.get("pull_request", {})
        return {
            "pr_number": pr.get("number"),
            "pr_title": pr.get("title", ""),
            "pr_branch": pr.get("head", {}).get("ref", ""),
            "commit_sha": pr.get("head", {}).get("sha", "")[:8],
            "repo": os.environ.get("GITHUB_REPOSITORY", ""),
        }
    except (json.JSONDecodeError, KeyError):
        return {}


def main() -> int:
    """Run evaluation via Evaris API and report results."""
    # Get configuration from environment
    api_key = get_env("EVARIS_API_KEY")
    project_id = get_env("EVARIS_PROJECT_ID")
    base_url = get_env("EVARIS_BASE_URL")  # Optional: for local testing
    dataset_path = get_env("DATASET_PATH")
    metrics_str = get_env("METRICS")
    categories_str = get_env("CATEGORIES", "default")
    threshold = get_env_float("THRESHOLD", 0.8)
    fail_on_error = get_env_bool("FAIL_ON_ERROR", True)

    # Validate required inputs
    if not api_key:
        print("Error: EVARIS_API_KEY is required")
        return 1

    if not project_id:
        print("Error: EVARIS_PROJECT_ID is required")
        return 1

    # Import evaris SDK client
    try:
        from evaris_client import EvarisClient, TestCase
    except ImportError as e:
        print(f"Error: Failed to import evaris_client: {e}")
        return 1

    # Load dataset
    dataset = load_dataset(dataset_path)
    if not dataset:
        print("Warning: No test cases found in dataset")
        set_output("passed", "true")
        set_output("accuracy", "1.0")
        set_output("total-tests", "0")
        set_output("passed-tests", "0")
        set_output("failed-tests", "0")
        return 0

    # Convert dataset to TestCase objects
    test_cases = []
    for item in dataset:
        test_cases.append(
            TestCase(
                input=item.get("input", ""),
                expected=item.get("expected"),
                actual_output=item.get("actual_output", ""),
                context=item.get("context"),
                metadata=item.get("metadata", {}),
            )
        )

    # Parse metrics
    metrics = [m.strip() for m in metrics_str.split(",") if m.strip()] if metrics_str else None

    # Default metrics if not specified
    if not metrics:
        metrics = ["faithfulness", "answer_relevancy", "toxicity"]

    # Get PR context for naming
    pr_info = get_pr_info()
    eval_name = "GitHub Action Eval"
    if pr_info.get("pr_number"):
        eval_name = f"PR #{pr_info['pr_number']}: {pr_info.get('pr_title', '')[:50]}"
    if pr_info.get("commit_sha"):
        eval_name += f" ({pr_info['commit_sha']})"

    print(f"Running evaluation with {len(test_cases)} test cases...")
    print(f"  Name: {eval_name}")
    print(f"  Metrics: {metrics}")
    print(f"  Threshold: {threshold}")
    print(f"  Project ID: {project_id}")
    if base_url:
        print(f"  Base URL: {base_url}")

    try:
        # Create SDK client and run evaluation via API
        # Results are automatically stored in the database
        client = EvarisClient(
            api_key=api_key,
            base_url=base_url or None,
            project_id=project_id,
        )

        # Run evaluation synchronously
        result = client.assess_sync(
            name=eval_name,
            test_cases=test_cases,
            metrics=metrics,
            metadata={
                "source": "github_action",
                "pr_number": pr_info.get("pr_number"),
                "pr_branch": pr_info.get("pr_branch"),
                "commit_sha": pr_info.get("commit_sha"),
                "repo": pr_info.get("repo"),
                "threshold": threshold,
            },
        )

        # Extract results
        summary = result.summary
        if not summary:
            print("Error: No summary in evaluation result")
            set_output("passed", "false")
            set_output("accuracy", "0.0")
            return 1

        total = summary.total
        passed = summary.passed
        failed = summary.failed
        accuracy = summary.accuracy

        print(f"\nEvaluation Results:")
        print(f"  Total: {total}")
        print(f"  Passed: {passed}")
        print(f"  Failed: {failed}")
        print(f"  Accuracy: {accuracy:.2%}")
        print(f"  Eval ID: {result.eval_id}")

        # Set outputs
        eval_passed = accuracy >= threshold
        set_output("passed", str(eval_passed).lower())
        set_output("accuracy", f"{accuracy:.4f}")
        set_output("total-tests", str(total))
        set_output("passed-tests", str(passed))
        set_output("failed-tests", str(failed))
        set_output("eval-id", result.eval_id)

        # Generate report URL
        report_url = f"https://evarisai.com/projects/{project_id}/evals/{result.eval_id}"
        set_output("report-url", report_url)
        print(f"  Report URL: {report_url}")

        # Save results for PR comment
        results_file = Path("/tmp/evaris_results.json")
        results_file.write_text(
            json.dumps(
                {
                    "passed": eval_passed,
                    "accuracy": accuracy,
                    "total": total,
                    "passed_count": passed,
                    "failed_count": failed,
                    "threshold": threshold,
                    "metrics_used": metrics,
                    "eval_id": result.eval_id,
                    "report_url": report_url,
                },
                indent=2,
            )
        )

        if fail_on_error and not eval_passed:
            print(f"\nEvaluation failed: {accuracy:.2%} < {threshold:.2%} threshold")
            return 1

        print("\nEvaluation passed!")
        return 0

    except Exception as e:
        print(f"Error running evaluation: {e}")
        set_output("passed", "false")
        set_output("accuracy", "0.0")
        return 1


if __name__ == "__main__":
    sys.exit(main())
