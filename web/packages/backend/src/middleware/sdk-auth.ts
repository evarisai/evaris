/**
 * SDK Authentication Middleware
 *
 * Validates API keys from SDK clients and extracts the organization/project context.
 * API keys are validated against the database and converted to internal context.
 */

import type { Context, MiddlewareHandler } from "hono"
import { createHash } from "node:crypto"
import { prisma } from "../lib/db"

export interface SdkAuthContext {
	organizationId: string
	projectId: string
	userId: string
	permissions: string[]
}

/**
 * Hash an API key using SHA-256
 */
function hashApiKey(apiKey: string): string {
	return createHash("sha256").update(apiKey).digest("hex")
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null
	}
	return authHeader.slice(7)
}

/**
 * SDK Authentication middleware for Hono
 *
 * Validates the Bearer token (API key) from the request header,
 * looks up the API key in the database, and attaches the context
 * to the request for downstream handlers.
 */
export const sdkAuth: MiddlewareHandler<{
	Variables: {
		sdkContext: SdkAuthContext
	}
}> = async (c, next) => {
	const authHeader = c.req.header("Authorization")
	const apiKey = extractBearerToken(authHeader)

	if (!apiKey) {
		return c.json(
			{
				error: "Unauthorized",
				message: "Missing or invalid Authorization header. Expected: Bearer <api_key>",
			},
			401
		)
	}

	// Hash the API key for database lookup
	const keyHash = hashApiKey(apiKey)

	// Look up the API key in the database
	const apiKeyRecord = await prisma.apiKey.findUnique({
		where: { keyHash },
		include: {
			organization: {
				include: {
					projects: {
						take: 1, // Get the first project for this org (SDK uses org-level keys)
					},
				},
			},
		},
	})

	if (!apiKeyRecord) {
		return c.json(
			{
				error: "Unauthorized",
				message: "Invalid API key",
			},
			401
		)
	}

	// Check if the key has expired
	if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
		return c.json(
			{
				error: "Unauthorized",
				message: "API key has expired",
			},
			401
		)
	}

	// Get project ID (either from the first project or use a placeholder)
	const projectId = apiKeyRecord.organization.projects[0]?.id || "default"

	// Map API key permissions to internal permissions
	const permissions = mapApiKeyPermissions(apiKeyRecord.permissions)

	// Set the SDK context
	const sdkContext: SdkAuthContext = {
		organizationId: apiKeyRecord.organizationId,
		projectId,
		userId: apiKeyRecord.createdById || "api-key-user",
		permissions,
	}

	c.set("sdkContext", sdkContext)

	// Update last used timestamp (fire and forget)
	prisma.apiKey
		.update({
			where: { id: apiKeyRecord.id },
			data: { lastUsedAt: new Date() },
		})
		.catch(() => {
			// Ignore update errors - don't fail the request
		})

	await next()
}

/**
 * Map API key scope to internal permissions
 *
 * Security: Unknown scopes default to read-only (fail closed).
 * This prevents accidental write access from corrupted or unexpected scope values.
 */
function mapApiKeyPermissions(scope: string): string[] {
	switch (scope) {
		case "READ_ONLY":
			return ["read"]
		case "READ_WRITE":
			return ["read", "write"]
		case "ADMIN":
			return ["read", "write", "admin"]
		default:
			// Security: Fail closed - unknown scopes get minimal permissions
			console.warn(`[SDK Auth] Unknown API key scope: ${scope}, defaulting to read-only`)
			return ["read"]
	}
}

/**
 * Helper to get SDK context from request context
 */
export function getSdkContext(c: Context): SdkAuthContext {
	const context = c.get("sdkContext") as SdkAuthContext | undefined
	if (!context) {
		throw new Error("SDK context not found. Ensure sdkAuth middleware is applied.")
	}
	return context
}
