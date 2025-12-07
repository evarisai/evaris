import { createHash } from "node:crypto"
import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import type { Context } from "./context"

const t = initTRPC.context<Context>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		}
	},
})

// Helper to hash API key for lookup
function hashApiKey(key: string): string {
	return createHash("sha256").update(key).digest("hex")
}

// Middleware to enforce authentication
const enforceAuth = t.middleware(({ ctx, next }) => {
	if (!ctx.user || !ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to access this resource",
		})
	}
	return next({
		ctx: {
			...ctx,
			user: ctx.user,
			session: ctx.session,
		},
	})
})

// Middleware to enforce organization membership
const enforceOrganization = t.middleware(({ ctx, next }) => {
	if (!ctx.user || !ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to access this resource",
		})
	}
	if (!ctx.activeOrganization || !ctx.membership) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must belong to an organization to access this resource",
		})
	}
	return next({
		ctx: {
			...ctx,
			user: ctx.user,
			session: ctx.session,
			activeOrganization: ctx.activeOrganization,
			membership: ctx.membership,
		},
	})
})

// Middleware to enforce API key authentication (for external SDK/server access)
const enforceApiKey = t.middleware(async ({ ctx, next }) => {
	// Extract API key from Authorization header
	const authHeader = ctx.req.headers.get("authorization")
	if (!authHeader?.startsWith("Bearer ")) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "API key required. Use Authorization: Bearer <api_key>",
		})
	}

	const apiKey = authHeader.substring(7) // Remove "Bearer " prefix
	if (!apiKey.startsWith("evaris_sk_")) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Invalid API key format",
		})
	}

	// Look up the API key by hash
	const keyHash = hashApiKey(apiKey)
	const apiKeyRecord = await ctx.prisma.apiKey.findUnique({
		where: { keyHash },
		include: {
			organization: true,
		},
	})

	if (!apiKeyRecord) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Invalid API key",
		})
	}

	// Check if key has expired
	if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "API key has expired",
		})
	}

	// Update last used timestamp (fire and forget)
	void ctx.prisma.apiKey.update({
		where: { id: apiKeyRecord.id },
		data: { lastUsedAt: new Date() },
	})

	return next({
		ctx: {
			...ctx,
			apiKey: apiKeyRecord,
			activeOrganization: apiKeyRecord.organization,
			// API key auth doesn't have a user session
			user: null,
			session: null,
		},
	})
})

// Middleware for API key with specific permission level
const enforceApiKeyPermission = (requiredPermission: "READ_ONLY" | "READ_WRITE" | "ADMIN") =>
	t.middleware(async ({ ctx, next }) => {
		// First run the API key enforcement
		const authHeader = ctx.req.headers.get("authorization")
		if (!authHeader?.startsWith("Bearer ")) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "API key required. Use Authorization: Bearer <api_key>",
			})
		}

		const apiKey = authHeader.substring(7)
		if (!apiKey.startsWith("evaris_sk_")) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid API key format",
			})
		}

		const keyHash = hashApiKey(apiKey)
		const apiKeyRecord = await ctx.prisma.apiKey.findUnique({
			where: { keyHash },
			include: { organization: true },
		})

		if (!apiKeyRecord) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid API key",
			})
		}

		if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "API key has expired",
			})
		}

		// Check permission level
		const permissionLevels = { READ_ONLY: 1, READ_WRITE: 2, ADMIN: 3 }
		if (permissionLevels[apiKeyRecord.permissions] < permissionLevels[requiredPermission]) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `API key requires ${requiredPermission} permission`,
			})
		}

		void ctx.prisma.apiKey.update({
			where: { id: apiKeyRecord.id },
			data: { lastUsedAt: new Date() },
		})

		return next({
			ctx: {
				...ctx,
				apiKey: apiKeyRecord,
				activeOrganization: apiKeyRecord.organization,
				user: null,
				session: null,
			},
		})
	})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(enforceAuth)
export const organizationProcedure = t.procedure.use(enforceOrganization)
// API key procedures for external access (SDK/server)
export const apiKeyProcedure = t.procedure.use(enforceApiKey)
export const apiKeyReadProcedure = t.procedure.use(enforceApiKeyPermission("READ_ONLY"))
export const apiKeyWriteProcedure = t.procedure.use(enforceApiKeyPermission("READ_WRITE"))
export const apiKeyAdminProcedure = t.procedure.use(enforceApiKeyPermission("ADMIN"))
export const createCallerFactory = t.createCallerFactory
