import PgBoss from "pg-boss"

export interface EvalJobData {
	evalId: string
	projectId: string
	datasetId: string
	modelConfig: {
		provider: "openai" | "anthropic" | "google" | "custom"
		model: string
		temperature?: number
		maxTokens?: number
	}
	metrics: string[]
	name: string
}

export interface EvalJobResult {
	evalId: string
	status: "completed" | "failed"
	scores: Record<string, number>
	totalItems: number
	processedItems: number
	duration: number
	error?: string
}

export const EVAL_QUEUE = "evaluations"
export const DATA_QUEUE = "data-processing"

let boss: PgBoss | null = null

export async function getBoss(): Promise<PgBoss> {
	if (!boss) {
		const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
		if (!connectionString) {
			throw new Error("DIRECT_URL or DATABASE_URL is required")
		}

		boss = new PgBoss({
			connectionString,
			retryLimit: 3,
			retryDelay: 5,
			retryBackoff: true,
			expireInSeconds: 60 * 60 * 12, // 12 hours
		})

		boss.on("error", (error) => console.error("pg-boss error:", error))

		await boss.start()
		console.log("pg-boss started")
	}
	return boss
}

export async function sendEvalJob(data: EvalJobData): Promise<string | null> {
	const b = await getBoss()
	return b.send(EVAL_QUEUE, data)
}

export async function sendDataJob(data: Record<string, unknown>): Promise<string | null> {
	const b = await getBoss()
	return b.send(DATA_QUEUE, data, {
		retryLimit: 2,
		retryDelay: 3,
	})
}

export async function getQueueStats() {
	const b = await getBoss()
	const [evalCount, dataCount] = await Promise.all([
		b.getQueueSize(EVAL_QUEUE),
		b.getQueueSize(DATA_QUEUE),
	])

	return {
		evaluations: { waiting: evalCount },
		dataProcessing: { waiting: dataCount },
	}
}

export async function getJobById(queue: string, jobId: string) {
	const b = await getBoss()
	return b.getJobById(queue, jobId)
}

export async function closeQueue() {
	if (boss) {
		await boss.stop()
		boss = null
	}
}
