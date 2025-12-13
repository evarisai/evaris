#!/bin/bash
set -e

echo "Starting Evaris Evaluation..."

python /app/run_eval.py

if [ "$POST_COMMENT" = "true" ] && [ -n "$GITHUB_EVENT_PATH" ]; then
    echo "Posting results to PR..."
    python /app/post_comment.py
fi

echo "Evaris Evaluation complete."
