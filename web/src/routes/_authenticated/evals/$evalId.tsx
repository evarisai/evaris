import { createFileRoute, Link } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import {
	ArrowLeft,
	Loader2,
	CheckCircle2,
	XCircle,
	Clock,
	Target,
	TrendingUp,
	TrendingDown,
	BarChart3,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MetricCharts } from "@/components/evals/MetricCharts"
import { MetricInsights } from "@/components/evals/MetricInsights"
import { TestResultsTable } from "@/components/evals/TestResultsTable"

export const Route = createFileRoute("/_authenticated/evals/$evalId")({
	component: EvalDetailPage,
})

interface MetricScore {
	id?: string
	metricName: string
	score: number
	passed: boolean
	threshold: number | null
	reason: string | null
	metadata?: Record<string, unknown>
}

interface RawScoreData {
	name: string
	score: number
	passed: boolean
	threshold?: number | null
	reasoning?: string | null
	metadata?: Record<string, unknown>
}

interface TestResult {
	id: string
	input: unknown
	expected: unknown
	actualOutput: unknown
	context?: unknown
	scores: RawScoreData[] | unknown
	passed: boolean
	overallScore: number | null
	latencyMs: number | null
	tokenCount: number | null
	cost: number | null
	error: string | null
	errorType: string | null
	metadata: Record<string, unknown>
	metricScores: MetricScore[]
}

function parseScores(result: TestResult): MetricScore[] {
	// Prefer already-transformed metric scores
	if (result.metricScores?.length > 0) {
		return result.metricScores
	}

	// Transform raw scores if available
	if (!Array.isArray(result.scores)) {
		return []
	}

	return (result.scores as RawScoreData[]).map((s, i) => ({
		id: `${result.id}-score-${i}`,
		metricName: s.name,
		score: s.score,
		passed: s.passed,
		threshold: s.threshold ?? null,
		reason: s.reasoning ?? null,
		metadata: s.metadata ?? {},
	}))
}

function formatMetricName(name: string): string {
	return name
		.replace(/_/g, " ")
		.replace(/([A-Z])/g, " $1")
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ")
		.trim()
}

