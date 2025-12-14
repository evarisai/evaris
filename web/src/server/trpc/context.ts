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
		// Single query to get user with personal organization AND memberships
		// This eliminates the second sequential DB query for membership lookup
		const userWithOrg = await prisma.user.findUnique({
			where: { id: session.user.id },
			include: {
				personalOrganization: true,
				memberships: {
					include: { organization: true },
				},
			},
		})

		activeOrganization = userWithOrg?.personalOrganization || null

		// Find the membership for the personal organization from the already-fetched data
		if (activeOrganization && userWithOrg?.memberships) {
			const orgId = activeOrganization.id
			membership = userWithOrg.memberships.find((m) => m.organizationId === orgId) || null
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
