import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/server/auth"
import { prisma } from "@/server/db"

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:4000"

async function verifyAccess(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers })

	if (!session?.user?.id) {
		return { error: "Unauthorized", status: 401 }
	}

	const userId = session.user.id

	const url = new URL(request.url)
	const pathParts = url.pathname.split("/")
	const fileIdIndex = pathParts.indexOf("files") + 1
	const fileId = pathParts[fileIdIndex]

	if (!fileId) {
		return { error: "fileId is required", status: 400 }
	}

	const file = await prisma.datasetFile.findUnique({
		where: { id: fileId },
		include: { dataset: true },
	})

	if (!file) {
		return { error: "File not found", status: 404 }
	}

	const membership = await prisma.membership.findUnique({
		where: {
			userId_organizationId: {
				userId,
				organizationId: file.dataset.organizationId,
			},
		},
	})

	if (!membership) {
		return { error: "You don't have access to this file", status: 403 }
	}

	return { fileId, file, userId }
}

async function getHandler({ request }: { request: Request }) {
	try {
		const access = await verifyAccess(request)
		if ("error" in access) {
			return new Response(JSON.stringify({ error: access.error }), {
				status: access.status,
				headers: { "Content-Type": "application/json" },
			})
		}

		const backendResponse = await fetch(
			`${BACKEND_API_URL}/api/v1/datasets/files/${access.fileId}/content`,
			{ method: "GET" }
		)

		const result = await backendResponse.json()

		return new Response(JSON.stringify(result), {
			status: backendResponse.status,
			headers: { "Content-Type": "application/json" },
		})
	} catch (error) {
		console.error("File content error:", error)
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Failed to get file content",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		)
	}
}

async function putHandler({ request }: { request: Request }) {
	try {
		const access = await verifyAccess(request)
		if ("error" in access) {
			return new Response(JSON.stringify({ error: access.error }), {
				status: access.status,
				headers: { "Content-Type": "application/json" },
			})
		}

		const body = await request.json()
		const { content } = body as { content: string }

		if (typeof content !== "string") {
			return new Response(JSON.stringify({ error: "content is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			})
		}

		const backendResponse = await fetch(
			`${BACKEND_API_URL}/api/v1/datasets/files/${access.fileId}/content`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content }),
			}
		)

		const result = await backendResponse.json()

		return new Response(JSON.stringify(result), {
			status: backendResponse.status,
			headers: { "Content-Type": "application/json" },
		})
	} catch (error) {
		console.error("File save error:", error)
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Failed to save file content",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		)
	}
}

export const Route = createFileRoute("/api/datasets/files/$fileId/content")({
	server: {
		handlers: {
			GET: getHandler,
			PUT: putHandler,
		},
	},
})
