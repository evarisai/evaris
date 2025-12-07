import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			staleTime: 1000 * 60, // 1 minute
			retry: 1,
		},
		mutations: {
			retry: false,
		},
	},
})
