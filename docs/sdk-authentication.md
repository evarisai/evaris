# SDK Authentication Architecture

This document describes the authentication architecture for Evaris SDK clients (Python and TypeScript).

## Overview

SDK clients authenticate using **API Keys** which are validated by the web backend and converted to short-lived internal JWT tokens for communication with the evaluation server.

```
┌─────────────┐      ┌─────────────────┐      ┌────────────────┐
│  SDK Client │─────▶│  Web Backend    │─────▶│  Eval Server   │
│  (Python/TS)│      │  (Hono + Auth)  │      │  (FastAPI)     │
└─────────────┘      └─────────────────┘      └────────────────┘
       │                     │                        │
   API Key            Validate Key             Internal JWT
   (Bearer)          Create JWT Token           (X-Context-Token)
```

## Authentication Flow

### 1. SDK Client Request

SDK clients send requests with their API key in the Authorization header:

```python
# Python SDK
from evaris_client import EvarisClient

client = EvarisClient(api_key="ev_sk_abc123...")
result = await client.assess("my-eval", test_cases, ["faithfulness"])
```

```typescript
// TypeScript SDK
import { EvarisClient } from "@evarisai/client"

const client = new EvarisClient({ apiKey: "ev_sk_abc123..." })
const result = await client.assess("my-eval", testCases, ["faithfulness"])
```

Request:
```http
POST /api/assess
Authorization: Bearer ev_sk_abc123...
Content-Type: application/json

{
  "name": "my-eval",
  "test_cases": [...],
  "metrics": ["faithfulness"]
}
```

### 2. Web Backend Validation

The web backend (`web/packages/backend`) performs the following:

1. **Rate Limiting**: Checks request rate (60 requests/minute per API key)
2. **API Key Validation**: Hashes the key and looks up in database
3. **Expiration Check**: Verifies the key hasn't expired
4. **Permission Mapping**: Maps key scope to internal permissions
5. **JWT Creation**: Creates a short-lived internal token

```typescript
// API key validation (sdk-auth.ts)
const keyHash = hashApiKey(apiKey) // SHA-256
const apiKeyRecord = await prisma.apiKey.findUnique({ where: { keyHash } })

// Permission mapping (fail closed)
function mapApiKeyPermissions(scope: string): string[] {
  switch (scope) {
    case "READ_ONLY": return ["read"]
    case "READ_WRITE": return ["read", "write"]
    case "ADMIN": return ["read", "write", "admin"]
    default: return ["read"] // Fail closed - unknown scopes get minimal permissions
  }
}
```

### 3. Internal JWT Token

The web backend creates a JWT token for the evaluation server:

```typescript
// server-proxy.ts
const payload = {
  organization_id: context.organizationId,
  project_id: context.projectId,
  user_id: context.userId,
  permissions: context.permissions,
  iat: now,
  exp: now + 300, // 5 minutes
}

const token = jwt.sign(payload, INTERNAL_JWT_SECRET, { algorithm: "HS256" })
```

The token is passed to the evaluation server via the `X-Context-Token` header.

### 4. Evaluation Server Validation

The FastAPI evaluation server validates the internal JWT:

```python
# auth.py
payload = jwt.decode(
    token,
    settings.internal_jwt_secret,
    algorithms=[settings.internal_jwt_algorithm],
    options={
        "verify_exp": True,   # Verify expiration
        "require_exp": True,  # Require exp claim
        "verify_iat": True,   # Verify issued-at
    },
)
```

## API Key Management

### Creating API Keys

API keys are created through the Evaris dashboard:

1. Navigate to Settings > API Keys
2. Click "Create new key"
3. Select scope (READ_ONLY, READ_WRITE, or ADMIN)
4. Optionally set an expiration date
5. Copy and securely store the key (shown only once)

### Key Format

```
ev_sk_<random_32_characters>
```

- Prefix: `ev_sk_` (Evaris Secret Key)
- Value: 32 random alphanumeric characters

### Key Storage

- Keys are hashed (SHA-256) before storage
- Original key is never stored
- Only the hash is used for validation

### Key Rotation

To rotate a key:

1. Create a new key in the dashboard
2. Update your application to use the new key
3. Test the new key in a staging environment
4. Delete the old key from the dashboard

## Security Features

### Rate Limiting

| Endpoint | Limit | Window | Block Duration |
|----------|-------|--------|----------------|
| Login | 5 requests | 1 minute | 5 minutes (exponential) |
| Signup | 3 requests | 1 minute | 10 minutes |
| Forgot Password | 3 requests | 5 minutes | 15 minutes |
| SDK API | 60 requests | 1 minute | 1 minute |

### JWT Security

- **Algorithm Whitelist**: Only HS256, HS384, HS512 allowed
- **Expiration Required**: All tokens must have `exp` claim
- **Short-lived Tokens**: Internal tokens expire in 5 minutes
- **Production Enforcement**: Server refuses to start with default secrets in production

### Permission Model

Permissions are validated at multiple levels:

1. **API Key Scope**: Determines base permissions
2. **Organization Access**: Validated against organization_id in token
3. **Project Access**: Validated against project_id in token
4. **Fail Closed**: Unknown scopes default to read-only

## Environment Variables

### Web Backend

```bash
# Required in production
INTERNAL_JWT_SECRET=<strong-random-secret>

# Server URL
EVARIS_SERVER_URL=http://localhost:8080
```

### Evaluation Server

```bash
# Required in production
INTERNAL_JWT_SECRET=<same-secret-as-web>
INTERNAL_JWT_ALGORITHM=HS256  # Optional, defaults to HS256

# Production mode
ENVIRONMENT=production
```

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

Possible causes:
- API key is missing or malformed
- API key not found in database
- API key has expired

### 429 Too Many Requests

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

Includes `Retry-After` header with seconds until retry is allowed.

### 503 Service Unavailable

```json
{
  "error": "Service Unavailable",
  "message": "Evaluation server is unavailable. Please try again later."
}
```

The web backend couldn't reach the evaluation server.

## SDK Configuration

### Python SDK

```python
from evaris_client import EvarisClient

# Production
client = EvarisClient(
    api_key="ev_sk_...",
    base_url="https://api.evarisai.com"  # Optional, uses default
)

# Development
client = EvarisClient(
    api_key="ev_sk_...",
    base_url="http://localhost:3000"  # Local development
)
```

### TypeScript SDK

```typescript
import { EvarisClient } from "@evarisai/client"

// Production
const client = new EvarisClient({
  apiKey: "ev_sk_...",
  baseUrl: "https://api.evarisai.com"  // Optional
})

// Development
const client = new EvarisClient({
  apiKey: "ev_sk_...",
  baseUrl: "http://localhost:3000"
})
```

## Troubleshooting

### "Invalid API key" Error

1. Verify the key is copied correctly (no extra spaces)
2. Check if the key has expired in the dashboard
3. Ensure you're using the correct environment (dev vs prod)

### "Rate limit exceeded" Error

1. Wait for the `retryAfter` duration
2. Consider implementing retry logic with exponential backoff
3. Contact support if you need higher limits

### "Service Unavailable" Error

1. Check if the evaluation server is running
2. Verify network connectivity
3. Check server logs for errors
