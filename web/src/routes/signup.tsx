import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Check, Loader2, Mail } from "lucide-react"
import { useEffect, useState } from "react"
import { EvarisSymbol } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signIn, signUp } from "@/lib/auth-client"

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

function PasswordStrength({ password }: { password: string }) {
	const checks = [
		{ label: "8+ characters", valid: password.length >= 8 },
		{ label: "Uppercase", valid: /[A-Z]/.test(password) },
		{ label: "Number", valid: /[0-9]/.test(password) },
	]

	if (!password) return null

	return (
		<div className="flex gap-4 text-xs text-muted-foreground">
			{checks.map((check) => (
				<span key={check.label} className={check.valid ? "text-success" : ""}>
					{check.valid && <Check className="inline h-3 w-3 mr-0.5" />}
					{check.label}
				</span>
			))}
		</div>
	)
}

function EmailSentView({
	email,
	onResend,
	isResending,
	cooldown,
}: {
	email: string
	onResend: () => void
	isResending: boolean
	cooldown: number
}) {
	return (
		<div className="space-y-8 text-center py-4">
			<div className="flex justify-center">
				<div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
					<Mail className="w-8 h-8 text-success" />
				</div>
			</div>

			<div className="space-y-3">
				<h1 className="text-3xl font-semibold tracking-tight">Check your email</h1>
				<p className="text-base text-muted-foreground">We sent a verification link to</p>
				<p className="text-base font-medium">{email}</p>
			</div>

			<div className="space-y-4 pt-2">
				<p className="text-sm text-muted-foreground">
					Didn't receive it?{" "}
					{cooldown > 0 ? (
						<span className="text-muted-foreground/60">Resend in {cooldown}s</span>
					) : (
						<button
							type="button"
							onClick={onResend}
							disabled={isResending}
							className="text-foreground font-medium hover:underline disabled:opacity-50"
						>
							{isResending ? "Sending..." : "Resend"}
						</button>
					)}
				</p>
				<Link
					to="/login"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to login
				</Link>
			</div>
		</div>
	)
}

export const Route = createFileRoute("/signup")({
	component: SignupPage,
})

function SignupPage() {
	const [step, setStep] = useState<1 | 2>(1)
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [emailSent, setEmailSent] = useState(false)
	const [sentToEmail, setSentToEmail] = useState("")
	const [isResending, setIsResending] = useState(false)
	const [cooldown, setCooldown] = useState(0)

	useEffect(() => {
		if (cooldown <= 0) return
		const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
		return () => clearTimeout(timer)
	}, [cooldown])

	const isPasswordValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)

	const firstName = name.split(" ")[0]

	const handleNameSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (name.trim()) {
			setStep(2)
		}
	}

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!isPasswordValid) {
			setError("Password must be at least 8 characters with uppercase and number")
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const result = await signUp.email({ email, password, name })

			if (result.error) {
				setError(result.error.message || "Failed to create account")
			} else {
				setSentToEmail(email)
				setEmailSent(true)
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

	const handleResend = async () => {
		setIsResending(true)
		try {
			await signUp.email({ email: sentToEmail, password, name })
			setCooldown(30)
		} catch {
			// Silently handle
		} finally {
			setIsResending(false)
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
				<Link to="/login">
					<Button variant="outline" size="sm" className="text-sm font-medium">
						Log In
					</Button>
				</Link>
			</header>

			{/* Centered Content */}
			<div className="flex-1 flex items-center justify-center px-4 pb-16">
				<div className="w-full max-w-[320px] space-y-8">
					{emailSent ? (
						<EmailSentView
							email={sentToEmail}
							onResend={handleResend}
							isResending={isResending}
							cooldown={cooldown}
						/>
					) : step === 1 ? (
						<>
							{/* Step 1: Name */}
							<div className="text-center space-y-3">
								<h1 className="text-3xl font-semibold tracking-tight">What's your name?</h1>
								<p className="text-base text-muted-foreground">Let's get you started with Evaris</p>
							</div>

							<form onSubmit={handleNameSubmit} className="space-y-4">
								<Input
									type="text"
									placeholder="Your name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									className="h-10"
									autoComplete="name"
									autoFocus
								/>
								<Button
									type="submit"
									className="w-full h-10 text-sm font-medium"
									disabled={!name.trim()}
								>
									Continue
									<ArrowRight className="h-4 w-4 ml-1" />
								</Button>
							</form>

							{/* Footer */}
							<p className="text-center text-sm text-muted-foreground">
								Already have an account?{" "}
								<Link to="/login" className="text-foreground font-medium hover:underline">
									Log in
								</Link>
							</p>
						</>
					) : (
						<>
							{/* Step 2: Auth options */}
							<div className="text-center space-y-3">
								<h1 className="text-3xl font-semibold tracking-tight">Hi {firstName}</h1>
								<p className="text-base text-muted-foreground">How would you like to continue?</p>
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
							<form onSubmit={handleSignup} className="space-y-4">
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
								<div className="space-y-2">
									<Input
										type="password"
										placeholder="Password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										disabled={isLoading}
										className="h-10"
										autoComplete="new-password"
									/>
									<PasswordStrength password={password} />
								</div>
								<Button
									type="submit"
									className="w-full h-10 text-sm font-medium"
									disabled={isLoading}
								>
									{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
								</Button>
							</form>

							{/* Back button */}
							<div className="text-center">
								<button
									type="button"
									onClick={() => setStep(1)}
									className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									<ArrowLeft className="h-3.5 w-3.5" />
									Back
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
