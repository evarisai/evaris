import type { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import { ZodError } from "zod"

export function errorHandler(err: Error, c: Context) {
	console.error("Error:", err)

	// Handle Zod validation errors
	if (err instanceof ZodError) {
		return c.json(
			{
				error: "Validation Error",
				details: err.errors.map((e) => ({
					path: e.path.join("."),
					message: e.message,
				})),
			},
			400
		)
	}

	// Handle HTTP exceptions
	if (err instanceof HTTPException) {
		return c.json(
			{
				error: err.message,
			},
			err.status
		)
	}

	// Handle generic errors
	return c.json(
		{
			error: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
		},
		500
	)
}
