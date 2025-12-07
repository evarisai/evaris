import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"
import { auth } from "../auth"
import { prisma } from "../db"

export async function createContext({ req }: FetchCreateContextFnOptions) {
	// Get the session from Better Auth
	const session = await auth.api.getSession({
		headers: req.headers,
	})

	// If user is authenticated, get their personal organization directly
	let activeOrganization = null
	let membership = null
	let needsOrganizationSetup = false

	if (session?.user) {
		// Get user with their personal organization (direct relation, no membership query needed)
		const userWithOrg = await prisma.user.findUnique({
			where: { id: session.user.id },
			include: { personalOrganization: true },
		})

		activeOrganization = userWithOrg?.personalOrganization || null

		// Get membership for the personal organization (for role info)
		if (activeOrganization) {
			membership = await prisma.membership.findUnique({
				where: {
					userId_organizationId: {
						userId: session.user.id,
						organizationId: activeOrganization.id,
					},
				},
				include: { organization: true },
			})
		}

		// If user has no personal organization, they need to complete setup
		// This can happen if organization creation failed during signup
		if (!activeOrganization) {
			needsOrganizationSetup = true
			console.warn(`User ${session.user.id} has no personal organization - needs setup`)
		}
	}

	return {
		prisma,
		req,
		session,
		user: session?.user || null,
		activeOrganization,
		membership,
		needsOrganizationSetup,
	}
}

export type Context = Awaited<ReturnType<typeof createContext>>
