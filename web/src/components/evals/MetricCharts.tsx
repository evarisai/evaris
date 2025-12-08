import { motion } from "framer-motion"
import { useMemo, useState } from "react"
import {
	AreaChart,
	Area,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	Radar,
	Legend,
	ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Clock, DollarSign, Activity, Layers } from "lucide-react"

interface MetricScore {
	id?: string
	metricName: string
	score: number
	passed: boolean
	threshold: number | null
	reason: string | null
	metadata?: Record<string, unknown>
}

interface TestResult {
	id: string
	input?: unknown
	expected?: unknown
	actualOutput?: unknown
	context?: unknown
	passed: boolean
	overallScore: number | null
	latencyMs?: number | null
	tokenCount?: number | null
	cost?: number | null
	error?: string | null
	errorType?: string | null
	metadata?: Record<string, unknown>
	scores?: unknown
	metricScores: MetricScore[]
}

interface MetricStat {
	name: string
	rawName: string
	passRate: number
	avgScore: number
	total: number
	passed: number
}

interface BaselineEval {
	id: string
	name: string
	accuracy: number | null
}

interface MetricChartsProps {
	testResults: TestResult[]
	metricStats: MetricStat[]
	evalData: {
		total: number | null
		passed: number | null
		failed: number | null
		accuracy: number | null
		baselineEval?: BaselineEval | null
	}
	isMounted: boolean
}

const CHART_COLORS = {
	primary: "hsl(var(--chart-1))",
	secondary: "hsl(var(--chart-2))",
	tertiary: "hsl(var(--chart-3))",
	quaternary: "hsl(var(--chart-4))",
	quinary: "hsl(var(--chart-5))",
	success: "hsl(160 72% 47%)",
	danger: "hsl(var(--destructive))",
	muted: "hsl(var(--muted-foreground))",
}

const GRADIENT_COLORS = [
	{ start: "hsl(160 72% 47%)", end: "hsl(160 72% 35%)" },
	{ start: "hsl(220 80% 60%)", end: "hsl(220 80% 45%)" },
	{ start: "hsl(280 75% 65%)", end: "hsl(280 75% 50%)" },
	{ start: "hsl(35 95% 55%)", end: "hsl(35 95% 40%)" },
	{ start: "hsl(340 80% 60%)", end: "hsl(340 80% 45%)" },
]

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.1 },
	},
}

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
	},
}

function CustomTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean
	payload?: Array<{ value: number; name: string; color: string }>
	label?: string
}) {
	if (!active || !payload?.length) return null
	return (
		<div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
			<p className="text-sm font-medium text-foreground mb-2">{label}</p>
			{payload.map((entry) => (
				<div key={entry.name} className="flex items-center gap-2 text-sm">
					<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
					<span className="text-muted-foreground">{entry.name}:</span>
					<span className="font-mono font-medium text-foreground">
						{typeof entry.value === "number" ? `${entry.value.toFixed(1)}%` : entry.value}
					</span>
				</div>
			))}
		</div>
	)
}

