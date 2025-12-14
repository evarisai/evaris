import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { organizationProcedure, router } from "../trpc"

export const datasetsRouter = router({
	list: organizationProcedure
		.input(
			z
				.object({
					projectId: z.string().optional(),
					limit: z.number().min(1).max(100).default(50),
					offset: z.number().min(0).default(0),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const where = {
				organizationId: ctx.activeOrganization.id,
				...(input?.projectId && { projectId: input.projectId }),
			}

			// Run all queries in parallel - don't fetch all files just to sum their counts
			const [datasets, total, itemCountsByDataset] = await Promise.all([
				ctx.prisma.dataset.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: input?.limit ?? 50,
					skip: input?.offset ?? 0,
					include: {
						project: { select: { name: true } },
						_count: { select: { evals: true, files: true } },
					},
				}),
				ctx.prisma.dataset.count({ where }),
				// Use groupBy to efficiently sum itemCount per dataset without fetching all files
				ctx.prisma.datasetFile.groupBy({
					by: ["datasetId"],
					_sum: { itemCount: true },
					where: {
						dataset: { organizationId: ctx.activeOrganization.id },
						...(input?.projectId && { dataset: { projectId: input.projectId } }),
					},
				}),
			])

			// Create a map for O(1) lookup of item counts
			const itemCountMap = new Map(
				itemCountsByDataset.map((item) => [item.datasetId, item._sum.itemCount ?? 0])
			)

			const datasetsWithCounts = datasets.map((dataset) => ({
				...dataset,
				totalItems: itemCountMap.get(dataset.id) ?? 0,
				fileCount: dataset._count.files,
			}))

			return { datasets: datasetsWithCounts, total }
		}),

	getById: organizationProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const dataset = await ctx.prisma.dataset.findUnique({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
				include: {
					project: true,
					evals: { orderBy: { createdAt: "desc" }, take: 10 },
					files: {
						orderBy: { createdAt: "desc" },
						include: {
							uploadedBy: {
								select: { id: true, name: true, email: true, image: true },
							},
						},
					},
				},
			})

			if (!dataset) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Dataset not found",
				})
			}

			return {
				...dataset,
				totalItems: dataset.files.reduce((sum, file) => sum + file.itemCount, 0),
				fileCount: dataset.files.length,
			}
		}),

	create: organizationProcedure
		.input(
			z.object({
				name: z.string().min(1),
				description: z.string().optional(),
				projectId: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Validate that the project belongs to the organization
			const project = await ctx.prisma.project.findFirst({
				where: {
					id: input.projectId,
					organizationId: ctx.activeOrganization.id,
				},
			})
			if (!project) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Project not found or does not belong to your organization",
				})
			}

			return ctx.prisma.dataset.create({
				data: {
					name: input.name,
					description: input.description,
					projectId: input.projectId,
					organizationId: ctx.activeOrganization.id,
				},
			})
		}),

	update: organizationProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				description: z.string().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input
			return ctx.prisma.dataset.update({
				where: {
					id,
					organizationId: ctx.activeOrganization.id,
				},
				data,
			})
		}),

	delete: organizationProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.dataset.delete({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
			})
		}),

	// File operations
	deleteFile: organizationProcedure
		.input(z.object({ fileId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// First verify the file belongs to a dataset in this org
			const file = await ctx.prisma.datasetFile.findFirst({
				where: { id: input.fileId },
				include: { dataset: true },
			})

			if (!file || file.dataset.organizationId !== ctx.activeOrganization.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "File not found",
				})
			}

			return ctx.prisma.datasetFile.delete({
				where: { id: input.fileId },
			})
		}),

	getFileContent: organizationProcedure
		.input(z.object({ fileId: z.string() }))
		.query(async ({ ctx, input }) => {
			const file = await ctx.prisma.datasetFile.findFirst({
				where: { id: input.fileId },
				include: { dataset: true },
			})

			if (!file || file.dataset.organizationId !== ctx.activeOrganization.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "File not found",
				})
			}

			// Return file metadata - actual content fetching is done via signed URL
			return {
				id: file.id,
				name: file.name,
				format: file.format,
				filePath: file.filePath,
				fileSize: file.fileSize,
				itemCount: file.itemCount,
			}
		}),
})
