import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { organizationProcedure, router } from "../trpc"

export const tracesRouter = router({
	list: organizationProcedure
		.input(
			z
				.object({
					evalId: z.string().optional(),
					status: z.enum(["OK", "ERROR", "UNSET"]).optional(),
					serviceName: z.string().optional(),
					search: z.string().optional(),
					limit: z.number().min(1).max(100).default(50),
					offset: z.number().min(0).default(0),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const where = {
				// Direct organization filter for tenant isolation
				organizationId: ctx.activeOrganization.id,
				...(input?.evalId && { evalId: input.evalId }),
				...(input?.status && { status: input.status }),
				...(input?.serviceName && { serviceName: input.serviceName }),
				...(input?.search && {
					OR: [
						{ traceId: { contains: input.search, mode: "insensitive" as const } },
						{ rootSpanName: { contains: input.search, mode: "insensitive" as const } },
					],
				}),
			}

			const [traces, total] = await Promise.all([
				ctx.prisma.trace.findMany({
					where,
					orderBy: { startTime: "desc" },
					take: input?.limit ?? 50,
					skip: input?.offset ?? 0,
				}),
				ctx.prisma.trace.count({ where }),
			])

			return { traces, total }
		}),

	getById: organizationProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.trace.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
				include: {
					observations: { orderBy: { startTime: "asc" } },
				},
			})
		}),

	getByTraceId: organizationProcedure
		.input(z.object({ traceId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.trace.findFirst({
				where: {
					traceId: input.traceId,
					organizationId: ctx.activeOrganization.id,
				},
				include: {
					observations: { orderBy: { startTime: "asc" } },
				},
			})
		}),

	create: organizationProcedure
		.input(
			z.object({
				traceId: z.string(),
				rootSpanName: z.string(),
				serviceName: z.string(),
				status: z.enum(["OK", "ERROR", "UNSET"]).default("UNSET"),
				duration: z.number(),
				startTime: z.date(),
				endTime: z.date().optional(),
				evalId: z.string().optional(),
				spans: z
					.array(
						z.object({
							spanId: z.string(),
							parentSpanId: z.string().optional(),
							operationName: z.string(),
							serviceName: z.string(),
							kind: z
								.enum(["INTERNAL", "CLIENT", "SERVER", "PRODUCER", "CONSUMER"])
								.default("INTERNAL"),
							status: z.enum(["OK", "ERROR", "UNSET"]).default("UNSET"),
							startTime: z.number(),
							duration: z.number(),
							attributes: z.record(z.unknown()).optional(),
							events: z
								.array(
									z.object({
										name: z.string(),
										timestamp: z.number(),
										attributes: z.record(z.unknown()).optional(),
									})
								)
								.optional(),
						})
					)
					.optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { spans, evalId, ...traceData } = input

			// If evalId is provided, validate it belongs to the organization
			if (evalId) {
				const evalRecord = await ctx.prisma.eval.findFirst({
					where: {
						id: evalId,
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

			return ctx.prisma.trace.create({
				data: {
					...traceData,
					evalId,
					organizationId: ctx.activeOrganization.id,
					spanCount: spans?.length ?? 0,
					observations: spans
						? {
								create: spans.map((span) => ({
									spanId: span.spanId,
									parentSpanId: span.parentSpanId,
									name: span.operationName,
									type: "SPAN" as const,
									startTime: new Date(span.startTime),
									duration: span.duration,
									status: span.status,
									metadata: (span.attributes ?? {}) as object,
								})),
							}
						: undefined,
				},
				include: { observations: true },
			})
		}),

	// Get unique service names for filtering
	getServices: organizationProcedure.query(async ({ ctx }) => {
		const services = await ctx.prisma.trace.findMany({
			select: { serviceName: true },
			distinct: ["serviceName"],
			where: {
				organizationId: ctx.activeOrganization.id,
			},
		})
		return services.map((s) => s.serviceName)
	}),

	// Get trace stats
	getStats: organizationProcedure.query(async ({ ctx }) => {
		const orgFilter = {
			organizationId: ctx.activeOrganization.id,
		}

		const [total, successful, errors] = await Promise.all([
			ctx.prisma.trace.count({ where: orgFilter }),
			ctx.prisma.trace.count({ where: { ...orgFilter, status: "OK" } }),
			ctx.prisma.trace.count({ where: { ...orgFilter, status: "ERROR" } }),
		])

		const avgDuration = await ctx.prisma.trace.aggregate({
			_avg: { duration: true },
			where: orgFilter,
		})

		return {
			total,
			successful,
			errors,
			avgDuration: avgDuration._avg.duration ?? 0,
		}
	}),
})
