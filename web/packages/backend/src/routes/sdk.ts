/**
 * SDK Routes - Proxy layer for SDK clients
 *
 * These routes accept requests from the Python/TypeScript SDKs,
 * validate API keys, and forward requests to the internal evaris-server.
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { sdkAuth, getSdkContext } from "../middleware/sdk-auth"
import { sdkRateLimiter } from "../middleware/rate-limiter"
import { forwardToServer, transformAssessRequest } from "../lib/server-proxy"

// Types for server responses
interface EvaluateResponse {
	eval_id: string
	organization_id: string
	project_id: string
	name: string
	status: string
	summary?: {
		total: number
		passed: number
		failed: number
		accuracy: number
	}
	results?: Array<{
		input: unknown
		expected: unknown
		actual_output: unknown
		scores: Array<{
			name: string
			score: number
			passed: boolean
		}>
		passed: boolean
	}>
	created_at: string
	completed_at?: string
}

interface TraceResponse {
	trace_id: string
	organization_id: string
	project_id: string
	name: string
	span_count: number
	duration_ms?: number
	created_at: string
}

interface LogResponse {
	log_id: string
	organization_id: string
	project_id: string
	level: string
	created_at: string
}

// Create SDK routes with auth middleware applied
const sdkRoutes = new Hono()

// Apply rate limiting before auth (to protect against brute force)
sdkRoutes.use("*", sdkRateLimiter)

// Apply SDK auth to all routes
sdkRoutes.use("*", sdkAuth)

// ============================================================================
// Schemas
// ============================================================================

const testCaseSchema = z.object({
	input: z.unknown(),
	expected: z.unknown().optional().nullable(),
	actual_output: z.unknown(),
	context: z.unknown().optional().nullable(),
	metadata: z.record(z.unknown()).optional().default({}),
})

const assessSchema = z.object({
	name: z.string(),
	test_cases: z.array(testCaseSchema),
	metrics: z.array(z.string()),
	metadata: z.record(z.unknown()).optional(),
})

const spanSchema: z.ZodType<{
	name: string
	start_time?: string
	end_time?: string
	duration_ms?: number
	input?: unknown
	output?: unknown
	metadata?: Record<string, unknown>
	children?: Array<unknown>
}> = z.object({
	name: z.string(),
	start_time: z.string().optional(),
	end_time: z.string().optional(),
	duration_ms: z.number().optional(),
	input: z.unknown().optional(),
	output: z.unknown().optional(),
	metadata: z.record(z.unknown()).optional(),
	children: z.array(z.lazy(() => spanSchema)).optional(),
})

const traceSchema = z.object({
	name: z.string(),
	spans: z.array(spanSchema),
	duration_ms: z.number().optional(),
	eval_id: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
})

const logSchema = z.object({
	level: z.enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
	message: z.string(),
	source: z.string().optional(),
	agent_id: z.string().optional(),
	eval_id: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
	timestamp: z.string().optional(),
})

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/assess
 *
 * Run an evaluation with specified metrics.
 * Forwards to evaris-server /internal/evaluate
 */
sdkRoutes.post("/assess", zValidator("json", assessSchema), async (c) => {
	const body = c.req.valid("json")
	const context = getSdkContext(c)

	// Transform SDK request format to server format
	const serverBody = transformAssessRequest(body)

	const { data, status } = await forwardToServer<EvaluateResponse>(
		"/internal/evaluate",
		"POST",
		context,
		serverBody
	)

	return c.json(data, status as 200 | 201 | 400 | 401 | 500)
})

/**
 * GET /api/assessments/:id
 *
 * Get an evaluation by ID.
 * Forwards to evaris-server /internal/evaluations/:id
 */
sdkRoutes.get("/assessments/:id", async (c) => {
	const evalId = c.req.param("id")
	const context = getSdkContext(c)

	const { data, status } = await forwardToServer<EvaluateResponse>(
		`/internal/evaluations/${evalId}`,
		"GET",
		context
	)

	return c.json(data, status as 200 | 404 | 401 | 500)
})

/**
 * POST /api/trace
 *
 * Store trace data.
 * Forwards to evaris-server /internal/trace
 */
sdkRoutes.post("/trace", zValidator("json", traceSchema), async (c) => {
	const body = c.req.valid("json")
	const context = getSdkContext(c)

	const { data, status } = await forwardToServer<TraceResponse>(
		"/internal/trace",
		"POST",
		context,
		body
	)

	return c.json(data, status as 200 | 201 | 400 | 401 | 500)
})

/**
 * POST /api/log
 *
 * Store a log entry.
 * Forwards to evaris-server /internal/log
 */
sdkRoutes.post("/log", zValidator("json", logSchema), async (c) => {
	const body = c.req.valid("json")
	const context = getSdkContext(c)

	const { data, status } = await forwardToServer<LogResponse>(
		"/internal/log",
		"POST",
		context,
		body
	)

	return c.json(data, status as 200 | 201 | 400 | 401 | 500)
})

export { sdkRoutes }
