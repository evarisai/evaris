import type { Context, MiddlewareHandler } from "hono"

interface RateLimitEntry {
	count: number
	firstAttempt: number
	lastAttempt: number
}

interface RateLimitConfig {
	maxRequests: number
	windowMs: number
	keyGenerator?: (c: Context) => string
	skip?: (c: Context) => boolean
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

function getClientIp(c: Context): string {
	const headers = c.req.raw.headers

	const forwardedFor = headers.get("x-forwarded-for")
	if (forwardedFor) {
		const ips = forwardedFor.split(",").map((ip) => ip.trim())
		if (ips[0]) return ips[0]
	}

	const cfConnectingIp = headers.get("cf-connecting-ip")
	if (cfConnectingIp) return cfConnectingIp

	const realIp = headers.get("x-real-ip")
	if (realIp) return realIp

	return "unknown"
}

function defaultKeyGenerator(c: Context): string {
	const ip = getClientIp(c)
	const path = new URL(c.req.url).pathname
	return `${ip}:${c.req.method}:${path}`
}

export function rateLimiter(config: RateLimitConfig): MiddlewareHandler {
	const { maxRequests, windowMs, keyGenerator = defaultKeyGenerator, skip } = config

	return async (c, next) => {
		if (skip?.(c)) {
			return next()
		}

		const key = keyGenerator(c)
		const now = Date.now()

		let entry = rateLimitStore.get(key)

		if (!entry || now - entry.firstAttempt > windowMs) {
			entry = {
				count: 1,
				firstAttempt: now,
				lastAttempt: now,
			}
			rateLimitStore.set(key, entry)

			c.header("X-RateLimit-Limit", String(maxRequests))
			c.header("X-RateLimit-Remaining", String(maxRequests - 1))
			c.header("X-RateLimit-Reset", String(entry.firstAttempt + windowMs))

			return next()
		}

		entry.count++
		entry.lastAttempt = now

		if (entry.count > maxRequests) {
			const retryAfter = Math.ceil((entry.firstAttempt + windowMs - now) / 1000)

			console.warn(`[Rate Limit] Blocked ${getClientIp(c)} on ${c.req.path}: ${entry.count} requests`)

			return c.json(
				{
					error: "Too Many Requests",
					message: "Rate limit exceeded. Please try again later.",
					retryAfter,
				},
				429,
				{
					"Retry-After": String(retryAfter),
					"X-RateLimit-Limit": String(maxRequests),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(entry.firstAttempt + windowMs),
				}
			)
		}

		c.header("X-RateLimit-Limit", String(maxRequests))
		c.header("X-RateLimit-Remaining", String(maxRequests - entry.count))
		c.header("X-RateLimit-Reset", String(entry.firstAttempt + windowMs))

		return next()
	}
}

export const apiRateLimiter = rateLimiter({
	maxRequests: 100,
	windowMs: 60 * 1000,
	keyGenerator: (c) => {
		const authHeader = c.req.header("Authorization")
		if (authHeader?.startsWith("Bearer ")) {
			const token = authHeader.slice(7)
			return `api:${token.substring(0, 16)}:${c.req.method}`
		}
		return `api:${getClientIp(c)}:${c.req.method}`
	},
})

export const sdkRateLimiter = rateLimiter({
	maxRequests: 60,
	windowMs: 60 * 1000,
	keyGenerator: (c) => {
		const authHeader = c.req.header("Authorization")
		if (authHeader?.startsWith("Bearer ")) {
			const token = authHeader.slice(7)
			return `sdk:${token.substring(0, 16)}`
		}
		return `sdk:${getClientIp(c)}`
	},
})

function cleanup() {
	const now = Date.now()
	const staleThreshold = now - 10 * 60 * 1000

	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.lastAttempt < staleThreshold) {
			rateLimitStore.delete(key)
		}
	}
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
	setInterval(cleanup, CLEANUP_INTERVAL_MS)
}
