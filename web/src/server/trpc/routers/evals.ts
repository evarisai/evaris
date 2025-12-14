import { TRPCError } from "@trpc/server"
import { z } from "zod"
import type { Context } from "../context"
import { organizationProcedure, router } from "../trpc"

// Backend API URL (Hono server)
const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:4000"

// Helper to validate project and dataset belong to organization
async function validateProjectAndDataset(
	prisma: Context["prisma"],
	organizationId: string,
	projectId: string,
	datasetId: string
) {
	const [project, dataset] = await Promise.all([
		prisma.project.findFirst({
			where: { id: projectId, organizationId },
		}),
		prisma.dataset.findFirst({
			where: { id: datasetId, organizationId },
		}),
	])

	if (!project) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Project not found or does not belong to your organization",
		})
	}
	if (!dataset) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Dataset not found or does not belong to your organization",
		})
	}

	// Also verify dataset belongs to the specified project
	if (dataset.projectId !== projectId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Dataset does not belong to the specified project",
		})
	}

	return { project, dataset }
}

export const evalsRouter = router({
	list: organizationProcedure
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

	getById: organizationProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.eval.findUnique({
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

	getByIdWithResults: organizationProcedure
		.input(
			z.object({
				id: z.string(),
				resultsLimit: z.number().min(1).max(500).default(100),
				resultsOffset: z.number().min(0).default(0),
			})
		)
		.query(async ({ ctx, input }) => {
			const [evalData, testResults, totalResults] = await Promise.all([
				ctx.prisma.eval.findUnique({
					where: {
						id: input.id,
						organizationId: ctx.activeOrganization.id,
					},
					include: {
						project: true,
						dataset: true,
						experiment: true,
						baselineEval: {
							select: { id: true, name: true, accuracy: true },
						},
					},
				}),
				ctx.prisma.testResult.findMany({
					where: { evalId: input.id },
					orderBy: { createdAt: "asc" },
					take: input.resultsLimit,
					skip: input.resultsOffset,
					include: {
						metricScores: true,
					},
				}),
				ctx.prisma.testResult.count({
					where: { evalId: input.id },
				}),
			])

			if (!evalData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Evaluation not found",
				})
			}

			return {
				...evalData,
				testResults,
				totalResults,
			}
		}),

	create: organizationProcedure
		.input(
			z.object({
				name: z.string().min(1),
				projectId: z.string(),
				datasetId: z.string().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
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
				await validateProjectAndDataset(
					ctx.prisma,
					ctx.activeOrganization.id,
					input.projectId,
					input.datasetId
				)
			}

			return ctx.prisma.eval.create({
				data: {
					name: input.name,
					projectId: input.projectId,
					datasetId: input.datasetId,
					organizationId: ctx.activeOrganization.id,
					createdById: ctx.user.id,
					status: "PENDING",
				},
			})
		}),

	updateStatus: organizationProcedure
		.input(
			z.object({
				id: z.string(),
				status: z.enum(["PENDING", "RUNNING", "PASSED", "FAILED"]),
				total: z.number().optional(),
				passed: z.number().optional(),
				failed: z.number().optional(),
				accuracy: z.number().optional(),
				summary: z.record(z.unknown()).optional(),
				completedAt: z.date().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, summary, ...rest } = input
			return ctx.prisma.eval.update({
				where: {
					id,
					organizationId: ctx.activeOrganization.id,
				},
				data: {
					...rest,
					...(summary !== undefined && { summary: summary as object }),
				},
			})
		}),

	delete: organizationProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.eval.delete({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
			})
		}),

	// Update eval (name only - status changes should use updateStatus)
	update: organizationProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input
			return ctx.prisma.eval.update({
				where: {
					id,
					organizationId: ctx.activeOrganization.id,
				},
				data,
			})
		}),

	// Get stats for dashboard - optimized to use groupBy for single DB query
	getStats: organizationProcedure.query(async ({ ctx }) => {
		const where = { organizationId: ctx.activeOrganization.id }

		// Use groupBy to get all status counts in a single query
		const [statusCounts, avgAccuracy] = await Promise.all([
			ctx.prisma.eval.groupBy({
				by: ["status"],
				where,
				_count: { status: true },
			}),
			ctx.prisma.eval.aggregate({
				_avg: { accuracy: true },
				where: { ...where, accuracy: { not: null } },
			}),
		])

		// Convert groupBy results to status counts
		const counts = statusCounts.reduce(
			(acc, item) => {
				acc[item.status] = item._count.status
				return acc
			},
			{ PENDING: 0, RUNNING: 0, PASSED: 0, FAILED: 0 } as Record<string, number>
		)

		return {
			total: Object.values(counts).reduce((a, b) => a + b, 0),
			passed: counts.PASSED,
			failed: counts.FAILED,
			running: counts.RUNNING,
			avgAccuracy: avgAccuracy._avg.accuracy ?? 0,
		}
	}),

	// ============================================================
	// RUN EVALUATION - This triggers a background job via Hono API
	// ============================================================
	// This is the key integration point between TanStack Start and Hono.
	// 1. tRPC creates the eval record in the database
	// 2. tRPC calls Hono API to queue the background job
	// 3. Hono worker processes the job asynchronously
	// 4. Worker updates the database when done
	run: organizationProcedure
		.input(
			z.object({
				name: z.string().min(1),
				projectId: z.string(),
				datasetId: z.string(),
				modelConfig: z.object({
					provider: z.enum(["openai", "anthropic", "google", "custom"]),
					model: z.string(),
					temperature: z.number().min(0).max(2).optional(),
					maxTokens: z.number().optional(),
				}),
				metrics: z.array(z.string()).optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Validate project and dataset belong to organization
			await validateProjectAndDataset(
				ctx.prisma,
				ctx.activeOrganization.id,
				input.projectId,
				input.datasetId
			)

			// Step 1: Create the eval record in the database (PENDING status)
			const evalRecord = await ctx.prisma.eval.create({
				data: {
					name: input.name,
					projectId: input.projectId,
					datasetId: input.datasetId,
					organizationId: ctx.activeOrganization.id,
					createdById: ctx.user.id,
					status: "PENDING",
				},
			})

			// Step 2: Call Hono backend to queue the background job
			try {
				const controller = new AbortController()
				const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

				const response = await fetch(`${BACKEND_API_URL}/api/v1/evals`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						// Include organization context for backend authorization
						"X-Organization-Id": ctx.activeOrganization.id,
					},
					body: JSON.stringify({
						evalId: evalRecord.id,
						projectId: input.projectId,
						datasetId: input.datasetId,
						modelConfig: input.modelConfig,
						metrics: input.metrics || ["accuracy", "latency"],
						name: input.name,
						organizationId: ctx.activeOrganization.id,
					}),
					signal: controller.signal,
				})

				clearTimeout(timeoutId)

				if (!response.ok) {
					await ctx.prisma.eval.update({
						where: { id: evalRecord.id },
						data: { status: "FAILED" },
					})
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to queue evaluation job",
					})
				}

				const jobData = await response.json()

				return {
					...evalRecord,
					jobId: jobData.jobId,
					message: "Evaluation queued successfully",
				}
			} catch (error) {
				// Update status to FAILED on any error
				await ctx.prisma.eval.update({
					where: { id: evalRecord.id },
					data: { status: "FAILED" },
				})

				if (error instanceof TRPCError) {
					throw error
				}
				if (error instanceof Error && error.name === "AbortError") {
					throw new TRPCError({
						code: "TIMEOUT",
						message: "Request to evaluation backend timed out",
					})
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to queue evaluation job",
					cause: error,
				})
			}
		}),

	// Get job status from Hono backend - now requires organization context
	getJobStatus: organizationProcedure
		.input(z.object({ jobId: z.string(), evalId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Verify the eval belongs to the user's organization
			const evalRecord = await ctx.prisma.eval.findFirst({
				where: {
					id: input.evalId,
					organizationId: ctx.activeOrganization.id,
				},
			})

			if (!evalRecord) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Eval not found or does not belong to your organization",
				})
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

			try {
				const response = await fetch(`${BACKEND_API_URL}/api/v1/jobs/${input.jobId}`, {
					headers: {
						"X-Organization-Id": ctx.activeOrganization.id,
					},
					signal: controller.signal,
				})

				clearTimeout(timeoutId)

				if (!response.ok) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Job not found",
					})
				}

				return response.json()
			} catch (error) {
				clearTimeout(timeoutId)
				if (error instanceof TRPCError) {
					throw error
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch job status",
				})
			}
		}),
})
