import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { ThemeToggle } from "@/components/ThemeToggle"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { useSession } from "@/lib/auth-client"

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
	const { data: session, isPending } = useSession()
	const navigate = useNavigate()

	useEffect(() => {
		// Redirect to login if no session (after loading completes)
		if (!isPending && !session?.user) {
			navigate({ to: "/login" })
		}
	}, [session, isPending, navigate])

	// Show loading state while checking session
	if (isPending) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		)
	}

	// Don't render anything if not authenticated (will redirect)
	if (!session?.user) {
		return null
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="bg-background">
				<header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/60 bg-background/95 backdrop-blur-sm px-6">
					<SidebarTrigger className="hover:bg-muted/80 transition-colors rounded-md" />
					<div className="flex-1" />
					<ThemeToggle />
				</header>
				<main className="flex-1 p-6 md:p-8">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	)
}
