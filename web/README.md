# Evaris AI - Evaluation Platform

An AI evaluation platform for testing and benchmarking LLM agents, built with a modern full-stack architecture.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React, TanStack Start, TanStack Router, Tailwind CSS, shadcn/ui |
| **API (BFF)** | tRPC, better-auth |
| **Backend** | Hono, BullMQ, Redis |
| **Database** | PostgreSQL (Supabase), Prisma ORM |
| **Deployment** | Vercel (frontend), Railway/Render (backend) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TANSTACK START (Port 3000) - Vercel                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  FRONTEND (React + SSR)                                                │  │
│  │  - UI Components (shadcn/ui)                                           │  │
│  │  - Client-side state (React Query)                                     │  │
│  │  - Type-safe routing (TanStack Router)                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  BACKEND-FOR-FRONTEND (BFF)                                            │  │
│  │  - tRPC endpoints (CRUD for projects, datasets, viewing results)       │  │
│  │  - better-auth (login, signup, session management)                     │  │
│  │  - SSR data fetching                                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ (Triggers jobs, fetches status)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HONO BACKEND (Port 4000) - Railway/Render                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  REST API                                                              │  │
│  │  - POST /api/v1/evals (queue an evaluation)                            │  │
│  │  - GET /api/v1/jobs/:id (check job status)                             │  │
│  │  - Webhooks from external services                                     │  │
│  │  - Public API for SDK/CLI access                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  BACKGROUND WORKERS (BullMQ)                                           │  │
│  │  - Run LLM evaluations (can take minutes/hours)                        │  │
│  │  - Process dataset uploads                                             │  │
│  │  - Retry failed jobs automatically                                     │  │
│  │  - Rate limit API calls to OpenAI/Anthropic                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHARED INFRASTRUCTURE                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  Prisma + Supabase  │  │       Redis         │  │    LLM Providers    │  │
│  │  (PostgreSQL)       │  │   (Job Queues)      │  │  OpenAI/Anthropic   │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## When to Use Each Component

### Use tRPC (TanStack Start) for:
- User authentication flows
- CRUD operations (create/edit/delete projects, datasets)
- Reading data for UI display
- Real-time data that needs SSR
- Anything that completes in < 30 seconds

### Use Hono REST API for:
- Triggering background jobs
- Long-running tasks (LLM evaluations)
- Webhook endpoints from external services
- Public API for CLI/SDK access
- Anything that takes > 30 seconds to complete

---

## Project Structure

```
evaris-web/
├── src/                          # TanStack Start application
│   ├── routes/                   # File-based routing
│   │   ├── __root.tsx           # Root layout with providers
│   │   ├── index.tsx            # Home redirect
│   │   ├── login.tsx            # Login page
│   │   ├── signup.tsx           # Signup page
│   │   ├── _authenticated.tsx   # Auth layout (with sidebar)
│   │   ├── _authenticated/
│   │   │   ├── dashboard.tsx
│   │   │   ├── projects.tsx
│   │   │   ├── datasets.tsx
│   │   │   ├── evals.tsx
│   │   │   ├── logs.tsx
│   │   │   ├── traces.tsx
│   │   │   └── settings.tsx
│   │   └── api/
│   │       ├── auth/$.ts        # better-auth handler
│   │       └── trpc/$.ts        # tRPC handler
│   ├── server/                   # Server-side code
│   │   ├── auth.ts              # better-auth configuration
│   │   ├── db.ts                # Prisma client
│   │   └── trpc/
│   │       ├── trpc.ts          # tRPC initialization
│   │       ├── context.ts       # Request context
│   │       └── routers/         # tRPC routers
│   │           ├── index.ts
│   │           ├── projects.ts
│   │           ├── datasets.ts
│   │           ├── evals.ts     # Includes Hono integration
│   │           ├── logs.ts
│   │           └── traces.ts
│   ├── components/               # React components
│   ├── lib/                      # Utilities
│   │   ├── auth-client.ts       # better-auth client
│   │   ├── trpc.ts              # tRPC client
│   │   └── utils.ts
│   ├── hooks/                    # Custom hooks
│   ├── styles.css               # Global styles
│   ├── router.tsx               # Router configuration
│   ├── client.tsx               # Client entry
│   └── ssr.tsx                  # SSR entry
│
├── packages/
│   └── backend/                  # Hono backend (separate deployment)
│       ├── src/
│       │   ├── index.ts         # Server entry point
│       │   ├── app.ts           # Hono app with middleware
│       │   ├── routes/          # REST API endpoints
│       │   │   ├── health.ts
│       │   │   ├── evals.ts     # Queue evaluations
│       │   │   ├── projects.ts
│       │   │   ├── datasets.ts
│       │   │   └── jobs.ts      # Job status
│       │   ├── jobs/
│       │   │   └── worker.ts    # BullMQ worker
│       │   ├── lib/
│       │   │   ├── redis.ts     # Redis connection
│       │   │   ├── queue.ts     # BullMQ queues
│       │   │   └── db.ts        # Prisma client
│       │   └── middleware/
│       │       └── error-handler.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── docker-compose.yml
│
├── prisma/
│   └── schema.prisma            # Database schema (shared)
│
├── shared/                       # Shared types (optional)
│
├── public/                       # Static assets
│   └── svgs/                    # Logo files
│
├── package.json                  # Root package.json
├── pnpm-workspace.yaml          # Monorepo configuration
├── vite.config.ts               # Vite configuration
├── tailwind.config.ts           # Tailwind configuration
└── tsconfig.json                # TypeScript configuration
```

