# Evaris

AI Agent Evaluation and Observability Platform.

## Installation

```bash
# Python client (lightweight, SaaS only)
pip install evaris-client

# Python evaluation engine (full local evaluation)
pip install evaris

# TypeScript client
npm install @evarisai/client
```

## Usage

```python
from evaris_client import EvarisClient, TestCase

client = EvarisClient(api_key="ev_...")

result = await client.assess(
    name="my-eval",
    test_cases=[TestCase(input="...", actual_output="...")],
    metrics=["faithfulness"]
)
```

```typescript
import { EvarisClient } from "@evarisai/client"

const client = new EvarisClient({ apiKey: "ev_..." })

const result = await client.assess("my-eval", testCases, ["faithfulness"])
```

## Structure

```
evarisai/
├── core/           # Python evaluation engine (pip install evaris)
├── sdk/
│   ├── python/     # Lightweight client (pip install evaris-client)
│   └── typescript/ # TypeScript client (@evarisai/client)
├── server/         # FastAPI evaluation server
├── web/            # Dashboard (TanStack Start + Hono)
└── shared/         # Prisma schema (single source of truth)
```

## Development

```bash
make install        # Install all dependencies
make dev            # Start all services
make db-generate    # Generate Prisma clients (both JS and Python)
make db-push        # Push schema to database
make test           # Run all tests
```

## License

Business Source License 1.1 - See [LICENSE](./LICENSE)

Converts to Apache 2.0 after 4 years. Free for non-production use and internal tools.
