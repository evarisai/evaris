import { httpBatchLink } from "@trpc/client"
import { createTRPCReact } from "@trpc/react-query"
import superjson from "superjson"
import type { AppRouter } from "../server/trpc/routers"

export const trpc = createTRPCReact<AppRouter>()

// Create client lazily to avoid SSR issues
let trpcClientSingleton: ReturnType<typeof trpc.createClient> | null = null

function getBaseUrl() {
	if (typeof window !== "undefined") {
		// Browser - use relative URL
		return ""
	}
	// SSR - use localhost (will be replaced by actual request URL in production)
	return "http://localhost:3000"
}

export function getTRPCClient() {
	// Only create client on client-side to avoid SSR issues
	if (typeof window === "undefined") {
		// Return a minimal placeholder for SSR that won't be used
		return trpc.createClient({
			links: [
				httpBatchLink({
					url: `${getBaseUrl()}/api/trpc`,
					transformer: superjson,
				}),
			],
		})
	}

	if (!trpcClientSingleton) {
		trpcClientSingleton = trpc.createClient({
			links: [
				httpBatchLink({
					url: "/api/trpc",
					transformer: superjson,
				}),
			],
		})
	}
	return trpcClientSingleton
}
