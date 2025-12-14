import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Check, Loader2, Lock, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { EvarisSymbol } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resetPassword } from "@/lib/auth-client"

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

function SuccessView() {
	return (
		<div className="space-y-8 text-center py-4">
			<div className="flex justify-center">
				<div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
					<ShieldCheck className="w-8 h-8 text-success" />
				</div>
			</div>

			<div className="space-y-3">
				<h1 className="text-3xl font-semibold tracking-tight">Password reset</h1>
				<p className="text-base text-muted-foreground">Your password has been successfully reset</p>
			</div>

			<Link to="/login" className="block">
				<Button className="w-full h-10 text-sm font-medium">Continue to login</Button>
			</Link>
		</div>
	)
}

function InvalidLinkView() {
	return (
		<div className="space-y-8 text-center py-4">
			<div className="flex justify-center">
				<div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
					<Lock className="w-8 h-8 text-destructive" />
				</div>
			</div>

			<div className="space-y-3">
				<h1 className="text-3xl font-semibold tracking-tight">Invalid link</h1>
				<p className="text-base text-muted-foreground">This reset link is invalid or has expired</p>
			</div>

			<div className="space-y-4 pt-2">
				<Link to="/forgot-password" className="block">
					<Button className="w-full h-10 text-sm font-medium">Request new link</Button>
				</Link>
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
	const isPasswordValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)

		if (password !== confirmPassword) {
			setError("Passwords do not match")
			return
		}

		if (!isPasswordValid) {
			setError("Password must be at least 8 characters with uppercase and number")
			return
		}

		setIsLoading(true)

		try {
			const result = await resetPassword({ newPassword: password, token })

			if (result.error) {
				setError(result.error.message || "Failed to reset password")
			} else {
				setIsSuccess(true)
			}
		} catch {
			setError("Something went wrong. Please try again.")
		} finally {
			setIsLoading(false)
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
					{isSuccess ? (
						<SuccessView />
					) : !hasToken ? (
						<InvalidLinkView />
					) : (
						<>
							{/* Title */}
							<div className="text-center space-y-3">
								<h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
								<p className="text-base text-muted-foreground">Enter your new password</p>
							</div>

							{/* Error */}
							{error && (
								<div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
									{error}
								</div>
							)}

							{/* Form */}
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="space-y-2">
									<Input
										type="password"
										placeholder="New password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										disabled={isLoading}
										className="h-10"
										autoComplete="new-password"
										autoFocus
									/>
									<PasswordStrength password={password} />
								</div>
								<Input
									type="password"
									placeholder="Confirm password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									disabled={isLoading}
									className="h-10"
									autoComplete="new-password"
								/>
								<Button
									type="submit"
									className="w-full h-10 text-sm font-medium"
									disabled={isLoading}
								>
									{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
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
