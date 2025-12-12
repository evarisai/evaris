import type { Job } from "pg-boss"
import { prisma } from "../lib/db"
import { getBoss, EVAL_QUEUE, closeQueue, type EvalJobData } from "../lib/queue"
import { forwardToServer } from "../lib/server-proxy"
import { downloadFile } from "../lib/storage"

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

interface ParseError {
	line: number
	error: string
}

const PARSE_ERROR_THRESHOLD = 0.1 // Fail if more than 10% of lines have parse errors

interface DatasetFileInfo {
	id: string
	name: string
	filePath: string
}

async function loadFileItems(datasetId: string, file: DatasetFileInfo): Promise<TestCasePayload[]> {
	const text = await downloadFile(file.filePath)

	// Parse JSONL format (one JSON object per line)
	const items: TestCasePayload[] = []
	const parseErrors: ParseError[] = []
	const lines = text.split("\n")
	const nonEmptyLines = lines.filter((line) => line.trim())

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (!line.trim()) continue

		try {
			const data = JSON.parse(line) as Record<string, unknown>
			items.push({
				input: data.input ?? data.question ?? data.prompt ?? "",
				expected: data.expected ?? data.answer ?? data.target ?? null,
				actual_output: data.actual_output ?? data.output ?? data.response ?? "",
				context: data.context ?? data.contexts ?? null,
				metadata: {
					...((data.metadata as Record<string, unknown>) ?? {}),
					_sourceFile: file.name,
					_sourceFileId: file.id,
				},
			})
		} catch (parseError) {
			const errorMessage =
				parseError instanceof SyntaxError
					? `Invalid JSON syntax: ${parseError.message}`
					: parseError instanceof Error
						? parseError.message
						: "Unknown parsing error"

			parseErrors.push({ line: i + 1, error: errorMessage })
			console.error(
				`[Dataset ${datasetId}] [File ${file.name}] Failed to parse line ${i + 1}: ${errorMessage}`
			)
		}
	}

	// Fail if too many parse errors in this file
	if (parseErrors.length > 0 && nonEmptyLines.length > 0) {
		const errorRate = parseErrors.length / nonEmptyLines.length
		if (errorRate > PARSE_ERROR_THRESHOLD) {
			throw new Error(
				`File ${file.name} has too many parsing errors: ${parseErrors.length} of ${nonEmptyLines.length} lines (${(errorRate * 100).toFixed(1)}%). ` +
					`First error on line ${parseErrors[0].line}: ${parseErrors[0].error}`
			)
		}

		console.warn(
			`[Dataset ${datasetId}] [File ${file.name}] Skipped ${parseErrors.length} invalid lines. ` +
				`First error on line ${parseErrors[0].line}: ${parseErrors[0].error}`
		)
	}

	return items
}

async function loadDatasetItems(
	datasetId: string,
	files: DatasetFileInfo[]
): Promise<TestCasePayload[]> {
	if (!files || files.length === 0) {
		throw new Error(`Dataset ${datasetId} has no files. Please upload dataset files first.`)
	}

	try {
		// Load all files and combine items
		const allItems: TestCasePayload[] = []

		for (const file of files) {
			console.log(`[Dataset ${datasetId}] Loading file: ${file.name}`)
			const fileItems = await loadFileItems(datasetId, file)
			console.log(`[Dataset ${datasetId}] Loaded ${fileItems.length} items from ${file.name}`)
			allItems.push(...fileItems)
		}

		if (allItems.length === 0) {
			throw new Error(
				`Dataset ${datasetId} contains no valid test cases across ${files.length} files`
			)
		}

		return allItems
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message.includes("no valid test cases") || error.message.includes("parsing errors"))
		) {
			throw error
		}
		console.error(`Failed to load dataset ${datasetId}:`, error)
		throw new Error(
			`Failed to load dataset files: ${error instanceof Error ? error.message : "Unknown error"}`
		)
	}
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

		// Load dataset with files
		const dataset = await prisma.dataset.findUnique({
			where: { id: datasetId },
			include: {
				files: {
					select: { id: true, name: true, filePath: true },
				},
			},
		})

		if (!dataset) {
			throw new Error(`Dataset ${datasetId} not found`)
		}

		console.log(`Loading dataset ${datasetId} with ${dataset.files.length} files...`)

		// Load test cases from all dataset files
		const testCases = await loadDatasetItems(datasetId, dataset.files)

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
		// Log warning if server returned incomplete response
		if (!response.summary) {
			console.warn(
				`[Evaluation Job ${job.id}] Server returned response without summary - using fallback`,
				{
					evalId,
					responseStatus: response.status,
					hasResults: Boolean(response.results),
					resultsCount: response.results?.length ?? 0,
				}
			)
		}

		const summary = response.summary ?? {
			total: testCases.length,
			passed: 0,
			failed: testCases.length,
			accuracy: 0,
		}

		const duration = Date.now() - startTime

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
				durationMs: duration,
			},
		})

		// Store individual test results using batch insert for better performance
		if (response.results && response.results.length > 0) {
			try {
				await prisma.testResult.createMany({
					data: response.results.map((result) => ({
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
					})),
					skipDuplicates: true,
				})
				console.log(`[Evaluation Job ${job.id}] Stored ${response.results.length} test results`)
			} catch (storageError) {
				// Log but don't fail the job - the eval itself succeeded
				console.error(
					`[Evaluation Job ${job.id}] Failed to store test results:`,
					storageError instanceof Error ? storageError.message : storageError
				)
			}
		}

		console.log(
			`[Evaluation Job ${job.id}] Completed in ${duration}ms - Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}`
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
		const errorStack = error instanceof Error ? error.stack : undefined
		const duration = Date.now() - startTime

		console.error(`[Evaluation Job ${job.id}] Evaluation failed`, {
			evalId,
			datasetId,
			projectId,
			error: errorMessage,
			stack: errorStack,
			duration,
		})

		// Store error message in database so users can see what failed
		try {
			await prisma.eval.update({
				where: { id: evalId },
				data: {
					status: "FAILED",
					error: errorMessage.substring(0, 1000), // Truncate for safety
					completedAt: new Date(),
					durationMs: duration,
				},
			})
		} catch (dbError) {
			console.error(`[Evaluation Job ${job.id}] Failed to update eval status:`, {
				evalId,
				originalError: errorMessage,
				dbError: dbError instanceof Error ? dbError.message : String(dbError),
			})
		}

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
