import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { organizationProcedure, router } from "../trpc"

export const teamRouter = router({
	// List all members of the organization
	list: organizationProcedure.query(async ({ ctx }) => {
		const memberships = await ctx.prisma.membership.findMany({
			where: { organizationId: ctx.activeOrganization.id },
			orderBy: [{ role: "asc" }, { createdAt: "asc" }],
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		})

		return memberships.map((m) => ({
			id: m.id,
			userId: m.user.id,
			name: m.user.name,
			email: m.user.email,
			image: m.user.image,
			role: m.role,
			joinedAt: m.createdAt,
			isCurrentUser: m.userId === ctx.user.id,
		}))
	}),

	// Update a member's role
	updateRole: organizationProcedure
		.input(
			z.object({
				membershipId: z.string(),
				role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const membership = await ctx.prisma.membership.findFirst({
				where: {
					id: input.membershipId,
					organizationId: ctx.activeOrganization.id,
				},
				include: { user: true },
			})

			if (!membership) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Member not found",
				})
			}

			// Check if user has permission to change roles
			const currentUserMembership = await ctx.prisma.membership.findFirst({
				where: {
					userId: ctx.user.id,
					organizationId: ctx.activeOrganization.id,
				},
			})

			if (!currentUserMembership || !["OWNER", "ADMIN"].includes(currentUserMembership.role)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to change member roles",
				})
			}

			// Cannot change OWNER role
			if (membership.role === "OWNER") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot change the role of the organization owner",
				})
			}

			return ctx.prisma.membership.update({
				where: { id: input.membershipId },
				data: { role: input.role },
				select: {
					id: true,
					role: true,
					user: {
						select: { name: true, email: true },
					},
				},
			})
		}),

	// Remove a member from the organization
	remove: organizationProcedure
		.input(z.object({ membershipId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const membership = await ctx.prisma.membership.findFirst({
				where: {
					id: input.membershipId,
					organizationId: ctx.activeOrganization.id,
				},
			})

			if (!membership) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Member not found",
				})
			}

			// Check if user has permission to remove members
			const currentUserMembership = await ctx.prisma.membership.findFirst({
				where: {
					userId: ctx.user.id,
					organizationId: ctx.activeOrganization.id,
				},
			})

			if (!currentUserMembership || !["OWNER", "ADMIN"].includes(currentUserMembership.role)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to remove members",
				})
			}

			// Cannot remove the owner
			if (membership.role === "OWNER") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot remove the organization owner",
				})
			}

			// Cannot remove yourself (use leave instead)
			if (membership.userId === ctx.user.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot remove yourself. Use leave organization instead.",
				})
			}

			return ctx.prisma.membership.delete({
				where: { id: input.membershipId },
			})
		}),

	// Leave the organization (for non-owners)
	leave: organizationProcedure.mutation(async ({ ctx }) => {
		const membership = await ctx.prisma.membership.findFirst({
			where: {
				userId: ctx.user.id,
				organizationId: ctx.activeOrganization.id,
			},
		})

		if (!membership) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "You are not a member of this organization",
			})
		}

		// Owner cannot leave
		if (membership.role === "OWNER") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message:
					"Organization owner cannot leave. Transfer ownership first or delete the organization.",
			})
		}

		return ctx.prisma.membership.delete({
			where: { id: membership.id },
		})
	}),
})
