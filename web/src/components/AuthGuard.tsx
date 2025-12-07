import { useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import { useSession } from "@/lib/auth-client"

interface AuthGuardProps {
	children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
	const { data: session, isPending } = useSession()
	const navigate = useNavigate()

	useEffect(() => {
		if (!isPending && !session) {
			navigate({ to: "/login" })
		}
	}, [isPending, session, navigate])

	if (isPending) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	if (!session) {
		return null
	}

	return <>{children}</>
}

// Hook for accessing session in components
export function useAuth() {
	const { data: session, isPending, error } = useSession()

	return {
		user: session?.user ?? null,
		session: session?.session ?? null,
		isLoading: isPending,
		isAuthenticated: !!session,
		error,
	}
}
