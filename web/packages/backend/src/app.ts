import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { prettyJSON } from "hono/pretty-json"
import { secureHeaders } from "hono/secure-headers"
import { timing } from "hono/timing"
import { errorHandler } from "./middleware/error-handler"
import { datasetsRoutes } from "./routes/datasets"
import { evalsRoutes } from "./routes/evals"
import { healthRoutes } from "./routes/health"
import { jobsRoutes } from "./routes/jobs"
import { projectsRoutes } from "./routes/projects"
import { sdkRoutes } from "./routes/sdk"

// Create the main Hono app
const app = new Hono()

// Global middleware
app.use("*", logger())
app.use("*", timing())
app.use("*", secureHeaders())
app.use("*", prettyJSON())
app.use(
	"*",
	cors({
		origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
		credentials: true,
	})
)

// Error handling
app.onError(errorHandler)

// Mount routes
app.route("/health", healthRoutes)
app.route("/api/v1/evals", evalsRoutes)
app.route("/api/v1/projects", projectsRoutes)
app.route("/api/v1/datasets", datasetsRoutes)
app.route("/api/v1/jobs", jobsRoutes)

// SDK routes (for Python/TypeScript SDK clients)
// These proxy to the internal evaris-server after validating API keys
app.route("/api", sdkRoutes)

// Root endpoint
app.get("/", (c) => {
	return c.json({
		name: "Evaris Backend API",
		version: "1.0.0",
		docs: "/api/v1",
	})
})

// 404 handler
app.notFound((c) => {
	return c.json({ error: "Not Found", path: c.req.path }, 404)
})

export { app }
export type AppType = typeof app
