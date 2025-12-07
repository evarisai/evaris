interface RateLimitEntry {
	count: number
	firstAttempt: number
	lastAttempt: number
	blocked: boolean
	blockedUntil: number
}

interface RateLimitConfig {
	maxRequests: number
	windowMs: number
	blockDurationMs: number
	exponentialBackoff?: boolean
	maxBlockDurationMs?: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
const ENTRY_TTL_MS = 10 * 60 * 1000

export const RATE_LIMIT_CONFIGS = {
	login: {
		maxRequests: 5,
		windowMs: 60 * 1000,
		blockDurationMs: 5 * 60 * 1000,
		exponentialBackoff: true,
		maxBlockDurationMs: 60 * 60 * 1000,
	} as RateLimitConfig,

	signup: {
		maxRequests: 3,
		windowMs: 60 * 1000,
		blockDurationMs: 10 * 60 * 1000,
		exponentialBackoff: false,
	} as RateLimitConfig,

	forgotPassword: {
		maxRequests: 3,
		windowMs: 5 * 60 * 1000,
		blockDurationMs: 15 * 60 * 1000,
		exponentialBackoff: false,
	} as RateLimitConfig,

	resetPassword: {
		maxRequests: 5,
		windowMs: 5 * 60 * 1000,
		blockDurationMs: 5 * 60 * 1000,
		exponentialBackoff: false,
	} as RateLimitConfig,

	api: {
		maxRequests: 100,
		windowMs: 60 * 1000,
		blockDurationMs: 60 * 1000,
		exponentialBackoff: false,
	} as RateLimitConfig,
} as const

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS

export interface RateLimitResult {
	allowed: boolean
	remaining: number
	resetAt: number
	retryAfter?: number
}

export function checkRateLimit(
	ip: string,
	endpoint: RateLimitType,
	config?: RateLimitConfig
): RateLimitResult {
	const effectiveConfig = config || RATE_LIMIT_CONFIGS[endpoint]
	const key = `${ip}:${endpoint}`
	const now = Date.now()

	let entry = rateLimitStore.get(key)

	if (entry?.blocked && entry.blockedUntil > now) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: entry.blockedUntil,
			retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
		}
	}

	if (entry?.blocked && entry.blockedUntil <= now) {
		entry.blocked = false
		entry.count = 0
		entry.firstAttempt = now
	}

	if (!entry || now - entry.firstAttempt > effectiveConfig.windowMs) {
		entry = {
			count: 1,
			firstAttempt: now,
			lastAttempt: now,
			blocked: false,
			blockedUntil: 0,
		}
		rateLimitStore.set(key, entry)

		return {
			allowed: true,
			remaining: effectiveConfig.maxRequests - 1,
			resetAt: now + effectiveConfig.windowMs,
		}
	}

	entry.count++
	entry.lastAttempt = now

	if (entry.count > effectiveConfig.maxRequests) {
		let blockDuration = effectiveConfig.blockDurationMs
		if (effectiveConfig.exponentialBackoff) {
			const violations = Math.floor(entry.count / effectiveConfig.maxRequests)
			blockDuration = Math.min(
				effectiveConfig.blockDurationMs * 2 ** (violations - 1),
				effectiveConfig.maxBlockDurationMs || effectiveConfig.blockDurationMs * 8
			)
		}

		entry.blocked = true
		entry.blockedUntil = now + blockDuration

		console.warn(`[Rate Limit] Blocked ${ip} for ${endpoint}: ${entry.count} requests`)

		return {
			allowed: false,
			remaining: 0,
			resetAt: entry.blockedUntil,
			retryAfter: Math.ceil(blockDuration / 1000),
		}
	}

	return {
		allowed: true,
		remaining: effectiveConfig.maxRequests - entry.count,
		resetAt: entry.firstAttempt + effectiveConfig.windowMs,
	}
}

export function resetRateLimit(ip: string, endpoint: RateLimitType): void {
	rateLimitStore.delete(`${ip}:${endpoint}`)
}

export function getClientIp(request: Request): string {
	const headers = request.headers

	const forwardedFor = headers.get("x-forwarded-for")
	if (forwardedFor) {
		const ips = forwardedFor.split(",").map((ip) => ip.trim())
		if (ips[0]) return ips[0]
	}

	const cfConnectingIp = headers.get("cf-connecting-ip")
	if (cfConnectingIp) return cfConnectingIp

	const trueClientIp = headers.get("true-client-ip")
	if (trueClientIp) return trueClientIp

	const realIp = headers.get("x-real-ip")
	if (realIp) return realIp

	return "unknown"
}

export function getEndpointType(pathname: string, method: string): RateLimitType | null {
	if (method !== "POST") return null

	if (pathname.includes("/sign-in/email")) return "login"
	if (pathname.includes("/sign-up/email")) return "signup"
	if (pathname.includes("/forget-password")) return "forgotPassword"
	if (pathname.includes("/reset-password")) return "resetPassword"

	return null
}

export function createRateLimitResponse(result: RateLimitResult): Response {
	return new Response(
		JSON.stringify({
			error: "Too Many Requests",
			message: "You have made too many requests. Please try again later.",
			retryAfter: result.retryAfter,
		}),
		{
			status: 429,
			headers: {
				"Content-Type": "application/json",
				"Retry-After": String(result.retryAfter || 60),
				"X-RateLimit-Remaining": "0",
				"X-RateLimit-Reset": String(result.resetAt),
			},
		}
	)
}

function cleanup() {
	const now = Date.now()
	const staleThreshold = now - ENTRY_TTL_MS

	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.lastAttempt < staleThreshold && !entry.blocked) {
			rateLimitStore.delete(key)
		} else if (entry.blocked && entry.blockedUntil < staleThreshold) {
			rateLimitStore.delete(key)
		}
	}
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
	setInterval(cleanup, CLEANUP_INTERVAL_MS)
}
