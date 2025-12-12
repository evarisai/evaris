import type { Job } from "pg-boss"
import { prisma } from "../lib/db"
import { getBoss, EVAL_QUEUE, closeQueue, type EvalJobData } from "../lib/queue"
import { forwardToServer } from "../lib/server-proxy"

console.log("Starting Evaris Background Worker...")

interface TestCasePayload {
	input: unknown
	expected: unknown | null
	actual_output: unknown
	context: unknown | null
	metadata: Record<string, unknown>
}

interface EvaluateRequest {
	name: string
	test_cases: TestCasePayload[]
	metrics: string[]
	dataset_id?: string
	metadata?: Record<string, unknown>
}

interface MetricScore {
	name: string
	score: number
	passed: boolean
	threshold?: number
	reasoning?: string
	metadata?: Record<string, unknown>
}

interface TestResultResponse {
	id: string
	input: unknown
	expected: unknown | null
	actual_output: unknown
	scores: MetricScore[]
	passed: boolean
	latency_ms?: number
	error?: string
	metadata?: Record<string, unknown>
}

interface EvaluateResponse {
	eval_id: string
	organization_id: string
	project_id: string
	name: string
	status: "PENDING" | "RUNNING" | "PASSED" | "FAILED"
	summary?: {
		total: number
		passed: number
		failed: number
		accuracy: number
		metrics?: Record<
			string,
			{
				accuracy: number
				avg_score: number
				min_score?: number
				max_score?: number
			}
		>
	}
	results?: TestResultResponse[]
	created_at: string
	completed_at?: string
	metadata?: Record<string, unknown>
}

async function loadDatasetItems(
	datasetId: string,
	fileUrl: string | null
): Promise<TestCasePayload[]> {
	// TODO: Implement proper dataset file loading from storage (Supabase Storage/S3)
	// For now, if fileUrl exists, we'd fetch and parse it
	// This is a placeholder until dataset storage is fully implemented

	if (fileUrl) {
		try {
			const response = await fetch(fileUrl)
			if (!response.ok) {
				throw new Error(`Failed to fetch dataset: ${response.status}`)
			}
			const text = await response.text()

			// Parse JSONL format (one JSON object per line)
			const items: TestCasePayload[] = []
			for (const line of text.split("\n")) {
				if (!line.trim()) continue
				try {
					const data = JSON.parse(line) as Record<string, unknown>
					items.push({
						input: data.input ?? data.question ?? data.prompt ?? "",
						expected: data.expected ?? data.answer ?? data.target ?? null,
						actual_output: data.actual_output ?? data.output ?? data.response ?? "",
						context: data.context ?? data.contexts ?? null,
						metadata: (data.metadata as Record<string, unknown>) ?? {},
					})
				} catch {
					console.warn(`Skipping invalid JSON line in dataset ${datasetId}`)
				}
			}
			return items
		} catch (error) {
			console.error(`Failed to load dataset from ${fileUrl}:`, error)
			throw new Error(`Dataset file not accessible: ${datasetId}`)
		}
	}

	// No fileUrl - dataset storage not implemented yet
	throw new Error(`Dataset ${datasetId} has no file URL. Dataset storage is not yet implemented.`)
}

async function processEvalJob(job: Job<EvalJobData>) {
	const jobData = job.data
	console.log(`Processing evaluation job ${job.id}: ${jobData.name}`)

	const startTime = Date.now()
	const { evalId, projectId, datasetId, metrics, name } = jobData

	try {
		// Update status to RUNNING
		const evalRecord = await prisma.eval.update({
			where: { id: evalId },
			data: { status: "RUNNING" },
		})

		const organizationId = evalRecord.organizationId

		// Load dataset
		const dataset = await prisma.dataset.findUnique({
			where: { id: datasetId },
		})

		if (!dataset) {
			throw new Error(`Dataset ${datasetId} not found`)
		}

		console.log(`Loading dataset ${datasetId}...`)

		// Load test cases from dataset file
		const testCases = await loadDatasetItems(datasetId, dataset.fileUrl)

		if (testCases.length === 0) {
			throw new Error("Dataset has no items to evaluate")
		}

		console.log(
			`Calling evaluation server with ${testCases.length} test cases and metrics: ${metrics.join(", ")}`
		)

		// Call the FastAPI server to run actual evaluation
		const evalRequest: EvaluateRequest = {
			name: name,
			test_cases: testCases,
			metrics: metrics,
			dataset_id: datasetId,
			metadata: { job_id: job.id },
		}

		const { data: response, status } = await forwardToServer<EvaluateResponse>(
			"/internal/evaluate",
			"POST",
			{
				organizationId,
				projectId,
				userId: "worker",
				permissions: ["evaluate"],
			},
			evalRequest
		)

		if (status >= 400) {
			const errorResponse = response as unknown as { error?: string; message?: string }
			throw new Error(errorResponse.message || errorResponse.error || `Server returned ${status}`)
		}

		console.log(`Evaluation server returned status: ${response.status}`)

		// Update the eval record with results from the server
		const summary = response.summary || {
			total: testCases.length,
			passed: 0,
			failed: testCases.length,
			accuracy: 0,
		}

		await prisma.eval.update({
			where: { id: evalId },
			data: {
				status: response.status === "PASSED" ? "PASSED" : "FAILED",
				total: summary.total,
				passed: summary.passed,
				failed: summary.failed,
				accuracy: summary.accuracy,
				summary: summary,
				completedAt: new Date(),
			},
		})

		// Store individual test results if available
		if (response.results && response.results.length > 0) {
			for (const result of response.results) {
				await prisma.testResult.create({
					data: {
						id: result.id,
						evalId: evalId,
						input: result.input as object,
						expected: result.expected as object | undefined,
						actualOutput: result.actual_output as object,
						scores: result.scores as unknown as object,
						passed: result.passed,
						latencyMs: result.latency_ms,
						error: result.error,
						metadata: (result.metadata ?? {}) as object,
					},
				})
			}
		}

		const duration = Date.now() - startTime
		console.log(
			`Evaluation completed in ${duration}ms - Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}`
		)

		return {
			evalId,
			status: "completed" as const,
			scores: summary.metrics || {},
			totalItems: summary.total,
			processedItems: summary.total,
			duration,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"

		console.error(`Evaluation failed: ${errorMessage}`)

		await prisma.eval
			.update({
				where: { id: evalId },
				data: { status: "FAILED" },
			})
			.catch((dbError) => {
				console.error("Failed to update eval status:", dbError)
			})

		throw error
	}
}

async function startWorker() {
	const boss = await getBoss()

	await boss.work<EvalJobData>(EVAL_QUEUE, async (jobs) => {
		// pg-boss passes an array of jobs
		for (const job of jobs) {
			await processEvalJob(job)
		}
	})

	console.log("Worker is running and waiting for jobs...")
}

async function shutdown() {
	console.log("Shutting down worker...")
	await closeQueue()
	await prisma.$disconnect()
	process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

startWorker().catch((error) => {
	console.error("Failed to start worker:", error)
	process.exit(1)
})
