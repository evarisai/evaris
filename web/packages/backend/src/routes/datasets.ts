import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { z } from "zod"
import { prisma } from "../lib/db"
import {
	uploadDatasetFile,
	deleteDatasetFile,
	validateDatasetFile,
	countJsonlLines,
	getSignedUrl,
	downloadFile,
	updateFile,
} from "../lib/storage"

const datasetsRoutes = new Hono()

const createDatasetSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().optional(),
	organizationId: z.string(),
	projectId: z.string(),
})

// List all datasets for a project
datasetsRoutes.get("/", async (c) => {
	const projectId = c.req.query("projectId")
	const organizationId = c.req.query("organizationId")

	if (!projectId || !organizationId) {
		return c.json({ error: "projectId and organizationId are required" }, 400)
	}

	const datasets = await prisma.dataset.findMany({
		where: { projectId, organizationId },
		orderBy: { createdAt: "desc" },
		include: {
			files: {
				select: { id: true, itemCount: true },
			},
			_count: { select: { files: true } },
		},
	})

	// Add computed fields
	const datasetsWithCounts = datasets.map((dataset) => ({
		...dataset,
		totalItems: dataset.files.reduce((sum, file) => sum + file.itemCount, 0),
		fileCount: dataset._count.files,
	}))

	return c.json({
		data: datasetsWithCounts,
		pagination: {
			page: 1,
			limit: 20,
			total: datasets.length,
		},
	})
})

// Get a specific dataset with all files
datasetsRoutes.get("/:id", async (c) => {
	const id = c.req.param("id")

	const dataset = await prisma.dataset.findUnique({
		where: { id },
		include: {
			files: {
				orderBy: { createdAt: "desc" },
				include: {
					uploadedBy: {
						select: { id: true, name: true, email: true },
					},
				},
			},
		},
	})

	if (!dataset) {
		return c.json({ error: "Dataset not found" }, 404)
	}

	return c.json({
		...dataset,
		totalItems: dataset.files.reduce((sum, file) => sum + file.itemCount, 0),
		fileCount: dataset.files.length,
	})
})

// Create a new dataset (metadata only)
datasetsRoutes.post("/", zValidator("json", createDatasetSchema), async (c) => {
	const body = c.req.valid("json")

	const dataset = await prisma.dataset.create({
		data: {
			name: body.name,
			description: body.description,
			organizationId: body.organizationId,
			projectId: body.projectId,
		},
	})

	return c.json(dataset, 201)
})

