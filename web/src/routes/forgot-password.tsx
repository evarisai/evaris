import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Mail } from "lucide-react"
import { useEffect, useState } from "react"
import { EvarisSymbol } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "@/lib/auth-client"

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
				<p className="text-base text-muted-foreground">We sent a password reset link to</p>
				<p className="text-base font-medium">{email}</p>
			</div>

			<p className="text-sm text-muted-foreground">The link expires in 1 hour.</p>

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

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	const [email, setEmail] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [emailSent, setEmailSent] = useState(false)
	const [isResending, setIsResending] = useState(false)
	const [cooldown, setCooldown] = useState(0)

	useEffect(() => {
		if (cooldown <= 0) return
		const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
		return () => clearTimeout(timer)
	}, [cooldown])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			const result = await requestPasswordReset({
				email,
				redirectTo: "/reset-password",
			})

			if (result.error) {
				setError(result.error.message || "Failed to send reset email")
			} else {
				setEmailSent(true)
			}
		} catch {
			setEmailSent(true)
		} finally {
			setIsLoading(false)
		}
	}

	const handleResend = async () => {
		setIsResending(true)
		try {
			await requestPasswordReset({
				email,
				redirectTo: "/reset-password",
			})
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
							email={email}
							onResend={handleResend}
							isResending={isResending}
							cooldown={cooldown}
						/>
					) : (
						<>
							{/* Title */}
							<div className="text-center space-y-3">
								<h1 className="text-3xl font-semibold tracking-tight">Forgot password?</h1>
								<p className="text-base text-muted-foreground">
									Enter your email and we'll send you a reset link
								</p>
							</div>

							{/* Error */}
							{error && (
								<div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
									{error}
								</div>
							)}

							{/* Form */}
							<form onSubmit={handleSubmit} className="space-y-4">
								<Input
									type="email"
									placeholder="Email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									disabled={isLoading}
									className="h-10"
									autoComplete="email"
									autoFocus
								/>
								<Button
									type="submit"
									className="w-full h-10 text-sm font-medium"
									disabled={isLoading}
								>
									{isLoading ? "Sending..." : "Send reset link"}
								</Button>
							</form>

							{/* Footer */}
							<div className="text-center">
								<Link
									to="/login"
									className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									<ArrowLeft className="h-3.5 w-3.5" />
									Back to login
								</Link>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
