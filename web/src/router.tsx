import { QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routerWithQueryClient } from "@tanstack/react-router-with-query"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // 5 minutes
			},
		},
	})

	const router = createTanStackRouter({
		routeTree,
		context: {
			queryClient,
		},
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		scrollRestoration: true,
	})

	// Integrate React Query with TanStack Router for SSR support
	return routerWithQueryClient(router, queryClient)
}

// Keep createRouter as alias for client.tsx compatibility
export const createRouter = getRouter

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}
