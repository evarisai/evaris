import { Hono } from "hono"
import { getQueueStats } from "../lib/queue"

const healthRoutes = new Hono()

healthRoutes.get("/", async (c) => {
	const stats = await getQueueStats()

	return c.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		queues: stats,
	})
})

healthRoutes.get("/ready", (c) => {
	return c.json({ ready: true })
})

healthRoutes.get("/live", (c) => {
	return c.json({ live: true })
})

export { healthRoutes }
