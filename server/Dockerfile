# Evaris Server Dockerfile
#
# Multi-stage build for a lean production image.
# Uses UV for fast, deterministic dependency management.
#
# Build from monorepo root:
#   docker build -f server/Dockerfile -t evaris-server .
#   docker run -p 8080:8080 --env-file .env evaris-server

# ==============================================================================
# Stage 1: Builder
# ==============================================================================
FROM python:3.12-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY server/pyproject.toml .

RUN uv venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

RUN uv pip install .

# Copy shared prisma schema and generate Python client
COPY shared/prisma/ prisma/
RUN prisma generate

# ==============================================================================
# Stage 2: Runtime
# ==============================================================================
FROM python:3.12-slim as runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r evaris && useradd -r -g evaris evaris

COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

COPY server/evaris_server/ evaris_server/

RUN chown -R evaris:evaris /app

USER evaris

ENV HOST="0.0.0.0"
ENV PORT="8080"
ENV ENVIRONMENT="production"
ENV DEBUG="false"
ENV LOG_LEVEL="INFO"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["uvicorn", "evaris_server.app:app", "--host", "0.0.0.0", "--port", "8080"]
