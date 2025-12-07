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

			const [datasets, total] = await Promise.all([
				ctx.prisma.dataset.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: input?.limit ?? 50,
					skip: input?.offset ?? 0,
					include: {
						project: { select: { name: true } },
						_count: { select: { evals: true } },
					},
				}),
				ctx.prisma.dataset.count({ where }),
			])

			return { datasets, total }
		}),

	getById: organizationProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.dataset.findUnique({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
				include: {
					project: true,
					evals: { orderBy: { createdAt: "desc" }, take: 10 },
				},
			})
		}),

	create: organizationProcedure
		.input(
			z.object({
				name: z.string().min(1),
				description: z.string().optional(),
				projectId: z.string(),
				itemCount: z.number().default(0),
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
					itemCount: input.itemCount,
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
				itemCount: z.number().optional(),
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
})
