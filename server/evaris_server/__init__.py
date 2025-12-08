"""Evaris Server - Evaluation execution and storage service.

This server handles:
- Running LLM Judge evaluations
- Storing evaluation results, traces, and logs
- Internal API for evaris-web gateway
"""

import os
from pathlib import Path

# Load .env into actual environment variables BEFORE any other imports.
# This must happen here (in __init__.py) to ensure env vars are available
# when metrics and providers are imported and try to use os.getenv().
_env_file = Path(__file__).parent.parent / ".env"

if _env_file.exists():
    with open(_env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value

__version__ = "0.1.0"
