export interface TestCase {
	input: string
	expected?: string
	actualOutput: string
	metadata?: Record<string, unknown>
}

export interface MetricScore {
	name: string
	score: number
	passed: boolean
	reasoning?: string
}

export interface TestResultItem {
	input: string
	expected?: string
	actualOutput: string
	scores: MetricScore[]
	passed: boolean
	latencyMs?: number
}

export interface AssessmentSummary {
	total: number
	passed: number
	failed: number
	accuracy: number
	avgLatencyMs?: number
}

export interface AssessmentResult {
	evalId: string
	status: string
	summary: AssessmentSummary
	results: TestResultItem[]
	createdAt: string
	completedAt?: string
}

export interface Span {
	name: string
	startTime: string
	endTime?: string
	durationMs?: number
	input?: Record<string, unknown>
	output?: Record<string, unknown>
	metadata?: Record<string, unknown>
	children?: Span[]
}

export interface TraceResult {
	traceId: string
	name: string
	durationMs: number
	spanCount: number
	createdAt: string
}

export interface LogResult {
	logId: string
	createdAt: string
}

export interface EvarisClientOptions {
	apiKey?: string
	baseUrl?: string
	timeout?: number
}
