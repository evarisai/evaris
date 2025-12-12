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

	// Get file ID from URL
	const url = new URL(request.url)
	const pathParts = url.pathname.split("/")
	const fileIdIndex = pathParts.indexOf("files") + 1
	const fileId = pathParts[fileIdIndex]

	if (!fileId) {
		return new Response(JSON.stringify({ error: "fileId is required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		})
	}

	try {
		// Fetch file to get dataset and verify access
		const file = await prisma.datasetFile.findUnique({
			where: { id: fileId },
			include: { dataset: true },
		})

		if (!file) {
			return new Response(JSON.stringify({ error: "File not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			})
		}

		// Verify user is a member of the organization
		const membership = await prisma.membership.findUnique({
			where: {
				userId_organizationId: {
					userId,
					organizationId: file.dataset.organizationId,
				},
			},
		})

		if (!membership) {
			return new Response(JSON.stringify({ error: "You don't have access to this file" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			})
		}

		// Get download URL from backend
		const backendResponse = await fetch(
			`${BACKEND_API_URL}/api/v1/datasets/files/${fileId}/download`,
			{
				method: "GET",
			}
		)

		const result = await backendResponse.json()

		return new Response(JSON.stringify(result), {
			status: backendResponse.status,
			headers: { "Content-Type": "application/json" },
		})
	} catch (error) {
		console.error("File download error:", error)
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Download failed",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		)
	}
}

export const Route = createFileRoute("/api/datasets/files/$fileId/download")({
	server: {
		handlers: {
			GET: handler,
		},
	},
})
