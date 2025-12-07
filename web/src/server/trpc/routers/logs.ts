import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { organizationProcedure, router } from "../trpc"

export const logsRouter = router({
	list: organizationProcedure
		.input(
			z
				.object({
					evalId: z.string().optional(),
					level: z.enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]).optional(),
					source: z.string().optional(),
					agentId: z.string().optional(),
					search: z.string().optional(),
					limit: z.number().min(1).max(500).default(100),
					offset: z.number().min(0).default(0),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const where = {
				// Direct organization filter for tenant isolation
				organizationId: ctx.activeOrganization.id,
				...(input?.evalId && { evalId: input.evalId }),
				...(input?.level && { level: input.level }),
				...(input?.source && { source: input.source }),
				...(input?.agentId && { agentId: input.agentId }),
				...(input?.search && {
					message: { contains: input.search, mode: "insensitive" as const },
				}),
			}

			const [logs, total] = await Promise.all([
				ctx.prisma.log.findMany({
					where,
					orderBy: { timestamp: "desc" },
					take: input?.limit ?? 100,
					skip: input?.offset ?? 0,
				}),
				ctx.prisma.log.count({ where }),
			])

			return { logs, total }
		}),

	create: organizationProcedure
		.input(
			z.object({
				level: z.enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
				source: z.string(),
				message: z.string(),
				agentId: z.string().optional(),
				metadata: z.record(z.unknown()).optional(),
				evalId: z.string().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			// If evalId is provided, validate it belongs to the organization
			if (input.evalId) {
				const evalRecord = await ctx.prisma.eval.findFirst({
					where: {
						id: input.evalId,
						organizationId: ctx.activeOrganization.id,
					},
				})
				if (!evalRecord) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Eval not found or does not belong to your organization",
					})
				}
			}

			return ctx.prisma.log.create({
				data: {
					level: input.level,
					source: input.source,
					message: input.message,
					agentId: input.agentId,
					metadata: (input.metadata ?? {}) as object,
					evalId: input.evalId,
					organizationId: ctx.activeOrganization.id,
				},
			})
		}),

	createBatch: organizationProcedure
		.input(
			z.array(
				z.object({
					level: z.enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
					source: z.string(),
					message: z.string(),
					agentId: z.string().optional(),
					metadata: z.record(z.unknown()).optional(),
					evalId: z.string().optional(),
					timestamp: z.date().optional(),
				})
			)
		)
		.mutation(async ({ ctx, input }) => {
			// Validate all evalIds belong to the organization
			const evalIds = [...new Set(input.filter((log) => log.evalId).map((log) => log.evalId!))]
			if (evalIds.length > 0) {
				const validEvals = await ctx.prisma.eval.findMany({
					where: {
						id: { in: evalIds },
						organizationId: ctx.activeOrganization.id,
					},
					select: { id: true },
				})
				const validEvalIds = new Set(validEvals.map((e) => e.id))
				const invalidEvalIds = evalIds.filter((id) => !validEvalIds.has(id))
				if (invalidEvalIds.length > 0) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: `Some evals not found or do not belong to your organization: ${invalidEvalIds.join(", ")}`,
					})
				}
			}

			return ctx.prisma.log.createMany({
				data: input.map((log) => ({
					level: log.level,
					source: log.source,
					message: log.message,
					agentId: log.agentId,
					metadata: (log.metadata ?? {}) as object,
					evalId: log.evalId,
					timestamp: log.timestamp,
					organizationId: ctx.activeOrganization.id,
				})),
			})
		}),

	// Get unique sources for filtering
	getSources: organizationProcedure.query(async ({ ctx }) => {
		const sources = await ctx.prisma.log.findMany({
			select: { source: true },
			distinct: ["source"],
			where: {
				organizationId: ctx.activeOrganization.id,
			},
		})
		return sources.map((s) => s.source)
	}),

	// Get unique agent IDs for filtering
	getAgentIds: organizationProcedure.query(async ({ ctx }) => {
		const agents = await ctx.prisma.log.findMany({
			select: { agentId: true },
			distinct: ["agentId"],
			where: {
				agentId: { not: null },
				organizationId: ctx.activeOrganization.id,
			},
		})
		return agents.map((a) => a.agentId).filter(Boolean) as string[]
	}),

	// Get log stats
	getStats: organizationProcedure.query(async ({ ctx }) => {
		const orgFilter = {
			organizationId: ctx.activeOrganization.id,
		}

		const [total, errors, warnings] = await Promise.all([
			ctx.prisma.log.count({ where: orgFilter }),
			ctx.prisma.log.count({
				where: { ...orgFilter, level: { in: ["ERROR", "CRITICAL"] } },
			}),
			ctx.prisma.log.count({ where: { ...orgFilter, level: "WARNING" } }),
		])

		const uniqueAgents = await ctx.prisma.log.findMany({
			select: { agentId: true },
			distinct: ["agentId"],
			where: { ...orgFilter, agentId: { not: null } },
		})

		return {
			total,
			errors,
			warnings,
			activeAgents: uniqueAgents.length,
		}
	}),
})
