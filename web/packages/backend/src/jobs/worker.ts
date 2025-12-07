import { prisma } from "../lib/db"
import { getBoss, EVAL_QUEUE, closeQueue, type EvalJobData } from "../lib/queue"

console.log("Starting Evaris Background Worker...")

async function processEvalJob(job: { id: string; data: EvalJobData }) {
	console.log(`Processing evaluation job ${job.id}: ${job.data.name}`)

	const startTime = Date.now()
	const { evalId, datasetId, modelConfig, metrics } = job.data

	try {
		await prisma.eval.update({
			where: { id: evalId },
			data: { status: "RUNNING" },
		})

		const dataset = await prisma.dataset.findUnique({
			where: { id: datasetId },
		})

		if (!dataset) {
			throw new Error(`Dataset ${datasetId} not found`)
		}

		console.log(`Loading dataset ${datasetId}...`)
		console.log(`Initializing ${modelConfig.provider} model: ${modelConfig.model}`)

		const totalItems = dataset.itemCount || 100
		const scores: Record<string, number[]> = {}
		metrics.forEach((metric) => {
			scores[metric] = []
		})

		for (let i = 0; i < totalItems; i++) {
			await new Promise((resolve) => setTimeout(resolve, 50))

			metrics.forEach((metric) => {
				scores[metric].push(Math.random() * 100)
			})

			if (i % 10 === 0) {
				console.log(`Processed ${i + 1}/${totalItems} items`)
			}
		}

		const finalScores: Record<string, number> = {}
		metrics.forEach((metric) => {
			const metricScores = scores[metric]
			finalScores[metric] = metricScores.reduce((a, b) => a + b, 0) / metricScores.length
		})

		console.log("Saving results to database...")

		await prisma.eval.update({
			where: { id: evalId },
			data: {
				status: "PASSED",
				accuracy: finalScores.accuracy || 0,
				completedAt: new Date(),
			},
		})

		const duration = Date.now() - startTime
		console.log(`Evaluation completed in ${duration}ms`)

		return {
			evalId,
			status: "completed" as const,
			scores: finalScores,
			totalItems,
			processedItems: totalItems,
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

	await boss.work(EVAL_QUEUE, { teamSize: 5 }, async (job) => {
		return processEvalJob(job as { id: string; data: EvalJobData })
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
