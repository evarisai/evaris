import { type QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { ThemeProvider } from "next-themes"
import { useState } from "react"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getTRPCClient, trpc } from "@/lib/trpc"
import appCss from "@/styles.css?url"

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient
}>()({
	notFoundComponent: () => (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<title>404 - Not Found</title>
			</head>
			<body>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "100vh",
						fontFamily: "system-ui, sans-serif",
					}}
				>
					<div style={{ textAlign: "center" }}>
						<h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>404 - Page Not Found</h1>
						<p style={{ color: "#666" }}>The page you're looking for doesn't exist.</p>
						<a href="/" style={{ color: "#6366f1", marginTop: "1rem", display: "inline-block" }}>
							Go home
						</a>
					</div>
				</div>
			</body>
		</html>
	),
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Evaris AI - AI Evaluation Platform",
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	component: RootComponent,
})

function RootComponent() {
	const queryClient = Route.useRouteContext().queryClient
	// Use useState to ensure stable client reference across renders
	const [trpcClient] = useState(() => getTRPCClient())

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryClientProvider client={queryClient}>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<trpc.Provider client={trpcClient} queryClient={queryClient}>
							<TooltipProvider>
								<Outlet />
								<Toaster />
							</TooltipProvider>
						</trpc.Provider>
					</ThemeProvider>
					<ReactQueryDevtools buttonPosition="bottom-left" />
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	)
}
