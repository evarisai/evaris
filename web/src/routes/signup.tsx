import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react"
import { useState } from "react"
import { EvarisName, EvarisSymbol } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordStrengthMeter, validatePassword } from "@/components/ui/password-strength-meter"
import { signIn, signUp } from "@/lib/auth-client"

// OAuth Button Component
function OAuthButton({
	provider,
	children,
	icon,
}: {
	provider: string
	children: React.ReactNode
	icon: React.ReactNode
}) {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleOAuth = async () => {
		setIsLoading(true)
		setError(null)
		try {
			await signIn.social({
				provider: provider as "google" | "github",
				callbackURL: "/dashboard",
			})
			setTimeout(() => {
				setIsLoading(false)
			}, 5000)
		} catch (err) {
			console.error("OAuth error:", err)
			setError("Authentication failed. Please try again.")
			setIsLoading(false)
		}
	}

	return (
		<div className="space-y-1">
			<Button
				type="button"
				variant="outline"
				className="w-full h-11 font-medium bg-background/50 hover:bg-background hover:border-foreground/20 transition-all duration-200"
				onClick={handleOAuth}
				disabled={isLoading}
			>
				{isLoading ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<span className="mr-2">{icon}</span>
				)}
				{children}
			</Button>
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	)
}

// Google Icon SVG
function GoogleIcon() {
	return (
		<svg className="w-5 h-5" viewBox="0 0 24 24">
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

// GitHub Icon SVG
function GitHubIcon() {
	return (
		<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
		</svg>
	)
}

// Animated Mail Icon for success state
function AnimatedMailIcon() {
	return (
		<div className="relative">
			{/* Glow effect */}
			<div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />

			{/* Icon container with animation */}
			<div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center animate-scale-in">
				{/* Mail icon */}
				<Mail
					className="w-8 h-8 text-primary animate-fade-in"
					style={{ animationDelay: "200ms" }}
				/>

				{/* Checkmark badge */}
				<div
					className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg animate-scale-in"
					style={{ animationDelay: "400ms" }}
				>
					<CheckCircle2 className="w-4 h-4 text-white" />
				</div>
			</div>
		</div>
	)
}

// Email Sent Success Card
function EmailSentCard({
	email,
	onResend,
	isResending,
}: {
	email: string
	onResend: () => void
	isResending: boolean
}) {
	return (
		<Card className="border-card-border shadow-lg backdrop-blur-sm bg-card/95 animate-scale-in">
			<CardContent className="pt-8 pb-6 px-6">
				<div className="flex flex-col items-center text-center space-y-6">
					{/* Animated icon */}
					<AnimatedMailIcon />

					{/* Heading */}
					<div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
						<h2 className="text-2xl font-semibold tracking-tight">Check your inbox</h2>
						<p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
							We've sent a verification link to
						</p>
					</div>

					{/* Email display */}
					<div
						className="px-4 py-2.5 rounded-lg bg-muted/50 border border-border animate-fade-in-up"
						style={{ animationDelay: "400ms" }}
					>
						<p className="text-sm font-medium text-foreground">{email}</p>
					</div>

					{/* Instructions */}
					<p
						className="text-muted-foreground text-xs max-w-[300px] leading-relaxed animate-fade-in-up"
						style={{ animationDelay: "500ms" }}
					>
						Click the link in the email to verify your account. If you don't see it, check your spam
						folder.
					</p>
				</div>
			</CardContent>

			<CardFooter className="flex flex-col gap-3 px-6 pb-6">
				{/* Resend button */}
				<Button
					variant="outline"
					className="w-full h-10 text-sm animate-fade-in-up"
					style={{ animationDelay: "600ms" }}
					onClick={onResend}
					disabled={isResending}
				>
					{isResending ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="mr-2 h-4 w-4" />
					)}
					Resend verification email
				</Button>

				{/* Back to login */}
				<Link
					to="/login"
					className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in-up"
					style={{ animationDelay: "700ms" }}
				>
					<ArrowLeft className="h-4 w-4" />
					Back to sign in
				</Link>
			</CardFooter>
		</Card>
	)
}

export const Route = createFileRoute("/signup")({
	component: SignupPage,
})

function SignupPage() {
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// New states for email verification flow
	const [emailSent, setEmailSent] = useState(false)
	const [sentToEmail, setSentToEmail] = useState("")
	const [isResending, setIsResending] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		if (password !== confirmPassword) {
			setError("Passwords do not match")
			setIsLoading(false)
			return
		}

		// Validate password against strong security requirements
		const passwordValidation = validatePassword(password)
		if (!passwordValidation.isValid) {
			setError(passwordValidation.errors[0] || "Password does not meet security requirements")
			setIsLoading(false)
			return
		}

		try {
			const result = await signUp.email({
				email,
				password,
				name,
			})

			if (result.error) {
				setError(result.error.message || "Failed to create account")
			} else {
				// Show the email sent card instead of redirecting
				setSentToEmail(email)
				setEmailSent(true)
			}
		} catch (err) {
			console.error("Signup error:", err)
			setError(err instanceof Error ? err.message : "An unexpected error occurred")
		} finally {
			setIsLoading(false)
		}
	}

	const handleResendEmail = async () => {
		setIsResending(true)
		try {
			// Attempt to sign up again - better-auth will resend verification
			await signUp.email({
				email: sentToEmail,
				password,
				name,
			})
		} catch (err) {
			console.error("Resend error:", err)
		} finally {
			setIsResending(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
			{/* Subtle background pattern */}
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:40px_40px] opacity-40" />

			{/* Subtle gradient accent */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl" />

			<div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in-up">
				{/* Logo section */}
				<div className="flex flex-col items-center space-y-3 text-center">
					<div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-card-border shadow-sm">
						<EvarisSymbol className="h-9 w-9" />
						<EvarisName className="h-5" />
					</div>
					<p className="text-muted-foreground text-sm font-medium">AI Evaluation Platform</p>
				</div>

				{/* Conditional render: Email sent card OR signup form */}
				{emailSent ? (
					<EmailSentCard
						email={sentToEmail}
						onResend={handleResendEmail}
						isResending={isResending}
					/>
				) : (
					<Card className="border-card-border shadow-lg backdrop-blur-sm bg-card/95">
						<CardHeader className="space-y-1.5 pb-4">
							<CardTitle className="text-2xl font-semibold tracking-tight">
								Create an account
							</CardTitle>
							<CardDescription className="text-muted-foreground">
								Enter your information to get started
							</CardDescription>
						</CardHeader>
						<form onSubmit={handleSubmit}>
							<CardContent className="space-y-4">
								{error && (
									<div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 animate-scale-in">
										{error}
									</div>
								)}

								{/* OAuth Buttons */}
								<div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
									<OAuthButton provider="google" icon={<GoogleIcon />}>
										Continue with Google
									</OAuthButton>
									<OAuthButton provider="github" icon={<GitHubIcon />}>
										Continue with GitHub
									</OAuthButton>
								</div>

								{/* Divider */}
								<div
									className="relative flex items-center gap-4 py-2 animate-fade-in-up"
									style={{ animationDelay: "200ms" }}
								>
									<div className="flex-1 border-t border-border" />
									<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Or continue with email
									</span>
									<div className="flex-1 border-t border-border" />
								</div>

								<div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
									<Label htmlFor="name" className="text-sm font-medium">
										Name
									</Label>
									<Input
										id="name"
										type="text"
										placeholder="Your name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										required
										disabled={isLoading}
										className="h-11 bg-background/50"
									/>
								</div>
								<div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
									<Label htmlFor="email" className="text-sm font-medium">
										Email
									</Label>
									<Input
										id="email"
										type="email"
										placeholder="you@example.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										disabled={isLoading}
										className="h-11 bg-background/50"
									/>
								</div>
								<div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="password" className="text-sm font-medium">
												Password
											</Label>
											<Input
												id="password"
												type="password"
												placeholder="Create password"
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												required
												disabled={isLoading}
												className="h-11 bg-background/50"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="confirmPassword" className="text-sm font-medium">
												Confirm
											</Label>
											<Input
												id="confirmPassword"
												type="password"
												placeholder="Confirm password"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												required
												disabled={isLoading}
												className="h-11 bg-background/50"
											/>
										</div>
									</div>

									{/* Password strength meter with real-time feedback */}
									<PasswordStrengthMeter password={password} />
								</div>
							</CardContent>
							<CardFooter className="flex flex-col space-y-4 pt-2">
								<Button
									type="submit"
									className="w-full h-11 font-medium animate-fade-in-up"
									style={{ animationDelay: "450ms" }}
									disabled={isLoading}
								>
									{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									Create Account
								</Button>
								<p className="text-sm text-muted-foreground text-center">
									Already have an account?{" "}
									<Link
										to="/login"
										className="text-foreground font-medium hover:text-primary transition-colors"
									>
										Sign in
									</Link>
								</p>
							</CardFooter>
						</form>
					</Card>
				)}

				{/* Footer */}
				<p className="text-center text-xs text-muted-foreground/70">
					By creating an account, you agree to our Terms of Service and Privacy Policy
				</p>
			</div>
		</div>
	)
}
