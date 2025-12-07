import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/server/auth"
import {
	checkRateLimit,
	createRateLimitResponse,
	getClientIp,
	getEndpointType,
} from "@/lib/rate-limiter"

async function handler({ request }: { request: Request }) {
	const url = new URL(request.url)
	const endpoint = getEndpointType(url.pathname, request.method)

	if (endpoint) {
		const clientIp = getClientIp(request)
		const result = checkRateLimit(clientIp, endpoint)

		if (!result.allowed) {
			console.warn(
				`[Auth] Rate limited ${clientIp} on ${endpoint}: retry after ${result.retryAfter}s`
			)
			return createRateLimitResponse(result)
		}
	}

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
