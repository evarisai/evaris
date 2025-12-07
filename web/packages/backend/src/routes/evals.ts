import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { z } from "zod"
import { sendEvalJob } from "../lib/queue"

const evalsRoutes = new Hono()

// Schema for creating an evaluation
const createEvalSchema = z.object({
	projectId: z.string(),
	datasetId: z.string(),
	modelConfig: z.object({
		provider: z.enum(["openai", "anthropic", "google", "custom"]),
		model: z.string(),
		temperature: z.number().min(0).max(2).optional(),
		maxTokens: z.number().optional(),
	}),
	metrics: z.array(z.string()).optional(),
	name: z.string().optional(),
})

// List all evaluations
evalsRoutes.get("/", async (c) => {
	// TODO: Fetch from database
	return c.json({
		data: [],
		pagination: {
			page: 1,
			limit: 20,
			total: 0,
		},
	})
})

// Get a specific evaluation
evalsRoutes.get("/:id", async (c) => {
	const id = c.req.param("id")
	// TODO: Fetch from database
	return c.json({ id, status: "not_found" }, 404)
})

// Create a new evaluation (queues the job)
evalsRoutes.post("/", zValidator("json", createEvalSchema), async (c) => {
	const body = c.req.valid("json")

	// Generate a unique ID for this evaluation
	const evalId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

	// Add the evaluation job to the queue
	const jobId = await sendEvalJob({
		evalId,
		projectId: body.projectId,
		datasetId: body.datasetId,
		modelConfig: body.modelConfig,
		metrics: body.metrics || ["accuracy", "latency"],
		name: body.name || `Evaluation ${evalId}`,
	})

	return c.json(
		{
			id: evalId,
			jobId,
			status: "queued",
			message: "Evaluation has been queued for processing",
		},
		202
	)
})

// Cancel an evaluation
evalsRoutes.post("/:id/cancel", async (c) => {
	const id = c.req.param("id")
	// TODO: Cancel the job in the queue
	return c.json({ id, status: "cancelled" })
})

// Rerun an evaluation
evalsRoutes.post("/:id/rerun", async (c) => {
	const id = c.req.param("id")
	// TODO: Fetch original eval and requeue
	return c.json({ id, status: "requeued" })
})

export { evalsRoutes }
