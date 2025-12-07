import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { z } from "zod"

const datasetsRoutes = new Hono()

const createDatasetSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().optional(),
	format: z.enum(["json", "jsonl", "csv"]).default("jsonl"),
})

// List all datasets
datasetsRoutes.get("/", async (c) => {
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

// Get a specific dataset
datasetsRoutes.get("/:id", async (c) => {
	const id = c.req.param("id")
	// TODO: Fetch from database
	return c.json({ id, status: "not_found" }, 404)
})

// Create a new dataset
datasetsRoutes.post("/", zValidator("json", createDatasetSchema), async (c) => {
	const body = c.req.valid("json")
	const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

	// TODO: Save to database
	return c.json(
		{
			id,
			...body,
			itemCount: 0,
			createdAt: new Date().toISOString(),
		},
		201
	)
})

// Upload data to a dataset
datasetsRoutes.post("/:id/upload", async (c) => {
	const id = c.req.param("id")
	const body = await c.req.parseBody()

	// TODO: Handle file upload and process data
	const file = body.file

	if (!file || !(file instanceof File)) {
		return c.json({ error: "No file provided" }, 400)
	}

	return c.json({
		id,
		filename: file.name,
		size: file.size,
		status: "processing",
	})
})

// Delete a dataset
datasetsRoutes.delete("/:id", async (c) => {
	const id = c.req.param("id")
	// TODO: Delete from database
	return c.json({ id, deleted: true })
})

export { datasetsRoutes }
