import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/server/auth"

async function handler({ request }: { request: Request }) {
	return auth.handler(request)
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
		},
	},
})
