import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"
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
import { requestPasswordReset } from "@/lib/auth-client"

function AnimatedMailIcon() {
	return (
		<div className="relative">
			<div className="absolute inset-0 bg-accent-color/20 rounded-full blur-xl animate-pulse" />
			<div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-accent-color/10 to-accent-color/5 border border-accent-color/20 flex items-center justify-center animate-scale-in">
				<Mail
					className="w-8 h-8 text-accent-color animate-fade-in"
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

function EmailSentCard({ email }: { email: string }) {
	return (
		<Card className="border-card-border shadow-lg backdrop-blur-sm bg-card/95 animate-scale-in">
			<CardContent className="pt-8 pb-6 px-6">
				<div className="flex flex-col items-center text-center space-y-6">
					<AnimatedMailIcon />
					<div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
						<h2 className="text-2xl font-semibold tracking-tight">Check your inbox</h2>
						<p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
							We've sent a password reset link to
						</p>
					</div>
					<div
						className="px-4 py-2.5 rounded-lg bg-muted/50 border border-border animate-fade-in-up"
						style={{ animationDelay: "400ms" }}
					>
						<p className="text-sm font-medium text-foreground">{email}</p>
					</div>
					<p
						className="text-muted-foreground text-xs max-w-[300px] leading-relaxed animate-fade-in-up"
						style={{ animationDelay: "500ms" }}
					>
						Click the link in the email to reset your password. The link expires in 1 hour. If you
						don't see it, check your spam folder.
					</p>
				</div>
			</CardContent>
			<CardFooter className="flex flex-col gap-3 px-6 pb-6">
				<Link
					to="/login"
					className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in-up"
					style={{ animationDelay: "600ms" }}
				>
					<ArrowLeft className="h-4 w-4" />
					Back to sign in
				</Link>
			</CardFooter>
		</Card>
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
		} catch (err) {
			console.error("Forgot password error:", err)
			setEmailSent(true)
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

				{emailSent ? (
					<EmailSentCard email={email} />
				) : (
					<Card className="border-card-border shadow-lg backdrop-blur-sm bg-card/95">
						<CardHeader className="space-y-1.5 pb-4">
							<CardTitle className="text-2xl font-semibold tracking-tight">
								Forgot password?
							</CardTitle>
							<CardDescription className="text-muted-foreground">
								Enter your email and we'll send you a reset link
							</CardDescription>
						</CardHeader>
						<form onSubmit={handleSubmit}>
							<CardContent className="space-y-4">
								{error && (
									<div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 animate-scale-in">
										{error}
									</div>
								)}
								<div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
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
										autoFocus
									/>
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
									Send Reset Link
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
