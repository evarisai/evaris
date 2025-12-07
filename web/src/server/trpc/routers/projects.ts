import { z } from "zod"
import { organizationProcedure, router } from "../trpc"

export const projectsRouter = router({
	list: organizationProcedure.query(async ({ ctx }) => {
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

	getById: organizationProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.project.findUnique({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
				include: {
					evals: { orderBy: { createdAt: "desc" }, take: 10 },
					datasets: { orderBy: { createdAt: "desc" } },
				},
			})
		}),

	create: organizationProcedure
		.input(
			z.object({
				name: z.string().min(1),
				description: z.string().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.project.create({
				data: {
					...input,
					organizationId: ctx.activeOrganization.id,
					createdById: ctx.user.id,
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
			return ctx.prisma.project.update({
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
			return ctx.prisma.project.delete({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
			})
		}),
})