// Upload a file to a dataset (creates a DatasetFile record)
datasetsRoutes.post("/:id/upload", async (c) => {
	const id = c.req.param("id")
	const userId = c.req.header("X-User-Id") // Passed from the proxy

	// Verify dataset exists
	const dataset = await prisma.dataset.findUnique({
		where: { id },
	})

	if (!dataset) {
		return c.json({ error: "Dataset not found" }, 404)
	}

	// Parse multipart form data
	const body = await c.req.parseBody()
	const file = body.file

	if (!file || !(file instanceof File)) {
		return c.json({ error: "No file provided" }, 400)
	}

	try {
		// Validate file
		validateDatasetFile(file)

		// Count items in the file
		const itemCount = await countJsonlLines(file)

		if (itemCount === 0) {
			return c.json({ error: "File contains no valid JSON lines" }, 400)
		}

		// Determine format from extension
		const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
		const format =
			ext === ".json"
				? "JSON"
				: ext === ".csv"
					? "CSV"
					: ext === ".ndjson" || ext === ".jsonl"
						? "JSONL"
						: "JSONL"

		// Upload to storage
		const { fileSize, filePath } = await uploadDatasetFile(dataset.organizationId, dataset.id, file)

		// Create DatasetFile record
		const datasetFile = await prisma.datasetFile.create({
			data: {
				name: file.name,
				format,
				itemCount,
				filePath,
				fileSize,
				mimeType: file.type || null,
				datasetId: id,
				uploadedById: userId || null,
			},
		})

		return c.json({
			id: datasetFile.id,
			name: datasetFile.name,
			format: datasetFile.format,
			fileSize: datasetFile.fileSize,
			itemCount: datasetFile.itemCount,
			filePath: datasetFile.filePath,
			createdAt: datasetFile.createdAt,
			status: "completed",
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : "Upload failed"
		console.error(`Dataset file upload failed for dataset ${id}:`, message)
		return c.json({ error: message }, 400)
	}
})

// Get download URL for a specific file
datasetsRoutes.get("/files/:fileId/download", async (c) => {
	const fileId = c.req.param("fileId")

	const file = await prisma.datasetFile.findUnique({
		where: { id: fileId },
	})

	if (!file) {
		return c.json({ error: "File not found" }, 404)
	}

	try {
		const signedUrl = await getSignedUrl(file.filePath, 3600) // 1 hour expiry
		return c.json({ downloadUrl: signedUrl })
	} catch (error) {
		console.error(`Failed to generate download URL for file ${fileId}:`, error)
		return c.json({ error: "Failed to generate download URL" }, 500)
	}
})

// Get file content for editing
datasetsRoutes.get("/files/:fileId/content", async (c) => {
	const fileId = c.req.param("fileId")

	const file = await prisma.datasetFile.findUnique({
		where: { id: fileId },
	})

	if (!file) {
		return c.json({ error: "File not found" }, 404)
	}

	try {
		const content = await downloadFile(file.filePath)
		return c.json({
			id: file.id,
			name: file.name,
			format: file.format,
			content,
			fileSize: file.fileSize,
			itemCount: file.itemCount,
		})
	} catch (error) {
		console.error(`Failed to read file ${fileId}:`, error)
		return c.json({ error: "Failed to read file content" }, 500)
	}
})

// Update file content
datasetsRoutes.put("/files/:fileId/content", async (c) => {
	const fileId = c.req.param("fileId")

	const file = await prisma.datasetFile.findUnique({
		where: { id: fileId },
	})

	if (!file) {
		return c.json({ error: "File not found" }, 404)
	}

	try {
		const body = await c.req.json()
		const { content } = body as { content: string }

		if (typeof content !== "string") {
			return c.json({ error: "content is required" }, 400)
		}

		// Update file in storage
		const { fileSize, itemCount } = await updateFile(file.filePath, content)

		// Update database record
		const updatedFile = await prisma.datasetFile.update({
			where: { id: fileId },
			data: {
				fileSize,
				itemCount,
			},
		})

		return c.json({
			id: updatedFile.id,
			name: updatedFile.name,
			format: updatedFile.format,
			fileSize: updatedFile.fileSize,
			itemCount: updatedFile.itemCount,
			updatedAt: updatedFile.updatedAt,
		})
	} catch (error) {
		console.error(`Failed to update file ${fileId}:`, error)
		return c.json(
			{
				error: error instanceof Error ? error.message : "Failed to update file content",
			},
			500
		)
	}
})

// Delete a specific file
datasetsRoutes.delete("/files/:fileId", async (c) => {
	const fileId = c.req.param("fileId")

	const file = await prisma.datasetFile.findUnique({
		where: { id: fileId },
	})

	if (!file) {
		return c.json({ error: "File not found" }, 404)
	}

	// Delete file from storage
	await deleteDatasetFile(file.filePath)

	// Delete from database
	await prisma.datasetFile.delete({
		where: { id: fileId },
	})

	return c.json({ id: fileId, deleted: true })
})

// Delete a dataset and all its files
datasetsRoutes.delete("/:id", async (c) => {
	const id = c.req.param("id")

	const dataset = await prisma.dataset.findUnique({
		where: { id },
		include: { files: true },
	})

	if (!dataset) {
		return c.json({ error: "Dataset not found" }, 404)
	}

	// Delete all files from storage
	for (const file of dataset.files) {
		await deleteDatasetFile(file.filePath)
	}

	// Delete from database (cascade will delete files)
	await prisma.dataset.delete({
		where: { id },
	})

	return c.json({ id, deleted: true })
})

export { datasetsRoutes }
