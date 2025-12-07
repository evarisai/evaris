import { createHash, randomBytes } from "node:crypto"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { organizationProcedure, router } from "../trpc"

// Generate a secure API key with prefix for identification
function generateApiKey(): { key: string; prefix: string; hash: string } {
	const randomPart = randomBytes(32).toString("base64url")
	const key = `evaris_sk_${randomPart}`
	const prefix = key.substring(0, 16) // "evaris_sk_" + first 6 chars
	const hash = createHash("sha256").update(key).digest("hex")
	return { key, prefix, hash }
}

// Hash an API key for lookup
export function hashApiKey(key: string): string {
	return createHash("sha256").update(key).digest("hex")
}

export const apiKeysRouter = router({
	// List all API keys for the organization (without the actual key values)
	list: organizationProcedure.query(async ({ ctx }) => {
		return ctx.prisma.apiKey.findMany({
			where: { organizationId: ctx.activeOrganization.id },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				name: true,
				keyPrefix: true,
				permissions: true,
				lastUsedAt: true,
				expiresAt: true,
				createdAt: true,
				createdBy: {
					select: { name: true, email: true },
				},
			},
		})
	}),

	// Create a new API key - returns the key only once
	create: organizationProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				permissions: z.enum(["READ_ONLY", "READ_WRITE", "ADMIN"]).default("READ_WRITE"),
				expiresAt: z.date().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { key, prefix, hash } = generateApiKey()

			const apiKey = await ctx.prisma.apiKey.create({
				data: {
					name: input.name,
					keyHash: hash,
					keyPrefix: prefix,
					permissions: input.permissions,
					expiresAt: input.expiresAt,
					organizationId: ctx.activeOrganization.id,
					createdById: ctx.user.id,
				},
				select: {
					id: true,
					name: true,
					keyPrefix: true,
					permissions: true,
					expiresAt: true,
					createdAt: true,
				},
			})

			// Return the full key only on creation - it won't be retrievable again
			return {
				...apiKey,
				key, // This is the only time the full key is returned
			}
		}),

	// Update API key metadata (not the key itself)
	update: organizationProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(100).optional(),
				permissions: z.enum(["READ_ONLY", "READ_WRITE", "ADMIN"]).optional(),
				expiresAt: z.date().nullable().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input

			// Verify the key belongs to the organization
			const existing = await ctx.prisma.apiKey.findFirst({
				where: { id, organizationId: ctx.activeOrganization.id },
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "API key not found",
				})
			}

			return ctx.prisma.apiKey.update({
				where: { id },
				data,
				select: {
					id: true,
					name: true,
					keyPrefix: true,
					permissions: true,
					expiresAt: true,
					updatedAt: true,
				},
			})
		}),

	// Delete (revoke) an API key
	delete: organizationProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify the key belongs to the organization
			const existing = await ctx.prisma.apiKey.findFirst({
				where: { id: input.id, organizationId: ctx.activeOrganization.id },
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "API key not found",
				})
			}

			return ctx.prisma.apiKey.delete({
				where: { id: input.id },
			})
		}),

	// Rotate an API key - creates a new key and invalidates the old one
	rotate: organizationProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify the key belongs to the organization
			const existing = await ctx.prisma.apiKey.findFirst({
				where: { id: input.id, organizationId: ctx.activeOrganization.id },
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "API key not found",
				})
			}

			const { key, prefix, hash } = generateApiKey()

			const apiKey = await ctx.prisma.apiKey.update({
				where: { id: input.id },
				data: {
					keyHash: hash,
					keyPrefix: prefix,
				},
				select: {
					id: true,
					name: true,
					keyPrefix: true,
					permissions: true,
					expiresAt: true,
					updatedAt: true,
				},
			})

			// Return the new key - it won't be retrievable again
			return {
				...apiKey,
				key,
			}
		}),
})