export function MetricCharts({ testResults, metricStats, evalData, isMounted }: MetricChartsProps) {
	const [activeChart, setActiveChart] = useState<"distribution" | "performance" | "latency">(
		"distribution"
	)

	const pieChartData = useMemo(
		() => [
			{ name: "Passed", value: evalData.passed ?? 0, color: CHART_COLORS.success },
			{ name: "Failed", value: evalData.failed ?? 0, color: CHART_COLORS.danger },
		],
		[evalData.passed, evalData.failed]
	)

	const radarChartData = useMemo(
		() =>
			metricStats.map((m) => ({
				metric: m.name,
				score: m.avgScore * 100,
				passRate: m.passRate,
				fullMark: 100,
			})),
		[metricStats]
	)

	const barChartData = useMemo(
		() =>
			metricStats.map((m, i) => ({
				name: m.name,
				passRate: m.passRate,
				avgScore: m.avgScore * 100,
				fill: GRADIENT_COLORS[i % GRADIENT_COLORS.length].start,
			})),
		[metricStats]
	)

	const scoreDistribution = useMemo(() => {
		const buckets = Array.from({ length: 10 }, (_, i) => ({
			range: `${i * 10}-${(i + 1) * 10}%`,
			count: 0,
			passed: 0,
			failed: 0,
		}))
		for (const result of testResults) {
			if (result.overallScore != null) {
				const bucketIndex = Math.min(Math.floor(result.overallScore * 10), 9)
				buckets[bucketIndex].count++
				if (result.passed) buckets[bucketIndex].passed++
				else buckets[bucketIndex].failed++
			}
		}
		return buckets
	}, [testResults])

	const latencyDistribution = useMemo(() => {
		const validLatencies = testResults
			.filter((r) => r.latencyMs != null)
			.map((r) => r.latencyMs as number)
		if (validLatencies.length === 0) return []

		const maxLatency = Math.max(...validLatencies)
		const bucketSize = Math.ceil(maxLatency / 8)
		const buckets = Array.from({ length: 8 }, (_, i) => ({
			range: `${i * bucketSize}-${(i + 1) * bucketSize}ms`,
			count: 0,
			avgScore: 0,
			totalScore: 0,
		}))

		for (const result of testResults) {
			if (result.latencyMs != null) {
				const bucketIndex = Math.min(Math.floor(result.latencyMs / bucketSize), 7)
				buckets[bucketIndex].count++
				if (result.overallScore != null) {
					buckets[bucketIndex].totalScore += result.overallScore
				}
			}
		}

		return buckets.map((b) => ({
			...b,
			avgScore: b.count > 0 ? (b.totalScore / b.count) * 100 : 0,
		}))
	}, [testResults])

	const performanceMetrics = useMemo(() => {
		const validResults = testResults.filter((r) => r.latencyMs != null)
		const avgLatency =
			validResults.length > 0
				? validResults.reduce((a, b) => a + (b.latencyMs ?? 0), 0) / validResults.length
				: 0
		const totalTokens = testResults.reduce((a, b) => a + (b.tokenCount ?? 0), 0)
		const totalCost = testResults.reduce((a, b) => a + (b.cost ?? 0), 0)
		const p50Latency =
			validResults.length > 0
				? (validResults.sort((a, b) => (a.latencyMs ?? 0) - (b.latencyMs ?? 0))[
						Math.floor(validResults.length * 0.5)
					]?.latencyMs ?? 0)
				: 0
		const p95Latency =
			validResults.length > 0
				? (validResults.sort((a, b) => (a.latencyMs ?? 0) - (b.latencyMs ?? 0))[
						Math.floor(validResults.length * 0.95)
					]?.latencyMs ?? 0)
				: 0

		return { avgLatency, totalTokens, totalCost, p50Latency, p95Latency }
	}, [testResults])

	if (!isMounted) {
		return (
			<div className="grid gap-6 lg:grid-cols-2">
				{[1, 2, 3, 4].map((i) => (
					<Card key={i} className="animate-pulse">
						<CardHeader>
							<div className="h-5 w-32 bg-muted rounded" />
							<div className="h-4 w-48 bg-muted/60 rounded mt-2" />
						</CardHeader>
						<CardContent>
							<div className="h-[280px] bg-muted/30 rounded-lg" />
						</CardContent>
					</Card>
				))}
			</div>
		)
	}

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			className="space-y-6"
		>
			{/* Performance Summary Cards */}
			<motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<PerformanceCard
					title="Avg Latency"
					value={`${performanceMetrics.avgLatency.toFixed(0)}ms`}
					subtitle={`P50: ${performanceMetrics.p50Latency.toFixed(0)}ms`}
					icon={<Clock className="h-4 w-4" />}
					trend={performanceMetrics.avgLatency < 1000 ? "good" : "warning"}
				/>
				<PerformanceCard
					title="P95 Latency"
					value={`${performanceMetrics.p95Latency.toFixed(0)}ms`}
					subtitle="95th percentile"
					icon={<Activity className="h-4 w-4" />}
					trend={performanceMetrics.p95Latency < 2000 ? "good" : "warning"}
				/>
				<PerformanceCard
					title="Total Tokens"
					value={performanceMetrics.totalTokens.toLocaleString()}
					subtitle={`~${(performanceMetrics.totalTokens / testResults.length).toFixed(0)}/test`}
					icon={<Layers className="h-4 w-4" />}
				/>
				<PerformanceCard
					title="Total Cost"
					value={`$${performanceMetrics.totalCost.toFixed(4)}`}
					subtitle={`~$${(performanceMetrics.totalCost / testResults.length).toFixed(6)}/test`}
					icon={<DollarSign className="h-4 w-4" />}
				/>
			</motion.div>

			{/* Main Charts Grid */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Pass/Fail Donut Chart */}
				<motion.div variants={itemVariants}>
					<Card className="overflow-hidden">
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="text-lg font-semibold">Pass/Fail Distribution</CardTitle>
									<CardDescription>Overview of test case outcomes</CardDescription>
								</div>
								<Badge variant="outline" className="font-mono">
									{((evalData.accuracy ?? 0) * 100).toFixed(1)}% accuracy
								</Badge>
							</div>
						</CardHeader>
						<CardContent>
							<div className="h-[280px] relative">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<defs>
											<linearGradient id="passGradient" x1="0" y1="0" x2="1" y2="1">
												<stop offset="0%" stopColor="hsl(160 72% 55%)" />
												<stop offset="100%" stopColor="hsl(160 72% 40%)" />
											</linearGradient>
											<linearGradient id="failGradient" x1="0" y1="0" x2="1" y2="1">
												<stop offset="0%" stopColor="hsl(0 72% 55%)" />
												<stop offset="100%" stopColor="hsl(0 72% 45%)" />
											</linearGradient>
											<filter id="glow">
												<feGaussianBlur stdDeviation="3" result="coloredBlur" />
												<feMerge>
													<feMergeNode in="coloredBlur" />
													<feMergeNode in="SourceGraphic" />
												</feMerge>
											</filter>
										</defs>
										<Pie
											data={pieChartData}
											cx="50%"
											cy="50%"
											innerRadius={70}
											outerRadius={100}
											paddingAngle={3}
											dataKey="value"
											strokeWidth={0}
											filter="url(#glow)"
										>
											{pieChartData.map((entry, index) => (
												<Cell
													key={entry.name}
													fill={index === 0 ? "url(#passGradient)" : "url(#failGradient)"}
												/>
											))}
										</Pie>
										<Tooltip content={<CustomTooltip />} />
										<Legend
											verticalAlign="bottom"
											height={36}
											formatter={(value) => (
												<span className="text-sm text-muted-foreground">{value}</span>
											)}
										/>
									</PieChart>
								</ResponsiveContainer>
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
									<div className="text-center">
										<p className="text-3xl font-bold tracking-tight">{evalData.passed ?? 0}</p>
										<p className="text-xs text-muted-foreground uppercase tracking-wide">passed</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* Metric Performance Radar */}
				<motion.div variants={itemVariants}>
					<Card className="overflow-hidden">
						<CardHeader className="pb-2">
							<CardTitle className="text-lg font-semibold">Metric Performance Radar</CardTitle>
							<CardDescription>Comparative view across all metrics</CardDescription>
						</CardHeader>
						<CardContent>
							{radarChartData.length > 0 ? (
								<div className="h-[280px]">
									<ResponsiveContainer width="100%" height="100%">
										<RadarChart data={radarChartData}>
											<defs>
												<linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="0%" stopColor="hsl(160 72% 47%)" stopOpacity={0.8} />
													<stop offset="100%" stopColor="hsl(160 72% 47%)" stopOpacity={0.2} />
												</linearGradient>
											</defs>
											<PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
											<PolarAngleAxis
												dataKey="metric"
												tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
												tickLine={false}
											/>
											<PolarRadiusAxis
												angle={30}
												domain={[0, 100]}
												tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
												tickCount={5}
												axisLine={false}
											/>
											<Radar
												name="Avg Score"
												dataKey="score"
												stroke="hsl(160 72% 47%)"
												strokeWidth={2}
												fill="url(#radarGradient)"
												dot={{ fill: "hsl(160 72% 47%)", strokeWidth: 0, r: 4 }}
											/>
											<Tooltip content={<CustomTooltip />} />
										</RadarChart>
									</ResponsiveContainer>
								</div>
							) : (
								<div className="h-[280px] flex items-center justify-center">
									<p className="text-muted-foreground">No metric data available</p>
								</div>
							)}
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Score Distribution / Latency Chart */}
			<motion.div variants={itemVariants}>
				<Card className="overflow-hidden">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-lg font-semibold">
									{activeChart === "distribution" && "Score Distribution"}
									{activeChart === "performance" && "Metric Breakdown"}
									{activeChart === "latency" && "Latency Distribution"}
								</CardTitle>
								<CardDescription>
									{activeChart === "distribution" && "Distribution of test scores across buckets"}
									{activeChart === "performance" && "Pass rate and average score per metric"}
									{activeChart === "latency" && "Response time distribution across tests"}
								</CardDescription>
							</div>
							<div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
								<Button
									variant={activeChart === "distribution" ? "secondary" : "ghost"}
									size="sm"
									onClick={() => setActiveChart("distribution")}
									className="h-7 px-3 text-xs"
								>
									Scores
								</Button>
								<Button
									variant={activeChart === "performance" ? "secondary" : "ghost"}
									size="sm"
									onClick={() => setActiveChart("performance")}
									className="h-7 px-3 text-xs"
								>
									Metrics
								</Button>
								<Button
									variant={activeChart === "latency" ? "secondary" : "ghost"}
									size="sm"
									onClick={() => setActiveChart("latency")}
									className="h-7 px-3 text-xs"
								>
									Latency
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="h-[320px]">
							<ResponsiveContainer width="100%" height="100%">
								{activeChart === "distribution" ? (
									<BarChart data={scoreDistribution} barGap={2}>
										<defs>
											<linearGradient id="passedGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="hsl(160 72% 50%)" />
												<stop offset="100%" stopColor="hsl(160 72% 35%)" />
											</linearGradient>
											<linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="hsl(0 72% 55%)" />
												<stop offset="100%" stopColor="hsl(0 72% 40%)" />
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="hsl(var(--border))"
											vertical={false}
										/>
										<XAxis
											dataKey="range"
											tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
											tickLine={false}
											axisLine={false}
										/>
										<YAxis
											tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
											tickLine={false}
											axisLine={false}
											allowDecimals={false}
										/>
										<Tooltip content={<CustomTooltip />} />
										<Legend
											verticalAlign="top"
											height={36}
											formatter={(value) => (
												<span className="text-sm text-muted-foreground">{value}</span>
											)}
										/>
										<Bar
											dataKey="passed"
											name="Passed"
											fill="url(#passedGradient)"
											radius={[4, 4, 0, 0]}
											stackId="stack"
										/>
										<Bar
											dataKey="failed"
											name="Failed"
											fill="url(#failedGradient)"
											radius={[4, 4, 0, 0]}
											stackId="stack"
										/>
									</BarChart>
								) : activeChart === "performance" ? (
									<BarChart data={barChartData} layout="vertical" barGap={4}>
										<defs>
											{GRADIENT_COLORS.map((color) => (
												<linearGradient
													key={`${color.start}-${color.end}`}
													id={`barGradient${GRADIENT_COLORS.indexOf(color)}`}
													x1="0"
													y1="0"
													x2="1"
													y2="0"
												>
													<stop offset="0%" stopColor={color.start} />
													<stop offset="100%" stopColor={color.end} />
												</linearGradient>
											))}
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="hsl(var(--border))"
											horizontal={false}
										/>
										<XAxis
											type="number"
											domain={[0, 100]}
											tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
											tickLine={false}
											axisLine={false}
										/>
										<YAxis
											type="category"
											dataKey="name"
											width={100}
											tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
											tickLine={false}
											axisLine={false}
										/>
										<Tooltip content={<CustomTooltip />} />
										<ReferenceLine
											x={80}
											stroke="hsl(var(--muted-foreground))"
											strokeDasharray="5 5"
										/>
										<Legend
											verticalAlign="top"
											height={36}
											formatter={(value) => (
												<span className="text-sm text-muted-foreground">{value}</span>
											)}
										/>
										<Bar dataKey="passRate" name="Pass Rate" radius={[0, 4, 4, 0]}>
											{barChartData.map((item, index) => (
												<Cell
													key={item.name}
													fill={`url(#barGradient${index % GRADIENT_COLORS.length})`}
												/>
											))}
										</Bar>
										<Bar
											dataKey="avgScore"
											name="Avg Score"
											fill="hsl(var(--muted-foreground))"
											fillOpacity={0.3}
											radius={[0, 4, 4, 0]}
										/>
									</BarChart>
								) : (
									<AreaChart data={latencyDistribution}>
										<defs>
											<linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="hsl(220 80% 60%)" stopOpacity={0.6} />
												<stop offset="100%" stopColor="hsl(220 80% 60%)" stopOpacity={0.05} />
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="hsl(var(--border))"
											vertical={false}
										/>
										<XAxis
											dataKey="range"
											tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
											tickLine={false}
											axisLine={false}
										/>
										<YAxis
											tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
											tickLine={false}
											axisLine={false}
											allowDecimals={false}
										/>
										<Tooltip content={<CustomTooltip />} />
										<Area
											type="monotone"
											dataKey="count"
											name="Test Count"
											stroke="hsl(220 80% 60%)"
											strokeWidth={2}
											fill="url(#latencyGradient)"
											dot={{ fill: "hsl(220 80% 60%)", strokeWidth: 0, r: 4 }}
											activeDot={{ r: 6, strokeWidth: 0 }}
										/>
									</AreaChart>
								)}
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</motion.div>
	)
}

function PerformanceCard({
	title,
	value,
	subtitle,
	icon,
	trend,
}: {
	title: string
	value: string
	subtitle: string
	icon: React.ReactNode
	trend?: "good" | "warning" | "bad"
}) {
	return (
		<Card className="relative overflow-hidden group">
			<div
				className={cn(
					"absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
					trend === "good" && "bg-gradient-to-br from-emerald-500/5 to-transparent",
					trend === "warning" && "bg-gradient-to-br from-amber-500/5 to-transparent",
					trend === "bad" && "bg-gradient-to-br from-red-500/5 to-transparent"
				)}
			/>
			<CardContent className="pt-5 pb-4">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{title}
						</p>
						<p className="text-2xl font-bold tracking-tight font-mono">{value}</p>
						<p className="text-xs text-muted-foreground">{subtitle}</p>
					</div>
					<div
						className={cn(
							"p-2 rounded-lg",
							trend === "good" && "bg-emerald-500/10 text-emerald-500",
							trend === "warning" && "bg-amber-500/10 text-amber-500",
							trend === "bad" && "bg-red-500/10 text-red-500",
							!trend && "bg-muted text-muted-foreground"
						)}
					>
						{icon}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
