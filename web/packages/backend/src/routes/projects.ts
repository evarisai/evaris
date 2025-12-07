import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { z } from "zod"

const projectsRoutes = new Hono()

const createProjectSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
})

const updateProjectSchema = createProjectSchema.partial()

// List all projects
projectsRoutes.get("/", async (c) => {
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

// Get a specific project
projectsRoutes.get("/:id", async (c) => {
	const id = c.req.param("id")
	// TODO: Fetch from database
	return c.json({ id, status: "not_found" }, 404)
})

// Create a new project
projectsRoutes.post("/", zValidator("json", createProjectSchema), async (c) => {
	const body = c.req.valid("json")
	const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

	// TODO: Save to database
	return c.json(
		{
			id,
			...body,
			createdAt: new Date().toISOString(),
		},
		201
	)
})

// Update a project
projectsRoutes.patch("/:id", zValidator("json", updateProjectSchema), async (c) => {
	const id = c.req.param("id")
	const body = c.req.valid("json")

	// TODO: Update in database
	return c.json({ id, ...body, updatedAt: new Date().toISOString() })
})

// Delete a project
projectsRoutes.delete("/:id", async (c) => {
	const id = c.req.param("id")
	// TODO: Delete from database
	return c.json({ id, deleted: true })
})

export { projectsRoutes }
