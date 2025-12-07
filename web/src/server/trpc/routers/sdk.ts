/**
 * SDK Router - External API endpoints for SDK and server access
 *
 * These endpoints use API key authentication instead of session auth.
 * They provide read/write access to traces, logs, and evals for:
 * - Client SDK (running evals)
 * - evaris-server (eval execution backend)
 */

import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { apiKeyReadProcedure, apiKeyWriteProcedure, router } from "../trpc"

// ============================================================
// TRACES - OpenTelemetry compatible trace ingestion
// ============================================================

const spanSchema = z.object({
	spanId: z.string(),
	parentSpanId: z.string().optional().nullable(),
	operationName: z.string(),
	serviceName: z.string(),
	kind: z.enum(["INTERNAL", "CLIENT", "SERVER", "PRODUCER", "CONSUMER"]).default("INTERNAL"),
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

const traceSchema = z.object({
	traceId: z.string(),
	rootSpanName: z.string(),
	serviceName: z.string(),
	status: z.enum(["OK", "ERROR", "UNSET"]).default("UNSET"),
	duration: z.number(),
	startTime: z.coerce.date(),
	endTime: z.coerce.date().optional().nullable(),
	evalId: z.string().optional().nullable(),
	spans: z.array(spanSchema).optional(),
})

// ============================================================
// LOGS - Structured log ingestion
// ============================================================

const logSchema = z.object({
	level: z.enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
	source: z.string(),
	message: z.string(),
	agentId: z.string().optional().nullable(),
	metadata: z.record(z.unknown()).optional(),
	evalId: z.string().optional().nullable(),
	timestamp: z.coerce.date().optional(),
})

// ============================================================
// EVALS - Evaluation management
// ============================================================

const evalCreateSchema = z.object({
	name: z.string().min(1),
	projectId: z.string(),
	datasetId: z.string().optional(),
})

const evalUpdateSchema = z.object({
	id: z.string(),
	name: z.string().min(1).optional(),
	status: z.enum(["PENDING", "RUNNING", "PASSED", "FAILED"]).optional(),
	total: z.number().optional().nullable(),
	passed: z.number().optional().nullable(),
	failed: z.number().optional().nullable(),
	accuracy: z.number().optional().nullable(),
	summary: z.record(z.unknown()).optional().nullable(),
	completedAt: z.coerce.date().optional().nullable(),
})

export const sdkRouter = router({
	// ============================================================
	// TRACES
	// ============================================================

	"traces.create": apiKeyWriteProcedure.input(traceSchema).mutation(async ({ ctx, input }) => {
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
				spans: spans
					? {
							create: spans.map((span) => ({
								...span,
								parentSpanId: span.parentSpanId ?? undefined,
								attributes: (span.attributes ?? {}) as object,
								events: (span.events ?? []) as object[],
							})),
						}
					: undefined,
			},
			include: { spans: true },
		})
	}),

	"traces.createBatch": apiKeyWriteProcedure
		.input(z.array(traceSchema))
		.mutation(async ({ ctx, input }) => {
			// Validate all evalIds belong to the organization
			const evalIds = [...new Set(input.filter((t) => t.evalId).map((t) => t.evalId!))]
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

			// Create traces one by one to handle nested spans
			const results = await Promise.all(
				input.map(async (trace) => {
					const { spans, evalId, ...traceData } = trace
					return ctx.prisma.trace.create({
						data: {
							...traceData,
							evalId,
							organizationId: ctx.activeOrganization.id,
							spanCount: spans?.length ?? 0,
							spans: spans
								? {
										create: spans.map((span) => ({
											...span,
											parentSpanId: span.parentSpanId ?? undefined,
											attributes: (span.attributes ?? {}) as object,
											events: (span.events ?? []) as object[],
										})),
									}
								: undefined,
						},
					})
				})
			)

			return { count: results.length, traces: results }
		}),

	"traces.list": apiKeyReadProcedure
		.input(
			z
				.object({
					evalId: z.string().optional(),
					status: z.enum(["OK", "ERROR", "UNSET"]).optional(),
					serviceName: z.string().optional(),
					limit: z.number().min(1).max(100).default(50),
					offset: z.number().min(0).default(0),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const where = {
				organizationId: ctx.activeOrganization.id,
				...(input?.evalId && { evalId: input.evalId }),
				...(input?.status && { status: input.status }),
				...(input?.serviceName && { serviceName: input.serviceName }),
			}

			const [traces, total] = await Promise.all([
				ctx.prisma.trace.findMany({
					where,
					orderBy: { startTime: "desc" },
					take: input?.limit ?? 50,
					skip: input?.offset ?? 0,
					include: { spans: true },
				}),
				ctx.prisma.trace.count({ where }),
			])

			return { traces, total }
		}),

	"traces.getById": apiKeyReadProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.trace.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
				include: { spans: { orderBy: { startTime: "asc" } } },
			})
		}),

	"traces.getByTraceId": apiKeyReadProcedure
		.input(z.object({ traceId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.trace.findFirst({
				where: {
					traceId: input.traceId,
					organizationId: ctx.activeOrganization.id,
				},
				include: { spans: { orderBy: { startTime: "asc" } } },
			})
		}),

	// ============================================================
	// LOGS
	// ============================================================

	"logs.create": apiKeyWriteProcedure.input(logSchema).mutation(async ({ ctx, input }) => {
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
				agentId: input.agentId ?? undefined,
				metadata: (input.metadata ?? {}) as object,
				evalId: input.evalId ?? undefined,
				timestamp: input.timestamp,
				organizationId: ctx.activeOrganization.id,
			},
		})
	}),

	"logs.createBatch": apiKeyWriteProcedure
		.input(z.array(logSchema))
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

			const result = await ctx.prisma.log.createMany({
				data: input.map((log) => ({
					level: log.level,
					source: log.source,
					message: log.message,
					agentId: log.agentId ?? undefined,
					metadata: (log.metadata ?? {}) as object,
					evalId: log.evalId ?? undefined,
					timestamp: log.timestamp,
					organizationId: ctx.activeOrganization.id,
				})),
			})

			return { count: result.count }
		}),

	"logs.list": apiKeyReadProcedure
		.input(
			z
				.object({
					evalId: z.string().optional(),
					level: z.enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]).optional(),
					source: z.string().optional(),
					agentId: z.string().optional(),
					limit: z.number().min(1).max(500).default(100),
					offset: z.number().min(0).default(0),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const where = {
				organizationId: ctx.activeOrganization.id,
				...(input?.evalId && { evalId: input.evalId }),
				...(input?.level && { level: input.level }),
				...(input?.source && { source: input.source }),
				...(input?.agentId && { agentId: input.agentId }),
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

	// ============================================================
	// EVALS
	// ============================================================

	"evals.create": apiKeyWriteProcedure.input(evalCreateSchema).mutation(async ({ ctx, input }) => {
		// Validate project belongs to organization
		const project = await ctx.prisma.project.findFirst({
			where: { id: input.projectId, organizationId: ctx.activeOrganization.id },
		})

		if (!project) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Project not found or does not belong to your organization",
			})
		}

		// If datasetId provided, validate it
		if (input.datasetId) {
			const dataset = await ctx.prisma.dataset.findFirst({
				where: { id: input.datasetId, organizationId: ctx.activeOrganization.id },
			})

			if (!dataset) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Dataset not found or does not belong to your organization",
				})
			}
			if (dataset.projectId !== input.projectId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Dataset does not belong to the specified project",
				})
			}
		}

		return ctx.prisma.eval.create({
			data: {
				name: input.name,
				projectId: input.projectId,
				datasetId: input.datasetId,
				organizationId: ctx.activeOrganization.id,
				status: "PENDING",
			},
		})
	}),

	"evals.update": apiKeyWriteProcedure.input(evalUpdateSchema).mutation(async ({ ctx, input }) => {
		const { id, summary, ...rest } = input

		// Verify eval belongs to organization
		const existing = await ctx.prisma.eval.findFirst({
			where: { id, organizationId: ctx.activeOrganization.id },
		})

		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Eval not found or does not belong to your organization",
			})
		}

		return ctx.prisma.eval.update({
			where: { id },
			data: {
				...rest,
				...(summary !== undefined && { summary: summary as object }),
			},
		})
	}),

	"evals.list": apiKeyReadProcedure
		.input(
			z
				.object({
					projectId: z.string().optional(),
					status: z.enum(["PENDING", "RUNNING", "PASSED", "FAILED"]).optional(),
					limit: z.number().min(1).max(100).default(50),
					offset: z.number().min(0).default(0),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const where = {
				organizationId: ctx.activeOrganization.id,
				...(input?.projectId && { projectId: input.projectId }),
				...(input?.status && { status: input.status }),
			}

			const [evals, total] = await Promise.all([
				ctx.prisma.eval.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: input?.limit ?? 50,
					skip: input?.offset ?? 0,
					include: {
						project: { select: { name: true } },
						dataset: { select: { name: true } },
					},
				}),
				ctx.prisma.eval.count({ where }),
			])

			return { evals, total }
		}),

	"evals.getById": apiKeyReadProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.eval.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
				include: {
					project: true,
					dataset: true,
					traces: { orderBy: { startTime: "desc" }, take: 20 },
					logs: { orderBy: { timestamp: "desc" }, take: 100 },
				},
			})
		}),

	// ============================================================
	// PROJECTS (Read-only for SDK)
	// ============================================================

	"projects.list": apiKeyReadProcedure.query(async ({ ctx }) => {
		return ctx.prisma.project.findMany({
			where: { organizationId: ctx.activeOrganization.id },
			orderBy: { createdAt: "desc" },
			include: {
				_count: {
					select: { evals: true, datasets: true },
				},
			},
		})
	}),

	"projects.getById": apiKeyReadProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.project.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
				include: {
					datasets: { orderBy: { createdAt: "desc" } },
				},
			})
		}),

	// ============================================================
	// DATASETS (Read-only for SDK)
	// ============================================================

	"datasets.list": apiKeyReadProcedure
		.input(
			z
				.object({
					projectId: z.string().optional(),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			return ctx.prisma.dataset.findMany({
				where: {
					organizationId: ctx.activeOrganization.id,
					...(input?.projectId && { projectId: input.projectId }),
				},
				orderBy: { createdAt: "desc" },
				include: {
					project: { select: { name: true } },
				},
			})
		}),

	"datasets.getById": apiKeyReadProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.dataset.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
				include: {
					project: { select: { name: true } },
				},
			})
		}),
})
