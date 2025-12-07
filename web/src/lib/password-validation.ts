export interface PasswordValidationResult {
	isValid: boolean
	score: number
	errors: string[]
	requirements: {
		minLength: boolean
		hasUppercase: boolean
		hasLowercase: boolean
		hasNumber: boolean
		hasSpecial: boolean
	}
}

const MIN_LENGTH = 8
const UPPERCASE_REGEX = /[A-Z]/
const LOWERCASE_REGEX = /[a-z]/
const NUMBER_REGEX = /[0-9]/
const SPECIAL_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/

export function validatePassword(password: string): PasswordValidationResult {
	const requirements = {
		minLength: password.length >= MIN_LENGTH,
		hasUppercase: UPPERCASE_REGEX.test(password),
		hasLowercase: LOWERCASE_REGEX.test(password),
		hasNumber: NUMBER_REGEX.test(password),
		hasSpecial: SPECIAL_REGEX.test(password),
	}

	const errors: string[] = []

	if (!requirements.minLength) {
		errors.push(`Password must be at least ${MIN_LENGTH} characters`)
	}
	if (!requirements.hasUppercase) {
		errors.push("Password must contain at least one uppercase letter")
	}
	if (!requirements.hasLowercase) {
		errors.push("Password must contain at least one lowercase letter")
	}
	if (!requirements.hasNumber) {
		errors.push("Password must contain at least one number")
	}
	if (!requirements.hasSpecial) {
		errors.push("Password must contain at least one special character (!@#$%^&*...)")
	}

	const score = Object.values(requirements).filter(Boolean).length
	const isValid = score === 5

	return { isValid, score, errors, requirements }
}

export function getPasswordStrengthLabel(score: number): { label: string; color: string } {
	switch (score) {
		case 0:
		case 1:
			return { label: "Very Weak", color: "bg-red-500" }
		case 2:
			return { label: "Weak", color: "bg-orange-500" }
		case 3:
			return { label: "Fair", color: "bg-yellow-500" }
		case 4:
			return { label: "Good", color: "bg-blue-500" }
		case 5:
			return { label: "Strong", color: "bg-green-500" }
		default:
			return { label: "Very Weak", color: "bg-red-500" }
	}
}
