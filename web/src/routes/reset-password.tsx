import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, Loader2, Lock } from "lucide-react"
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
import { resetPassword } from "@/lib/auth-client"

function AnimatedLockIcon() {
	return (
		<div className="relative">
			<div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
			<div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center animate-scale-in">
				<Lock
					className="w-8 h-8 text-emerald-500 animate-fade-in"
					style={{ animationDelay: "200ms" }}
				/>
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

function PasswordResetSuccessCard() {
	return (
		<Card className="border-card-border shadow-lg backdrop-blur-sm bg-card/95 animate-scale-in">
			<CardContent className="pt-8 pb-6 px-6">
				<div className="flex flex-col items-center text-center space-y-6">
					<AnimatedLockIcon />
					<div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
						<h2 className="text-2xl font-semibold tracking-tight">Password reset!</h2>
						<p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
							Your password has been successfully reset. You can now sign in with your new password.
						</p>
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex flex-col gap-3 px-6 pb-6">
				<Link to="/login" className="w-full">
					<Button
						className="w-full h-11 font-medium animate-fade-in-up"
						style={{ animationDelay: "400ms" }}
					>
						Sign in
					</Button>
				</Link>
			</CardFooter>
		</Card>
	)
}

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>) => ({
		token: (search.token as string) || "",
	}),
})

function ResetPasswordPage() {
	const { token } = Route.useSearch()
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isSuccess, setIsSuccess] = useState(false)

	const hasToken = Boolean(token)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		if (password !== confirmPassword) {
			setError("Passwords do not match")
			setIsLoading(false)
			return
		}

		const passwordValidation = validatePassword(password)
		if (!passwordValidation.isValid) {
			setError(passwordValidation.errors[0] || "Password does not meet security requirements")
			setIsLoading(false)
			return
		}

		try {
			const result = await resetPassword({
				newPassword: password,
				token,
			})

			if (result.error) {
				setError(result.error.message || "Failed to reset password")
			} else {
				setIsSuccess(true)
			}
		} catch (err) {
			console.error("Reset password error:", err)
			setError(err instanceof Error ? err.message : "An unexpected error occurred")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] [background-size:40px_40px] opacity-40" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-accent-color/5 to-transparent rounded-full blur-3xl" />

			<div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in-up">
				<div className="flex flex-col items-center space-y-3 text-center">
					<div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-card-border shadow-sm">
						<EvarisSymbol className="h-9 w-9" />
						<EvarisName className="h-5" />
					</div>
					<p className="text-muted-foreground text-sm font-medium">AI Evaluation Platform</p>
				</div>

				{isSuccess ? (
					<PasswordResetSuccessCard />
				) : !hasToken ? (
					<Card className="border-card-border shadow-lg backdrop-blur-sm bg-card/95">
						<CardContent className="pt-8 pb-6 px-6">
							<div className="flex flex-col items-center text-center space-y-6">
								<div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
									<Lock className="w-8 h-8 text-destructive" />
								</div>
								<div className="space-y-2">
									<h2 className="text-2xl font-semibold tracking-tight">Invalid link</h2>
									<p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
										This password reset link is invalid or has expired. Please request a new one.
									</p>
								</div>
							</div>
						</CardContent>
						<CardFooter className="flex flex-col gap-3 px-6 pb-6">
							<Link to="/forgot-password" className="w-full">
								<Button className="w-full h-11 font-medium">Request new link</Button>
							</Link>
							<Link
								to="/login"
								className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<ArrowLeft className="h-4 w-4" />
								Back to sign in
							</Link>
						</CardFooter>
					</Card>
				) : (
					<Card className="border-card-border shadow-lg backdrop-blur-sm bg-card/95">
						<CardHeader className="space-y-1.5 pb-4">
							<CardTitle className="text-2xl font-semibold tracking-tight">
								Reset your password
							</CardTitle>
							<CardDescription className="text-muted-foreground">
								Enter your new password below
							</CardDescription>
						</CardHeader>
						<form onSubmit={handleSubmit}>
							<CardContent className="space-y-4">
								{error && (
									<div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 animate-scale-in">
										{error}
									</div>
								)}
								<div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="password" className="text-sm font-medium">
												New password
											</Label>
											<Input
												id="password"
												type="password"
												placeholder="New password"
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												required
												disabled={isLoading}
												className="h-11 bg-background/50"
												autoFocus
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
									<PasswordStrengthMeter password={password} />
								</div>
							</CardContent>
							<CardFooter className="flex flex-col space-y-4 pt-2">
								<Button
									type="submit"
									className="w-full h-11 font-medium animate-fade-in-up"
									style={{ animationDelay: "200ms" }}
									disabled={isLoading}
								>
									{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									Reset Password
								</Button>
								<Link
									to="/login"
									className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									<ArrowLeft className="h-4 w-4" />
									Back to sign in
								</Link>
							</CardFooter>
						</form>
					</Card>
				)}
			</div>
		</div>
	)
}