function EvalDetailPage() {
	const { evalId } = Route.useParams()
	const [isMounted, setIsMounted] = useState(false)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	const { data, isLoading, error } = trpc.evals.getByIdWithResults.useQuery({
		id: evalId,
		resultsLimit: 500,
	})

	const testResults = (data?.testResults ?? []) as TestResult[]

	const metricStats = useMemo(() => {
		const stats: Record<string, { total: number; passed: number; scores: number[] }> = {}

		for (const result of testResults) {
			const scores = parseScores(result)
			for (const metric of scores) {
				if (!stats[metric.metricName]) {
					stats[metric.metricName] = { total: 0, passed: 0, scores: [] }
				}
				stats[metric.metricName].total++
				if (metric.passed) stats[metric.metricName].passed++
				stats[metric.metricName].scores.push(metric.score)
			}
		}

		return Object.entries(stats).map(([name, statData]) => ({
			name: formatMetricName(name),
			rawName: name,
			passRate: statData.total > 0 ? (statData.passed / statData.total) * 100 : 0,
			avgScore:
				statData.scores.length > 0
					? statData.scores.reduce((a, b) => a + b, 0) / statData.scores.length
					: 0,
			total: statData.total,
			passed: statData.passed,
		}))
	}, [testResults])

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-muted-foreground">Loading evaluation...</p>
				</div>
			</div>
		)
	}

	if (error || !data) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Card className="max-w-md">
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-4 text-center">
							<XCircle className="h-12 w-12 text-destructive" />
							<div>
								<h2 className="text-lg font-semibold">Evaluation Not Found</h2>
								<p className="text-muted-foreground mt-1">
									{error?.message || "The requested evaluation could not be found."}
								</p>
							</div>
							<Link to="/evals">
								<Button variant="outline">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Evaluations
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	const evalData = data

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Back Navigation */}
			<Link
				to="/evals"
				className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Evaluations
			</Link>

			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<h1 className="text-3xl font-semibold tracking-tight">{evalData.name}</h1>
						<StatusBadge status={evalData.status} />
					</div>
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<span>{evalData.project?.name}</span>
						{evalData.dataset && (
							<>
								<span className="text-border">|</span>
								<span>{evalData.dataset.name}</span>
							</>
						)}
						{evalData.completedAt && (
							<>
								<span className="text-border">|</span>
								<span>
									Completed{" "}
									{formatDistanceToNow(new Date(evalData.completedAt), { addSuffix: true })}
								</span>
							</>
						)}
					</div>
				</div>

				<div className="flex gap-2">
					<Button variant="outline" size="sm">
						Re-run Evaluation
					</Button>
					<Button variant="outline" size="sm">
						Export Results
					</Button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Total Test Cases"
					value={evalData.total ?? 0}
					icon={<BarChart3 className="h-4 w-4" />}
					description="Total evaluated"
				/>
				<StatCard
					title="Passed"
					value={evalData.passed ?? 0}
					icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
					description={`${(((evalData.passed ?? 0) / (evalData.total ?? 1)) * 100).toFixed(1)}% pass rate`}
					variant="success"
				/>
				<StatCard
					title="Failed"
					value={evalData.failed ?? 0}
					icon={<XCircle className="h-4 w-4 text-destructive" />}
					description="Need attention"
					variant="destructive"
				/>
				<StatCard
					title="Accuracy"
					value={`${((evalData.accuracy ?? 0) * 100).toFixed(1)}%`}
					icon={<Target className="h-4 w-4" />}
					description={
						evalData.baselineEval
							? `vs ${((evalData.baselineEval.accuracy ?? 0) * 100).toFixed(1)}% baseline`
							: "Overall accuracy"
					}
					trend={
						evalData.baselineEval
							? (evalData.accuracy ?? 0) > (evalData.baselineEval.accuracy ?? 0)
								? "up"
								: "down"
							: undefined
					}
				/>
			</div>

			{/* Charts Section */}
			<MetricCharts
				testResults={testResults}
				metricStats={metricStats}
				evalData={{
					total: evalData.total,
					passed: evalData.passed,
					failed: evalData.failed,
					accuracy: evalData.accuracy,
					baselineEval: evalData.baselineEval,
				}}
				isMounted={isMounted}
			/>

			{/* Insights Section */}
			<MetricInsights
				testResults={testResults}
				metricStats={metricStats}
				evalData={{
					total: evalData.total,
					passed: evalData.passed,
					failed: evalData.failed,
					accuracy: evalData.accuracy,
					baselineEval: evalData.baselineEval,
				}}
			/>

			{/* Test Results Table */}
			<TestResultsTable testResults={testResults} />
		</div>
	)
}

function StatusBadge({ status }: { status: string }) {
	const variants: Record<string, { className: string; icon: React.ReactNode }> = {
		PASSED: {
			className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
			icon: <CheckCircle2 className="h-3 w-3" />,
		},
		FAILED: {
			className: "bg-destructive/10 text-destructive border-destructive/20",
			icon: <XCircle className="h-3 w-3" />,
		},
		RUNNING: {
			className: "bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse",
			icon: <Loader2 className="h-3 w-3 animate-spin" />,
		},
		PENDING: {
			className: "bg-muted text-muted-foreground",
			icon: <Clock className="h-3 w-3" />,
		},
	}

	const variant = variants[status] || variants.PENDING

	return (
		<Badge variant="outline" className={cn("gap-1", variant.className)}>
			{variant.icon}
			{status}
		</Badge>
	)
}

function StatCard({
	title,
	value,
	icon,
	description,
	variant,
	trend,
}: {
	title: string
	value: string | number
	icon: React.ReactNode
	description?: string
	variant?: "success" | "destructive"
	trend?: "up" | "down"
}) {
	return (
		<Card>
			<CardContent className="pt-6">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<p className="text-sm text-muted-foreground">{title}</p>
						<div className="flex items-center gap-2">
							<p
								className={cn(
									"text-2xl font-semibold",
									variant === "success" && "text-emerald-600",
									variant === "destructive" && "text-destructive"
								)}
							>
								{value}
							</p>
							{trend &&
								(trend === "up" ? (
									<TrendingUp className="h-4 w-4 text-emerald-500" />
								) : (
									<TrendingDown className="h-4 w-4 text-destructive" />
								))}
						</div>
						{description && <p className="text-xs text-muted-foreground">{description}</p>}
					</div>
					<div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
						{icon}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
