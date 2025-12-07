import { createAuthClient } from "better-auth/react"

// Get base URL that works on both server and client
function getBaseURL() {
	if (typeof window !== "undefined") {
		return window.location.origin
	}
	// Server-side: use environment variable or default
	return process.env.VITE_APP_URL || process.env.APP_URL || "http://localhost:3000"
}

export const authClient = createAuthClient({
	baseURL: getBaseURL(),
	basePath: "/api/auth",
})

export const {
	signIn,
	signUp,
	signOut,
	useSession,
	getSession,
	requestPasswordReset,
	resetPassword,
} = authClient
