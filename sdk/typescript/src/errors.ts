export class EvarisError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "EvarisError"
	}
}

export class EvarisAPIError extends EvarisError {
	readonly statusCode: number
	readonly responseBody?: string

	constructor(message: string, statusCode: number, responseBody?: string) {
		super(message)
		this.name = "EvarisAPIError"
		this.statusCode = statusCode
		this.responseBody = responseBody
	}
}

export class EvarisStreamError extends EvarisError {
	readonly cause?: Error

	constructor(message: string, cause?: Error) {
		super(message)
		this.name = "EvarisStreamError"
		this.cause = cause
	}
}

export class EvarisTimeoutError extends EvarisError {
	constructor(message: string = "Request timed out") {
		super(message)
		this.name = "EvarisTimeoutError"
	}
}

export class EvarisValidationError extends EvarisError {
	readonly field?: string

	constructor(message: string, field?: string) {
		super(message)
		this.name = "EvarisValidationError"
		this.field = field
	}
}
