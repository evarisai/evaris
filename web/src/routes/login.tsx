import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { EvarisSymbol } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/auth-client"

function GoogleIcon() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24">
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
			/>
		</svg>
	)
}

function GitHubIcon() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
		</svg>
	)
}

export const Route = createFileRoute("/login")({
	component: LoginPage,
})

function LoginPage() {
	const navigate = useNavigate()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			const result = await signIn.email({ email, password })

			if (result.error) {
				setError(result.error.message || "Invalid email or password")
			} else {
				navigate({ to: "/dashboard" })
			}
		} catch {
			setError("Something went wrong. Please try again.")
		} finally {
			setIsLoading(false)
		}
	}

	const handleOAuth = async (provider: "google" | "github") => {
		setIsOAuthLoading(provider)
		setError(null)
		try {
			await signIn.social({ provider, callbackURL: "/dashboard" })
			setTimeout(() => setIsOAuthLoading(null), 5000)
		} catch {
			setError("Authentication failed. Please try again.")
			setIsOAuthLoading(null)
		}
	}

	return (
		<div className="min-h-screen flex flex-col bg-background">
			{/* Top Navigation */}
			<header className="flex items-center justify-between px-6 py-4">
				<Link to="/" className="flex items-center gap-2 text-foreground">
					<EvarisSymbol className="h-8 w-8" />
					<span className="text-[1.375rem] font-semibold tracking-tight leading-none">evaris</span>
				</Link>
				<Link to="/signup">
					<Button variant="outline" size="sm" className="text-sm font-medium">
						Sign Up
					</Button>
				</Link>
			</header>

			{/* Centered Content */}
			<div className="flex-1 flex items-center justify-center px-4 pb-16">
				<div className="w-full max-w-[320px] space-y-8">
					{/* Title */}
					<div className="text-center space-y-2">
						<h1 className="text-3xl font-semibold tracking-tight">Log in to Evaris</h1>
					</div>

					{/* Error */}
					{error && (
						<div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
							{error}
						</div>
					)}

					{/* OAuth Buttons */}
					<div className="space-y-3">
						<Button
							type="button"
							variant="outline"
							className="w-full h-10 text-sm font-medium"
							onClick={() => handleOAuth("github")}
							disabled={isOAuthLoading !== null}
						>
							{isOAuthLoading === "github" ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<GitHubIcon />
							)}
							<span className="ml-2">Continue with GitHub</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							className="w-full h-10 text-sm font-medium"
							onClick={() => handleOAuth("google")}
							disabled={isOAuthLoading !== null}
						>
							{isOAuthLoading === "google" ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<GoogleIcon />
							)}
							<span className="ml-2">Continue with Google</span>
						</Button>
					</div>

					{/* Divider */}
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border" />
						</div>
						<div className="relative flex justify-center text-xs">
							<span className="px-2 bg-background text-muted-foreground">or</span>
						</div>
					</div>

					{/* Email Form */}
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Input
								type="email"
								placeholder="Email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={isLoading}
								className="h-10"
								autoComplete="email"
							/>
						</div>
						<div className="space-y-2">
							<Input
								type="password"
								placeholder="Password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={isLoading}
								className="h-10"
								autoComplete="current-password"
							/>
						</div>
						<div className="flex justify-end">
							<Link
								to="/forgot-password"
								className="text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								Forgot password?
							</Link>
						</div>
						<Button type="submit" className="w-full h-10 text-sm font-medium" disabled={isLoading}>
							{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
						</Button>
					</form>

					{/* Footer */}
					<p className="text-center text-sm text-muted-foreground">
						Don't have an account?{" "}
						<Link to="/signup" className="text-foreground font-medium hover:underline">
							Sign up
						</Link>
					</p>
				</div>
			</div>
		</div>
	)
}
