/**
 * Server proxy utility for forwarding requests to the internal evaris-server.
 *
 * This module handles the authentication bridge between external API keys
 * and internal JWT tokens used by the evaris-server.
 */

import jwt from "jsonwebtoken"

interface ApiKeyContext {
	organizationId: string
	projectId: string
	userId: string
	permissions: string[]
}

interface InternalTokenPayload {
	organization_id: string
	project_id: string
	user_id: string
	permissions: string[]
	iat: number
	exp: number
}

/**
 * Configuration for the server proxy
 */
export const proxyConfig = {
	serverUrl: process.env.EVARIS_SERVER_URL || "http://localhost:8080",
	jwtSecret: process.env.INTERNAL_JWT_SECRET || "dev-secret-change-in-production",
	jwtAlgorithm: "HS256" as const,
	tokenExpirySeconds: 300, // 5 minutes
}

/**
 * Create an internal JWT token for the evaris-server
 */
export function createInternalToken(context: ApiKeyContext): string {
	const now = Math.floor(Date.now() / 1000)

	const payload: InternalTokenPayload = {
		organization_id: context.organizationId,
		project_id: context.projectId,
		user_id: context.userId,
		permissions: context.permissions,
		iat: now,
		exp: now + proxyConfig.tokenExpirySeconds,
	}

	return jwt.sign(payload, proxyConfig.jwtSecret, {
		algorithm: proxyConfig.jwtAlgorithm,
	})
}

/**
 * Forward a request to the internal evaris-server
 */
export async function forwardToServer<T>(
	path: string,
	method: "GET" | "POST" | "PUT" | "DELETE",
	context: ApiKeyContext,
	body?: unknown
): Promise<{ data: T; status: number }> {
	const internalToken = createInternalToken(context)

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		"X-Context-Token": internalToken,
	}

	const url = `${proxyConfig.serverUrl}${path}`

	const response = await fetch(url, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	})

	const data = (await response.json()) as T

	return {
		data,
		status: response.status,
	}
}

/**
 * Map SDK endpoint paths to internal server paths
 */
export const endpointMap = {
	// SDK endpoint -> Internal server endpoint
	"/api/assess": "/internal/evaluate",
	"/api/trace": "/internal/trace",
	"/api/log": "/internal/log",
	"/api/assessments": "/internal/evaluations",
} as const

/**
 * Transform SDK request body to internal server format
 */
export function transformAssessRequest(sdkBody: {
	name: string
	test_cases: Array<{
		input?: unknown
		expected?: unknown | null
		actual_output?: unknown
		metadata?: Record<string, unknown>
	}>
	metrics: string[]
	metadata?: Record<string, unknown>
}): {
	name: string
	test_cases: Array<{
		input: unknown
		expected: unknown | null
		actual_output: unknown
		metadata: Record<string, unknown>
	}>
	metrics: string[]
	metadata: Record<string, unknown>
} {
	return {
		name: sdkBody.name,
		test_cases: sdkBody.test_cases.map((tc) => ({
			input: tc.input,
			expected: tc.expected ?? null,
			actual_output: tc.actual_output,
			metadata: tc.metadata || {},
		})),
		metrics: sdkBody.metrics,
		metadata: sdkBody.metadata || {},
	}
}
