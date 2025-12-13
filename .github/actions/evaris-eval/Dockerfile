FROM python:3.12-slim

LABEL maintainer="Evaris AI"
LABEL description="Evaris Evaluation GitHub Action"

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir \
    evaris-client \
    httpx \
    pydantic

COPY entrypoint.sh /entrypoint.sh
COPY run_eval.py /app/run_eval.py
COPY post_comment.py /app/post_comment.py

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