---

## Data Flow: Running an Evaluation

```
User clicks "Run Evaluation"
        │
        ▼
┌─────────────────────────────────────────────────┐
│  1. Frontend calls tRPC mutation               │
│     trpc.evals.run.mutate({ ... })             │
└─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│  2. TanStack Start (tRPC endpoint)             │
│     - Creates eval record in DB (PENDING)       │
│     - Calls Hono API to queue job               │
│     - Returns immediately with jobId            │
└─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│  3. Hono API (POST /api/v1/evals)              │
│     - Adds job to BullMQ queue                  │
│     - Returns 202 Accepted with jobId           │
└─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│  4. BullMQ Worker (background process)          │
│     - Picks up job from queue                   │
│     - Updates DB status to RUNNING              │
│     - Runs LLM evaluation (takes minutes)       │
│     - Updates DB with results (PASSED/FAILED)   │
└─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│  5. Frontend (polling or WebSocket)            │
│     - Calls trpc.evals.getById.useQuery()      │
│     - Sees updated status from database         │
└─────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm >= 9
- Docker (for Redis)
- Supabase account (or local PostgreSQL)

### 1. Clone and Install

```bash
git clone <repository-url>
cd evaris-web
pnpm install
```

### 2. Environment Setup

```bash
# Root .env.local
cp .env.example .env.local

# Backend .env
cp packages/backend/.env.example packages/backend/.env
```

Configure the following variables:

```env
# Database (Supabase)
DATABASE_URL=postgresql://...

# Authentication
BETTER_AUTH_SECRET=your-secret-key

# Backend API URL (for tRPC to call Hono)
BACKEND_API_URL=http://localhost:4000

# Redis (for job queues)
REDIS_URL=redis://localhost:6379
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# (Optional) Open Prisma Studio
pnpm db:studio
```

### 4. Start Redis

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 5. Run Development Servers

```bash
# Terminal 1: Frontend (TanStack Start)
pnpm dev

# Terminal 2: Backend API (Hono)
pnpm dev:backend

# Terminal 3: Background Worker
pnpm dev:worker

# Or run all together:
pnpm dev:all
```

### 6. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Health: http://localhost:4000/health

---

## Available Scripts

### Root Level

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start TanStack Start dev server (port 3000) |
| `pnpm dev:backend` | Start Hono API server (port 4000) |
| `pnpm dev:worker` | Start BullMQ worker |
| `pnpm dev:all` | Run all dev servers concurrently |
| `pnpm build` | Build frontend for production |
| `pnpm build:backend` | Build backend for production |
| `pnpm build:all` | Build everything |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |

### Backend Package

| Command | Description |
|---------|-------------|
| `pnpm --filter @evaris/backend dev` | Start API server |
| `pnpm --filter @evaris/backend worker:dev` | Start worker with hot reload |
| `pnpm --filter @evaris/backend build` | Build for production |

---

## Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy
```

### Backend (Docker)

```bash
cd packages/backend

# Build and run
docker-compose up -d

# Scale workers
docker-compose up -d --scale worker=3
```

### Backend (Railway/Render)

1. Connect your repository
2. Set root directory to `packages/backend`
3. Set build command: `pnpm build`
4. Set start command: `pnpm start`
5. Add environment variables

### Infrastructure Requirements

| Service | Provider Options |
|---------|-----------------|
| **Database** | Supabase, Neon, Railway Postgres |
| **Redis** | Upstash, Railway Redis, Redis Cloud |
| **Backend Hosting** | Railway, Render, Fly.io, AWS ECS |

---

## API Reference

### tRPC Endpoints (TanStack Start)

Used by the frontend for user-facing operations:

```typescript
// Projects
trpc.projects.list.useQuery()
trpc.projects.create.useMutation()
trpc.projects.update.useMutation()
trpc.projects.delete.useMutation()

// Datasets
trpc.datasets.list.useQuery()
trpc.datasets.create.useMutation()

// Evaluations
trpc.evals.list.useQuery()
trpc.evals.getById.useQuery({ id })
trpc.evals.run.useMutation()  // Triggers Hono job
trpc.evals.getJobStatus.useQuery({ jobId })
```

### REST API Endpoints (Hono Backend)

Used for background jobs and external integrations:

```
GET  /health              # Health check
GET  /health/ready        # Readiness probe
GET  /health/live         # Liveness probe

POST /api/v1/evals        # Queue an evaluation
GET  /api/v1/jobs         # List jobs
GET  /api/v1/jobs/:id     # Get job status
POST /api/v1/jobs/:id/retry  # Retry failed job

GET  /api/v1/projects     # List projects
POST /api/v1/projects     # Create project

GET  /api/v1/datasets     # List datasets
POST /api/v1/datasets     # Create dataset
POST /api/v1/datasets/:id/upload  # Upload data
```

---

## License

MIT
