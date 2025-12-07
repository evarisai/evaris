import type {
	TestCase,
	AssessmentResult,
	TraceResult,
	LogResult,
	Span,
	EvarisClientOptions,
} from "./types"

/**
 * Production URL - points to the web backend API gateway
 * The web backend validates API keys and forwards to internal eval server
 */
const DEFAULT_BASE_URL = "https://api.evaris.ai"

/**
 * Development URL - for local testing
 */
export const DEV_BASE_URL = "http://localhost:4000"

const DEFAULT_TIMEOUT = 120000

/**
 * Evaris Client - Lightweight client for Evaris AI evaluation platform.
 *
 * The client connects to the Evaris web backend which validates the API key
 * and forwards requests to the internal evaluation server.
 */
export class EvarisClient {
	private readonly apiKey: string
	private readonly baseUrl: string
	private readonly timeout: number

	constructor(options: EvarisClientOptions = {}) {
		this.apiKey = options.apiKey ?? process.env.EVARIS_API_KEY ?? ""
		if (!this.apiKey) {
			throw new Error("API key required. Set EVARIS_API_KEY or pass apiKey option.")
		}

		this.baseUrl = (options.baseUrl ?? process.env.EVARIS_BASE_URL ?? DEFAULT_BASE_URL).replace(
			/\/$/,
			""
		)
		this.timeout = options.timeout ?? DEFAULT_TIMEOUT
	}

	private getHeaders(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.apiKey}`,
			"Content-Type": "application/json",
		}
	}

	private async request<T>(
		method: string,
		path: string,
		body?: Record<string, unknown>
	): Promise<T> {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.timeout)

		try {
			const response = await fetch(`${this.baseUrl}${path}`, {
				method,
				headers: this.getHeaders(),
				body: body ? JSON.stringify(body) : undefined,
				signal: controller.signal,
			})

			if (!response.ok) {
				const text = await response.text()
				throw new Error(`Request failed: ${response.status} ${text}`)
			}

			return response.json() as Promise<T>
		} finally {
			clearTimeout(timeoutId)
		}
	}

	async assess(
		name: string,
		testCases: TestCase[],
		metrics: string[],
		metadata?: Record<string, unknown>
	): Promise<AssessmentResult> {
		return this.request<AssessmentResult>("POST", "/api/assess", {
			name,
			test_cases: testCases.map((tc) => ({
				input: tc.input,
				expected: tc.expected,
				actual_output: tc.actualOutput,
				metadata: tc.metadata ?? {},
			})),
			metrics,
			metadata: metadata ?? {},
		})
	}

	async trace(
		name: string,
		spans: Span[],
		metadata?: Record<string, unknown>
	): Promise<TraceResult> {
		const serializeSpan = (span: Span): Record<string, unknown> => ({
			name: span.name,
			start_time: span.startTime,
			end_time: span.endTime,
			duration_ms: span.durationMs,
			input: span.input,
			output: span.output,
			metadata: span.metadata ?? {},
			children: (span.children ?? []).map(serializeSpan),
		})

		return this.request<TraceResult>("POST", "/api/trace", {
			name,
			spans: spans.map(serializeSpan),
			metadata: metadata ?? {},
		})
	}

	async log(
		level: string,
		message: string,
		source?: string,
		metadata?: Record<string, unknown>
	): Promise<LogResult> {
		return this.request<LogResult>("POST", "/api/log", {
			level,
			message,
			source: source ?? "sdk",
			metadata: metadata ?? {},
		})
	}

	async getAssessment(evalId: string): Promise<AssessmentResult> {
		return this.request<AssessmentResult>("GET", `/api/assessments/${evalId}`)
	}
}
