// Enums
export enum EvalStatus {
	PENDING = "PENDING",
	RUNNING = "RUNNING",
	PASSED = "PASSED",
	FAILED = "FAILED",
}

export enum ObservationType {
	SPAN = "SPAN",
	GENERATION = "GENERATION",
	EVENT = "EVENT",
}

export enum TraceStatus {
	OK = "OK",
	ERROR = "ERROR",
	UNSET = "UNSET",
}

export enum LogLevel {
	DEBUG = "DEBUG",
	INFO = "INFO",
	WARNING = "WARNING",
	ERROR = "ERROR",
	CRITICAL = "CRITICAL",
}

export enum MetricStatus {
	PASSED = "PASSED",
	FAILED = "FAILED",
	SKIPPED = "SKIPPED",
	ERROR = "ERROR",
}

export enum ComplianceFramework {
	ABC = "ABC",
	SOC2 = "SOC2",
	GDPR = "GDPR",
	EU_AI_ACT = "EU_AI_ACT",
}

export enum ComplianceStatus {
	COMPLIANT = "COMPLIANT",
	WARNING = "WARNING",
	VIOLATION = "VIOLATION",
	UNCHECKED = "UNCHECKED",
}

// Core Types
export interface TestCase {
	input: string | Record<string, unknown>
	expected?: string | Record<string, unknown>
	actualOutput: string | Record<string, unknown>
	context?: string | string[]
	metadata?: Record<string, unknown>
}

export interface MetricScore {
	name: string
	score: number
	passed: boolean
	status?: MetricStatus
	threshold?: number
	reasoning?: string
	metadata?: Record<string, unknown>
}

export interface TestResultItem {
	id?: string
	input: string | Record<string, unknown>
	expected?: string | Record<string, unknown>
	actualOutput: string | Record<string, unknown>
	context?: string | string[]
	scores: MetricScore[]
	passed: boolean
	overallScore?: number
	latencyMs?: number
	tokenCount?: number
	cost?: number
	error?: string
	errorType?: string
}

export interface AssessmentSummary {
	total: number
	passed: number
	failed: number
	accuracy: number
	avgLatencyMs?: number
	totalCost?: number
	totalTokens?: number
}

export interface EvalConfig {
	model?: string
	temperature?: number
	maxTokens?: number
	prompt?: string
	systemPrompt?: string
	topP?: number
	frequencyPenalty?: number
	presencePenalty?: number
}

export interface JudgeConfig {
	model?: string
	temperature?: number
	maxTokens?: number
	provider?: string
	reasoningEffort?: "low" | "medium" | "high"
}

export interface AssessmentResult {
	evalId: string
	name?: string
	status: EvalStatus | string
	progress?: number
	summary?: AssessmentSummary
	results?: TestResultItem[]
	projectId?: string
	experimentId?: string
	config?: EvalConfig
	createdAt: string
	startedAt?: string
	completedAt?: string
	durationMs?: number
	totalCost?: number
}

export interface AssessmentProgressEvent {
	evalId: string
	progress: number
	status: EvalStatus | string
	currentTest?: number
	totalTests?: number
	currentResult?: TestResultItem
	message?: string
}

// Trace Types
export interface Observation {
	spanId: string
	parentSpanId?: string
	type: ObservationType
	name: string
	startTime: string
	endTime?: string
	durationMs?: number
	status?: TraceStatus
	statusMessage?: string
	model?: string
	modelParams?: Record<string, unknown>
	input?: Record<string, unknown>
	output?: Record<string, unknown>
	inputTokens?: number
	outputTokens?: number
	totalTokens?: number
	cost?: number
	eventName?: string
	attributes?: Record<string, unknown>
	events?: Array<{ name: string; timestamp: string; attributes?: Record<string, unknown> }>
	metadata?: Record<string, unknown>
	children?: Observation[]
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
	spanCount?: number
	observationCount?: number
	totalTokens?: number
	totalCost?: number
	sessionId?: string
	createdAt: string
}

// Log Types
export interface LogResult {
	logId: string
	createdAt: string
}

// Experiment Types
export interface ExperimentConfig {
	name: string
	description?: string
	hypothesis?: string
	config?: Record<string, unknown>
	tags?: string[]
	parentId?: string
}

export interface ExperimentResult {
	experimentId: string
	name: string
	version?: number
	projectId: string
	evals?: string[]
	createdAt: string
	updatedAt?: string
}

// Compliance Types
export interface ComplianceRule {
	id: string
	name: string
	description?: string
	status: ComplianceStatus
	score?: number
	passed: boolean
	evidence?: string
	reasoning?: string
	suggestion?: string
}

export interface ComplianceCheckResult {
	framework: ComplianceFramework
	status: ComplianceStatus
	score: number
	totalRules: number
	passedRules: number
	warningRules: number
	violationRules: number
	rules: ComplianceRule[]
	checkedAt: string
}

// Client Options
export interface EvarisClientOptions {
	apiKey?: string
	baseUrl?: string
	projectId?: string
	timeout?: number
}

// Assess Options
export interface AssessOptions {
	name: string
	testCases: TestCase[]
	metrics: string[]
	projectId?: string
	experimentId?: string
	baselineEvalId?: string
	judgeConfig?: JudgeConfig
	config?: EvalConfig
	metadata?: Record<string, unknown>
}

// Callback Types
export type ProgressCallback = (event: AssessmentProgressEvent) => void
export type AsyncProgressCallback = (event: AssessmentProgressEvent) => Promise<void>
