import { randomBytes } from "node:crypto"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { organizationProcedure, publicProcedure, router } from "../trpc"

// Generate a secure invitation token
function generateInvitationToken(): string {
	return randomBytes(32).toString("base64url")
}

// Default invitation expiry (7 days)
const INVITATION_EXPIRY_DAYS = 7

export const invitationsRouter = router({
	// List all invitations for the organization
	list: organizationProcedure.query(async ({ ctx }) => {
		return ctx.prisma.invitation.findMany({
			where: { organizationId: ctx.activeOrganization.id },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				email: true,
				role: true,
				status: true,
				expiresAt: true,
				createdAt: true,
				invitedBy: {
					select: { name: true, email: true },
				},
			},
		})
	}),

	// Create a new invitation
	create: organizationProcedure
		.input(
			z.object({
				email: z.string().email(),
				role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Check if user is already a member
			const existingMember = await ctx.prisma.membership.findFirst({
				where: {
					organizationId: ctx.activeOrganization.id,
					user: { email: input.email },
				},
			})

			if (existingMember) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "This user is already a member of the organization",
				})
			}

			// Check if there's already a pending invitation
			const existingInvitation = await ctx.prisma.invitation.findFirst({
				where: {
					email: input.email,
					organizationId: ctx.activeOrganization.id,
					status: "PENDING",
				},
			})

			if (existingInvitation) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "An invitation has already been sent to this email",
				})
			}

			const token = generateInvitationToken()
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

			const invitation = await ctx.prisma.invitation.create({
				data: {
					email: input.email,
					role: input.role,
					token,
					expiresAt,
					organizationId: ctx.activeOrganization.id,
					invitedById: ctx.user.id,
				},
				select: {
					id: true,
					email: true,
					role: true,
					status: true,
					expiresAt: true,
					createdAt: true,
				},
			})

			// TODO: Send invitation email with token
			// For now, we'll just return the invitation
			// In production, you'd integrate with an email service like Resend, SendGrid, etc.

			return invitation
		}),

	// Resend an invitation (generate new token and expiry)
	resend: organizationProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const invitation = await ctx.prisma.invitation.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
					status: "PENDING",
				},
			})

			if (!invitation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invitation not found or already processed",
				})
			}

			const token = generateInvitationToken()
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

			const updated = await ctx.prisma.invitation.update({
				where: { id: input.id },
				data: { token, expiresAt },
				select: {
					id: true,
					email: true,
					role: true,
					status: true,
					expiresAt: true,
				},
			})

			// TODO: Resend invitation email

			return updated
		}),

	// Revoke a pending invitation
	revoke: organizationProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const invitation = await ctx.prisma.invitation.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
					status: "PENDING",
				},
			})

			if (!invitation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invitation not found or already processed",
				})
			}

			return ctx.prisma.invitation.update({
				where: { id: input.id },
				data: { status: "REVOKED" },
				select: {
					id: true,
					email: true,
					status: true,
				},
			})
		}),

	// Delete an invitation (only revoked or expired can be deleted)
	delete: organizationProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const invitation = await ctx.prisma.invitation.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.activeOrganization.id,
				},
			})

			if (!invitation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invitation not found",
				})
			}

			return ctx.prisma.invitation.delete({
				where: { id: input.id },
			})
		}),

	// Accept an invitation (public endpoint - doesn't require auth initially)
	accept: publicProcedure
		.input(z.object({ token: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const invitation = await ctx.prisma.invitation.findUnique({
				where: { token: input.token },
				include: { organization: true },
			})

			if (!invitation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invitation not found or invalid",
				})
			}

			if (invitation.status !== "PENDING") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `This invitation has already been ${invitation.status.toLowerCase()}`,
				})
			}

			if (new Date() > invitation.expiresAt) {
				// Mark as expired
				await ctx.prisma.invitation.update({
					where: { id: invitation.id },
					data: { status: "EXPIRED" },
				})
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This invitation has expired",
				})
			}

			// Check if user is logged in
			const session = ctx.session
			if (!session?.user) {
				// User needs to sign up or log in first
				// Return the invitation details so the frontend can redirect to signup/login
				return {
					requiresAuth: true,
					email: invitation.email,
					organizationName: invitation.organization.name,
				}
			}

			// Verify email matches
			if (session.user.email !== invitation.email) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This invitation was sent to a different email address",
				})
			}

			// Create membership and mark invitation as accepted
			await ctx.prisma.$transaction([
				ctx.prisma.membership.create({
					data: {
						userId: session.user.id,
						organizationId: invitation.organizationId,
						role: invitation.role,
					},
				}),
				ctx.prisma.invitation.update({
					where: { id: invitation.id },
					data: { status: "ACCEPTED" },
				}),
			])

			return {
				requiresAuth: false,
				organizationId: invitation.organizationId,
				organizationName: invitation.organization.name,
			}
		}),
})
