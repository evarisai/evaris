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
 *
 * Security: INTERNAL_JWT_SECRET must be set in production.
 * The default is only for local development.
 */
function getJwtSecret(): string {
	const secret = process.env.INTERNAL_JWT_SECRET
	if (!secret) {
		if (process.env.NODE_ENV === "production") {
			throw new Error("CRITICAL: INTERNAL_JWT_SECRET must be set in production")
		}
		console.warn(
			"[Server Proxy] WARNING: Using insecure default JWT secret - do not use in production"
		)
		return "dev-secret-change-in-production"
	}
	return secret
}

export const proxyConfig = {
	serverUrl: process.env.EVARIS_SERVER_URL || "http://localhost:8080",
	jwtSecret: getJwtSecret(),
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
 * Error response from server proxy
 */
export interface ProxyErrorResponse {
	error: string
	message: string
	details?: string
}

/**
 * Forward a request to the internal evaris-server
 *
 * Security: Properly handles all error cases to prevent information leakage
 * and provide meaningful feedback to clients.
 */
export async function forwardToServer<T>(
	path: string,
	method: "GET" | "POST" | "PUT" | "DELETE",
	context: ApiKeyContext,
	body?: unknown
): Promise<{ data: T; status: number }> {
	const internalToken = createInternalToken(context)
	const url = `${proxyConfig.serverUrl}${path}`

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		"X-Context-Token": internalToken,
	}

	try {
		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		})

		// Try to parse JSON response
		let data: T
		try {
			data = (await response.json()) as T
		} catch {
			// Server returned non-JSON response (likely HTML error page)
			console.error(`[Server Proxy] Invalid JSON response: ${method} ${path}`, {
				status: response.status,
				statusText: response.statusText,
			})

			// Return error response
			const errorData: ProxyErrorResponse = {
				error: "Server Error",
				message: `Evaluation server returned invalid response (status: ${response.status})`,
			}
			return { data: errorData as T, status: response.status || 502 }
		}

		// Log non-OK responses for debugging
		if (!response.ok) {
			console.error(`[Server Proxy] Request failed: ${method} ${path}`, {
				status: response.status,
				data,
			})
		}

		return { data, status: response.status }
	} catch (error) {
		// Handle network errors (connection refused, DNS failure, timeout, etc.)
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error(`[Server Proxy] Network error: ${method} ${path}`, {
			error: errorMessage,
			url,
		})

		// Determine error type and return appropriate response
		let userMessage = "Unable to reach evaluation server. Please try again later."
		if (errorMessage.includes("ECONNREFUSED")) {
			userMessage = "Evaluation server is unavailable. Please try again later."
		} else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
			userMessage = "Request to evaluation server timed out. Please try again."
		} else if (errorMessage.includes("ENOTFOUND")) {
			userMessage = "Evaluation server could not be found. Please contact support."
		}

		const errorData: ProxyErrorResponse = {
			error: "Service Unavailable",
			message: userMessage,
			// Only include details in non-production for debugging
			details: process.env.NODE_ENV !== "production" ? errorMessage : undefined,
		}

		return { data: errorData as T, status: 503 }
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
