.PHONY: dev dev-web dev-server dev-backend dev-worker dev-all \
        build build-web build-server build-core \
        test test-python test-core test-server test-web \
        format format-python format-web \
        lint lint-python lint-web \
        typecheck typecheck-python typecheck-web \
        check db-generate db-push db-migrate db-studio \
        install install-web install-python clean help

# Development
dev: dev-all

dev-web:
	cd web && pnpm dev

dev-server:
	cd server && uv run uvicorn evaris_server.app:app --reload --port 8080

dev-backend:
	cd web && pnpm dev:backend

dev-worker:
	cd web && pnpm dev:worker

dev-all:
	@echo "Starting all services..."
	cd web && pnpm dev:all

# Build
build: build-web build-server

build-web:
	cd web && pnpm build

build-server:
	cd server && uv pip install -e .

build-core:
	cd core && uv pip install -e .

# Testing
test: test-python test-web

test-python: test-core test-server

test-core:
	cd core && uv run pytest

test-server:
	cd server && uv run pytest tests/

test-web:
	@echo "No web tests configured yet (add 'test' script to web/package.json)"

# CI check (runs all quality checks)
check: lint typecheck test
	@echo "All checks passed!"

# Formatting
format: format-python format-web

format-python:
	cd core && uv run black . && uv run ruff check --fix --unsafe-fixes .
	cd server && uv run black . && uv run ruff check --fix --unsafe-fixes .

format-web:
	cd web && pnpm format

# Linting (check only, no auto-fix)
lint: lint-python lint-web

lint-python:
	cd core && uv run black --check . && uv run ruff check .
	cd server && uv run black --check . && uv run ruff check .

lint-web:
	cd web && pnpm lint

# Type checking
typecheck: typecheck-python typecheck-web

typecheck-python:
	cd core && uv run mypy evaris
	cd server && uv run mypy evaris_server

typecheck-web:
	cd web && pnpm typecheck

# Database (single source of truth in shared/prisma/)
# JS client generated via pnpm, Python client via uv
db-generate:
	cd web && pnpm exec prisma generate --schema=../shared/prisma/schema.prisma --generator=client_js
	cd server && uv run prisma generate --schema=../shared/prisma/schema.prisma --generator=client_py

db-push:
	cd web && pnpm exec prisma db push --schema=../shared/prisma/schema.prisma --skip-generate
	@echo "Schema pushed. Run 'make db-generate' to generate clients."

db-migrate:
	cd web && pnpm exec prisma migrate dev --schema=../shared/prisma/schema.prisma --skip-generate
	@echo "Migration complete. Run 'make db-generate' to generate clients."

db-studio:
	cd web && pnpm exec prisma studio --schema=../shared/prisma/schema.prisma

# Installation
install: install-web install-python

install-web:
	cd web && pnpm install

install-python:
	cd core && uv venv && uv pip install -e ".[dev]"
	cd server && uv venv && uv pip install -e ../core && uv pip install -e ".[dev]"

# Cleanup
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .venv -exec rm -rf {} + 2>/dev/null || true

# Help
help:
	@echo "Available commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make dev          - Start all development servers"
	@echo "    make dev-web      - Start web frontend only"
	@echo "    make dev-server   - Start Python server only"
	@echo ""
	@echo "  Build:"
	@echo "    make build        - Build all packages"
	@echo "    make install      - Install all dependencies"
	@echo ""
	@echo "  Code Quality:"
	@echo "    make format       - Auto-format all code"
	@echo "    make lint         - Run all linters (check only)"
	@echo "    make typecheck    - Run type checkers (ty for Python, tsc for TS)"
	@echo "    make test         - Run all tests"
	@echo ""
	@echo "  Database:"
	@echo "    make db-generate  - Generate Prisma clients"
	@echo "    make db-push      - Push schema to database"
	@echo "    make db-migrate   - Run database migrations"
	@echo "    make db-studio    - Open Prisma Studio"
	@echo ""
	@echo "  Cleanup:"
	@echo "    make clean        - Remove build artifacts"
