import { router } from "../trpc"
import { apiKeysRouter } from "./apiKeys"
import { datasetsRouter } from "./datasets"
import { evalsRouter } from "./evals"
import { invitationsRouter } from "./invitations"
import { logsRouter } from "./logs"
import { projectsRouter } from "./projects"
import { sdkRouter } from "./sdk"
import { teamRouter } from "./team"
import { tracesRouter } from "./traces"

export const appRouter = router({
	// Web UI routers (session auth)
	projects: projectsRouter,
	evals: evalsRouter,
	datasets: datasetsRouter,
	logs: logsRouter,
	traces: tracesRouter,
	apiKeys: apiKeysRouter,
	invitations: invitationsRouter,
	team: teamRouter,

	// SDK/External API router (API key auth)
	sdk: sdkRouter,
})

export type AppRouter = typeof appRouter
