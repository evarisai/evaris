import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/server/auth"
import { prisma } from "@/server/db"

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:4000"

async function handler({ request }: { request: Request }) {
	// Verify authentication
	const session = await auth.api.getSession({ headers: request.headers })

	if (!session?.user?.id) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		})
	}

	const userId = session.user.id

	// Get dataset ID from query params
	const url = new URL(request.url)
	const datasetId = url.searchParams.get("datasetId")

	if (!datasetId) {
		return new Response(JSON.stringify({ error: "datasetId is required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		})
	}

	try {
		// Fetch dataset to get organizationId
		const dataset = await prisma.dataset.findUnique({
			where: { id: datasetId },
			select: { organizationId: true },
		})

		if (!dataset) {
			return new Response(JSON.stringify({ error: "Dataset not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			})
		}

		// Verify user is a member of the organization
		const membership = await prisma.membership.findUnique({
			where: {
				userId_organizationId: {
					userId,
					organizationId: dataset.organizationId,
				},
			},
		})

		if (!membership) {
			return new Response(JSON.stringify({ error: "You don't have access to this dataset" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			})
		}

		// Check role - viewers can't upload
		if (membership.role === "VIEWER") {
			return new Response(JSON.stringify({ error: "Viewers cannot upload files" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			})
		}

		// Forward the multipart form data to the backend
		const formData = await request.formData()

		const backendResponse = await fetch(`${BACKEND_API_URL}/api/v1/datasets/${datasetId}/upload`, {
			method: "POST",
			body: formData,
			headers: {
				"X-User-Id": userId,
			},
		})

		const result = await backendResponse.json()

		return new Response(JSON.stringify(result), {
			status: backendResponse.status,
			headers: { "Content-Type": "application/json" },
		})
	} catch (error) {
		console.error("Dataset upload error:", error)
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Upload failed",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		)
	}
}

export const Route = createFileRoute("/api/datasets/upload")({
	server: {
		handlers: {
			POST: handler,
		},
	},
})
