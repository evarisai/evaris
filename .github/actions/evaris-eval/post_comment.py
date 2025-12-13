#!/usr/bin/env python3
"""Post evaluation results as a PR comment.

This script reads evaluation results and posts them as a GitHub PR comment.
"""

import json
import os
import sys
from pathlib import Path

import httpx


def get_github_context() -> dict:
    """Get GitHub event context."""
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if not event_path or not Path(event_path).exists():
        return {}

    with open(event_path) as f:
        return json.load(f)


def get_pr_number(context: dict) -> int | None:
    """Extract PR number from GitHub context."""
    # Direct PR event
    if "pull_request" in context:
        return context["pull_request"].get("number")

    # Issue comment or other events
    if "issue" in context:
        return context["issue"].get("number")

    return None


def format_comment(results: dict) -> str:
    """Format evaluation results as markdown comment."""
    passed = results.get("passed", False)
    accuracy = results.get("accuracy", 0.0)
    total = results.get("total", 0)
    passed_count = results.get("passed_count", 0)
    failed_count = results.get("failed_count", 0)
    threshold = results.get("threshold", 0.8)
    report_url = results.get("report_url", "")
    metrics_used = results.get("metrics_used", [])

    status_emoji = "white_check_mark" if passed else "x"
    status_text = "Passed" if passed else "Failed"

    metrics_str = ", ".join(metrics_used) if metrics_used else "default"

    comment = f"""## Evaris Evaluation Results :{status_emoji}:

**Status:** {status_text}

| Metric | Value |
|--------|-------|
| Accuracy | {accuracy:.2%} |
| Threshold | {threshold:.2%} |
| Total Tests | {total} |
| Passed | {passed_count} |
| Failed | {failed_count} |
| Metrics | {metrics_str} |

"""

    if report_url:
        comment += f"[View Full Report]({report_url})\n\n"

    if not passed:
        comment += f"""
> **Note:** Evaluation accuracy ({accuracy:.2%}) is below the threshold ({threshold:.2%}).
> Review the failed test cases and update your implementation.
"""

    comment += """
---
*Powered by [Evaris AI](https://evaris.ai)*
"""

    return comment


def post_comment(repo: str, pr_number: int, body: str, token: str) -> bool:
    """Post or update PR comment."""
    api_url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    # Check for existing Evaris comment to update
    try:
        response = httpx.get(api_url, headers=headers, timeout=30)
        if response.status_code == 200:
            comments = response.json()
            for comment in comments:
                if "Evaris Evaluation Results" in comment.get("body", ""):
                    # Update existing comment
                    update_url = comment["url"]
                    response = httpx.patch(
                        update_url,
                        headers=headers,
                        json={"body": body},
                        timeout=30,
                    )
                    return response.status_code == 200
    except httpx.RequestError:
        pass

    # Create new comment
    try:
        response = httpx.post(
            api_url,
            headers=headers,
            json={"body": body},
            timeout=30,
        )
        return response.status_code == 201
    except httpx.RequestError as e:
        print(f"Error posting comment: {e}")
        return False


def main() -> int:
    """Post evaluation results to PR."""
    # Load results
    results_file = Path("/tmp/evaris_results.json")
    if not results_file.exists():
        print("No evaluation results found")
        return 0

    results = json.loads(results_file.read_text())

    # Get GitHub context
    context = get_github_context()
    pr_number = get_pr_number(context)

    if not pr_number:
        print("No PR number found in GitHub context")
        return 0

    # Get repository info
    repo = os.environ.get("GITHUB_REPOSITORY")
    token = os.environ.get("GITHUB_TOKEN")

    if not repo or not token:
        print("Missing GITHUB_REPOSITORY or GITHUB_TOKEN")
        return 1

    # Format and post comment
    comment = format_comment(results)

    if post_comment(repo, pr_number, comment, token):
        print(f"Posted evaluation results to PR #{pr_number}")
        return 0
    else:
        print("Failed to post comment")
        return 1


if __name__ == "__main__":
    sys.exit(main())
