import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
	validatePassword,
	getPasswordStrengthLabel,
	type PasswordValidationResult,
} from "@/lib/password-validation"

interface PasswordStrengthMeterProps {
	password: string
	className?: string
	showRequirements?: boolean
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
	return (
		<li className="flex items-center gap-2 text-xs">
			{met ? (
				<Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
			) : (
				<X className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
			)}
			<span className={cn(met ? "text-muted-foreground" : "text-muted-foreground/60")}>
				{label}
			</span>
		</li>
	)
}

export function PasswordStrengthMeter({
	password,
	className,
	showRequirements = true,
}: PasswordStrengthMeterProps) {
	if (!password) {
		return null
	}

	const validation = validatePassword(password)
	const { label } = getPasswordStrengthLabel(validation.score)
	const widthPercent = (validation.score / 5) * 100

	return (
		<div className={cn("space-y-3", className)}>
			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Password strength</span>
					<span
						className={cn(
							"font-medium",
							validation.score <= 2
								? "text-destructive"
								: validation.score <= 3
									? "text-yellow-600 dark:text-yellow-500"
									: validation.score <= 4
										? "text-blue-600 dark:text-blue-500"
										: "text-emerald-600 dark:text-emerald-500"
						)}
					>
						{label}
					</span>
				</div>

				<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
					<div
						className={cn(
							"h-full rounded-full transition-all duration-300 ease-out",
							validation.score <= 1 && "bg-red-500",
							validation.score === 2 && "bg-orange-500",
							validation.score === 3 && "bg-yellow-500",
							validation.score === 4 && "bg-blue-500",
							validation.score === 5 && "bg-emerald-500"
						)}
						style={{ width: `${widthPercent}%` }}
					/>
				</div>
			</div>

			{showRequirements && (
				<ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
					<RequirementItem met={validation.requirements.minLength} label="8+ characters" />
					<RequirementItem met={validation.requirements.hasUppercase} label="Uppercase letter" />
					<RequirementItem met={validation.requirements.hasLowercase} label="Lowercase letter" />
					<RequirementItem met={validation.requirements.hasNumber} label="Number" />
					<RequirementItem met={validation.requirements.hasSpecial} label="Special character" />
				</ul>
			)}
		</div>
	)
}

export function usePasswordValidation(password: string): PasswordValidationResult {
	return validatePassword(password)
}

export { validatePassword, getPasswordStrengthLabel }
