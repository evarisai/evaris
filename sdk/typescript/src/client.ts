import type {
	TestCase,
	AssessmentResult,
	AssessmentProgressEvent,
	TraceResult,
	LogResult,
	Span,
	EvarisClientOptions,
	AssessOptions,
	ExperimentConfig,
	ExperimentResult,
	ComplianceCheckResult,
	ComplianceFramework,
	ProgressCallback,
	AsyncProgressCallback,
	LogLevel,
} from "./types"
import { EvarisAPIError, EvarisStreamError, EvarisTimeoutError } from "./errors"

const DEFAULT_BASE_URL = "https://api.evaris.ai"
export const DEV_BASE_URL = "http://localhost:4000"
const DEFAULT_TIMEOUT = 120000

export class EvarisClient {
	private readonly apiKey: string
	private readonly baseUrl: string
	private readonly defaultProjectId?: string
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
		this.defaultProjectId = options.projectId ?? process.env.EVARIS_PROJECT_ID
		this.timeout = options.timeout ?? DEFAULT_TIMEOUT
	}

	private getHeaders(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.apiKey}`,
			"Content-Type": "application/json",
		}
	}

	private resolveProjectId(projectId?: string): string | undefined {
		return projectId ?? this.defaultProjectId
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
				throw new EvarisAPIError(
					`Request failed: ${response.status} ${response.statusText}`,
					response.status,
					text
				)
			}

			return response.json() as Promise<T>
		} catch (error) {
			if (error instanceof EvarisAPIError) throw error
			if (error instanceof Error && error.name === "AbortError") {
				throw new EvarisTimeoutError()
			}
			throw error
		} finally {
			clearTimeout(timeoutId)
		}
	}

	private serializeTestCase(tc: TestCase): Record<string, unknown> {
		return {
			input: tc.input,
			expected: tc.expected,
			actual_output: tc.actualOutput,
			context: tc.context,
			metadata: tc.metadata ?? {},
		}
	}

	async assess(options: AssessOptions): Promise<AssessmentResult>
	async assess(
		name: string,
		testCases: TestCase[],
		metrics: string[],
		metadata?: Record<string, unknown>
	): Promise<AssessmentResult>
	async assess(
		nameOrOptions: string | AssessOptions,
		testCases?: TestCase[],
		metrics?: string[],
		metadata?: Record<string, unknown>
	): Promise<AssessmentResult> {
		let opts: AssessOptions
		if (typeof nameOrOptions === "string") {
			if (!testCases || !metrics) {
				throw new Error("testCases and metrics are required when using positional arguments")
			}
			opts = {
				name: nameOrOptions,
				testCases,
				metrics,
				metadata,
			}
		} else {
			opts = nameOrOptions
		}

		const body: Record<string, unknown> = {
			name: opts.name,
			test_cases: opts.testCases.map((tc) => this.serializeTestCase(tc)),
			metrics: opts.metrics,
			metadata: opts.metadata ?? {},
		}

		const projectId = this.resolveProjectId(opts.projectId)
		if (projectId) body.project_id = projectId
		if (opts.experimentId) body.experiment_id = opts.experimentId
		if (opts.baselineEvalId) body.baseline_eval_id = opts.baselineEvalId
		if (opts.judgeConfig) {
			body.judge_config = {
				model: opts.judgeConfig.model,
				temperature: opts.judgeConfig.temperature,
				max_tokens: opts.judgeConfig.maxTokens,
				provider: opts.judgeConfig.provider,
				reasoning_effort: opts.judgeConfig.reasoningEffort,
			}
		}
		if (opts.config) {
			body.config = {
				model: opts.config.model,
				temperature: opts.config.temperature,
				max_tokens: opts.config.maxTokens,
				prompt: opts.config.prompt,
				system_prompt: opts.config.systemPrompt,
				top_p: opts.config.topP,
				frequency_penalty: opts.config.frequencyPenalty,
				presence_penalty: opts.config.presencePenalty,
			}
		}

		return this.request<AssessmentResult>("POST", "/api/assess", body)
	}

	async assessStream(
		options: AssessOptions,
		onProgress?: ProgressCallback | AsyncProgressCallback
	): Promise<AssessmentResult> {
		const body: Record<string, unknown> = {
			name: options.name,
			test_cases: options.testCases.map((tc) => this.serializeTestCase(tc)),
			metrics: options.metrics,
			metadata: options.metadata ?? {},
			stream: true,
		}

		const projectId = this.resolveProjectId(options.projectId)
		if (projectId) body.project_id = projectId
		if (options.experimentId) body.experiment_id = options.experimentId
		if (options.baselineEvalId) body.baseline_eval_id = options.baselineEvalId
		if (options.judgeConfig) {
			body.judge_config = {
				model: options.judgeConfig.model,
				temperature: options.judgeConfig.temperature,
				max_tokens: options.judgeConfig.maxTokens,
				provider: options.judgeConfig.provider,
				reasoning_effort: options.judgeConfig.reasoningEffort,
			}
		}

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.timeout)

		try {
			const response = await fetch(`${this.baseUrl}/api/assess/stream`, {
				method: "POST",
				headers: this.getHeaders(),
				body: JSON.stringify(body),
				signal: controller.signal,
			})

			if (!response.ok) {
				const text = await response.text()
				throw new EvarisAPIError(
					`Stream request failed: ${response.status}`,
					response.status,
					text
				)
			}

			if (!response.body) {
				throw new EvarisStreamError("Response body is null")
			}

			const reader = response.body.getReader()
			const decoder = new TextDecoder()
			let finalResult: AssessmentResult | null = null
			let buffer = ""

			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split("\n")
				buffer = lines.pop() ?? ""

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue
					const data = line.slice(6).trim()
					if (data === "[DONE]") continue

					try {
						const event = JSON.parse(data)
						if (event.status === "PASSED" || event.status === "FAILED") {
							finalResult = event as AssessmentResult
						} else if (onProgress) {
							const progressEvent = event as AssessmentProgressEvent
							const result = onProgress(progressEvent)
							if (result instanceof Promise) await result
						}
					} catch {
						// Skip malformed JSON
					}
				}
			}

			if (!finalResult) {
				throw new EvarisStreamError("Stream ended without final result")
			}

			return finalResult
		} catch (error) {
			if (error instanceof EvarisAPIError || error instanceof EvarisStreamError) throw error
			if (error instanceof Error && error.name === "AbortError") {
				throw new EvarisTimeoutError()
			}
			throw new EvarisStreamError(
				`Stream failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				error instanceof Error ? error : undefined
			)
		} finally {
			clearTimeout(timeoutId)
		}
	}

	async getAssessment(evalId: string): Promise<AssessmentResult> {
		return this.request<AssessmentResult>("GET", `/api/assessments/${evalId}`)
	}

	async trace(
		name: string,
		spans: Span[],
		metadata?: Record<string, unknown>,
		options?: {
			projectId?: string
			sessionId?: string
			userId?: string
			environment?: string
			release?: string
			tags?: string[]
		}
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

		const body: Record<string, unknown> = {
			name,
			spans: spans.map(serializeSpan),
			metadata: metadata ?? {},
		}

		const projectId = this.resolveProjectId(options?.projectId)
		if (projectId) body.project_id = projectId
		if (options?.sessionId) body.session_id = options.sessionId
		if (options?.userId) body.user_id = options.userId
		if (options?.environment) body.environment = options.environment
		if (options?.release) body.release = options.release
		if (options?.tags) body.tags = options.tags

		return this.request<TraceResult>("POST", "/api/trace", body)
	}

	async log(
		level: LogLevel | string,
		message: string,
		source?: string,
		metadata?: Record<string, unknown>,
		options?: { projectId?: string; agentId?: string; traceId?: string }
	): Promise<LogResult> {
		const body: Record<string, unknown> = {
			level,
			message,
			source: source ?? "sdk",
			metadata: metadata ?? {},
		}

		const projectId = this.resolveProjectId(options?.projectId)
		if (projectId) body.project_id = projectId
		if (options?.agentId) body.agent_id = options.agentId
		if (options?.traceId) body.trace_id = options.traceId

		return this.request<LogResult>("POST", "/api/log", body)
	}

	async createExperiment(config: ExperimentConfig, projectId?: string): Promise<ExperimentResult> {
		const body: Record<string, unknown> = {
			name: config.name,
			description: config.description,
			hypothesis: config.hypothesis,
			config: config.config,
			tags: config.tags,
			parent_id: config.parentId,
		}

		const resolvedProjectId = this.resolveProjectId(projectId)
		if (resolvedProjectId) body.project_id = resolvedProjectId

		return this.request<ExperimentResult>("POST", "/api/experiments", body)
	}

	async getExperiment(experimentId: string): Promise<ExperimentResult> {
		return this.request<ExperimentResult>("GET", `/api/experiments/${experimentId}`)
	}

	async checkCompliance(options?: {
		projectId?: string
		frameworks?: (ComplianceFramework | string)[]
		entityType?: string
		entityId?: string
	}): Promise<ComplianceCheckResult[]> {
		const resolvedProjectId = this.resolveProjectId(options?.projectId)
		if (!resolvedProjectId) {
			throw new Error("Project ID required for compliance check")
		}

		const body: Record<string, unknown> = {
			project_id: resolvedProjectId,
		}

		if (options?.frameworks) {
			body.frameworks = options.frameworks
		}
		if (options?.entityType) {
			body.entity_type = options.entityType
		}
		if (options?.entityId) {
			body.entity_id = options.entityId
		}

		return this.request<ComplianceCheckResult[]>("POST", "/api/compliance/check", body)
	}

	async getComplianceStatus(projectId?: string): Promise<ComplianceCheckResult[]> {
		const resolvedProjectId = this.resolveProjectId(projectId)
		if (!resolvedProjectId) {
			throw new Error("Project ID required for compliance status")
		}

		return this.request<ComplianceCheckResult[]>(
			"GET",
			`/api/compliance/status?project_id=${resolvedProjectId}`
		)
	}
}
