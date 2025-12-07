import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		// Always redirect to dashboard, the _authenticated layout will handle auth check
		throw redirect({ to: "/dashboard" })
	},
	component: () => null,
})
