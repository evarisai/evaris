import { Hono } from "hono"
import { getJobById, getQueueStats, EVAL_QUEUE } from "../lib/queue"

const jobsRoutes = new Hono()

// Get queue statistics
jobsRoutes.get("/stats", async (c) => {
	const stats = await getQueueStats()
	return c.json(stats)
})

// Get a specific job
jobsRoutes.get("/:id", async (c) => {
	const id = c.req.param("id")
	const job = await getJobById(EVAL_QUEUE, id)

	if (!job) {
		return c.json({ error: "Job not found" }, 404)
	}

	return c.json({
		id: job.id,
		name: job.name,
		data: job.data,
		state: job.state,
		createdOn: job.createdOn,
		startedOn: job.startedOn,
		completedOn: job.completedOn,
		retryCount: job.retryCount,
		output: job.output,
	})
})

export { jobsRoutes }
