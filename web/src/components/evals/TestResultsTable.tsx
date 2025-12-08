import { useState, Fragment } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
	CheckCircle2,
	XCircle,
	ChevronDown,
	ChevronUp,
	Search,
	Filter,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Copy,
	Check,
	Sparkles,
	AlertTriangle,
	MessageSquare,
	FileText,
	Zap,
} from "lucide-react"

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

type SortField = "index" | "passed" | "overallScore" | "latencyMs"
type SortDirection = "asc" | "desc"
type StatusFilter = "all" | "passed" | "failed"

interface TestResultsTableProps {
	testResults: TestResult[]
}

function parseScores(result: TestResult): MetricScore[] {
	if (result.metricScores && result.metricScores.length > 0) {
		return result.metricScores
	}
	if (Array.isArray(result.scores)) {
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
	return []
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

function truncateForDisplay(value: unknown, maxLength = 120): string {
	const str = typeof value === "string" ? value : JSON.stringify(value)
	if (str.length <= maxLength) return str
	return `${str.slice(0, maxLength)}...`
}

export function TestResultsTable({ testResults }: TestResultsTableProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
	const [sortField, setSortField] = useState<SortField>("index")
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
	const [copiedId, setCopiedId] = useState<string | null>(null)

	const filteredResults = testResults
		.map((r, i) => ({ ...r, index: i + 1 }))
		.filter((result) => {
			if (statusFilter === "passed" && !result.passed) return false
			if (statusFilter === "failed" && result.passed) return false
			if (searchQuery) {
				const inputStr = JSON.stringify(result.input).toLowerCase()
				const outputStr = JSON.stringify(result.actualOutput).toLowerCase()
				const query = searchQuery.toLowerCase()
				if (!inputStr.includes(query) && !outputStr.includes(query)) return false
			}
			return true
		})
		.sort((a, b) => {
			let aVal: number | boolean
			let bVal: number | boolean

			switch (sortField) {
				case "index":
					aVal = a.index
					bVal = b.index
					break
				case "passed":
					aVal = a.passed
					bVal = b.passed
					break
				case "overallScore":
					aVal = a.overallScore ?? 0
					bVal = b.overallScore ?? 0
					break
				case "latencyMs":
					aVal = a.latencyMs ?? 0
					bVal = b.latencyMs ?? 0
					break
				default:
					return 0
			}

			if (typeof aVal === "boolean" && typeof bVal === "boolean") {
				return sortDirection === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
			}
			return sortDirection === "asc"
				? (aVal as number) - (bVal as number)
				: (bVal as number) - (aVal as number)
		})

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc")
		} else {
			setSortField(field)
			setSortDirection("desc")
		}
	}

	const toggleRow = (id: string) => {
		const newExpanded = new Set(expandedRows)
		if (newExpanded.has(id)) {
			newExpanded.delete(id)
		} else {
			newExpanded.add(id)
		}
		setExpandedRows(newExpanded)
	}

	const copyToClipboard = async (text: string, id: string) => {
		await navigator.clipboard.writeText(text)
		setCopiedId(id)
		setTimeout(() => setCopiedId(null), 2000)
	}

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
		return sortDirection === "asc" ? (
			<ArrowUp className="h-3.5 w-3.5" />
		) : (
			<ArrowDown className="h-3.5 w-3.5" />
		)
	}

	return (
		<Card className="overflow-hidden border-border/50">
			<CardHeader className="border-b border-border/50 bg-muted/30">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<CardTitle className="text-lg font-semibold tracking-tight">Test Results</CardTitle>
						<CardDescription className="text-sm">
							Showing {filteredResults.length} of {testResults.length} test cases
						</CardDescription>
					</div>
					<div className="flex items-center gap-3">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 w-[180px] h-9 text-sm bg-background"
							/>
						</div>
						<Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
							<SelectTrigger className="w-[110px] h-9 text-sm bg-background">
								<Filter className="h-3.5 w-3.5 mr-2 opacity-50" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="passed">Passed</SelectItem>
								<SelectItem value="failed">Failed</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>

			<CardContent className="p-0">
				<ScrollArea className="w-full">
					<div className="min-w-[800px]">
						{/* Table Header */}
						<div className="grid grid-cols-[60px_1fr_100px_100px_100px_48px] border-b border-border/50 bg-muted/20 sticky top-0 z-10">
							<button
								type="button"
								onClick={() => handleSort("index")}
								className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								#
								<SortIcon field="index" />
							</button>
							<div className="px-4 py-3 text-xs font-medium text-muted-foreground">Input</div>
							<button
								type="button"
								onClick={() => handleSort("passed")}
								className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								Status
								<SortIcon field="passed" />
							</button>
							<button
								type="button"
								onClick={() => handleSort("overallScore")}
								className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								Score
								<SortIcon field="overallScore" />
							</button>
							<button
								type="button"
								onClick={() => handleSort("latencyMs")}
								className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								Latency
								<SortIcon field="latencyMs" />
							</button>
							<div className="px-4 py-3" />
						</div>

						{/* Table Body */}
						<div className="divide-y divide-border/30">
							{filteredResults.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
									<Search className="h-8 w-8 mb-3 opacity-30" />
									<p className="text-sm">No results found</p>
								</div>
							) : (
								filteredResults.map((result) => {
									const isExpanded = expandedRows.has(result.id)
									const scores = parseScores(result)

									return (
										<Fragment key={result.id}>
											{/* Main Row */}
											<div
												onClick={() => toggleRow(result.id)}
												className={cn(
													"grid grid-cols-[60px_1fr_100px_100px_100px_48px] cursor-pointer transition-colors",
													"hover:bg-muted/40",
													!result.passed && "bg-destructive/[0.03]",
													isExpanded && "bg-muted/50"
												)}
											>
												<div className="px-4 py-3.5 text-sm font-mono text-muted-foreground">
													{result.index}
												</div>
												<div className="px-4 py-3.5 min-w-0">
													<p className="text-sm font-mono truncate text-foreground/90">
														{truncateForDisplay(result.input, 80)}
													</p>
												</div>
												<div className="px-4 py-3.5 flex items-center">
													{result.passed ? (
														<Badge
															variant="outline"
															className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium text-xs"
														>
															<CheckCircle2 className="h-3 w-3 mr-1" />
															Pass
														</Badge>
													) : (
														<Badge
															variant="outline"
															className="bg-destructive/10 text-destructive border-destructive/30 font-medium text-xs"
														>
															<XCircle className="h-3 w-3 mr-1" />
															Fail
														</Badge>
													)}
												</div>
												<div className="px-4 py-3.5 flex items-center">
													<ScoreDisplay score={result.overallScore} />
												</div>
												<div className="px-4 py-3.5 text-sm text-muted-foreground">
													{result.latencyMs ? `${result.latencyMs.toFixed(0)}ms` : "-"}
												</div>
												<div className="px-4 py-3.5 flex items-center justify-center">
													<motion.div
														animate={{ rotate: isExpanded ? 180 : 0 }}
														transition={{ duration: 0.2 }}
													>
														<ChevronDown className="h-4 w-4 text-muted-foreground" />
													</motion.div>
												</div>
											</div>

											{/* Expanded Content */}
											<AnimatePresence>
												{isExpanded && (
													<motion.div
														initial={{ height: 0, opacity: 0 }}
														animate={{ height: "auto", opacity: 1 }}
														exit={{ height: 0, opacity: 0 }}
														transition={{ duration: 0.25, ease: "easeInOut" }}
														className="overflow-hidden bg-muted/20 border-t border-border/30"
													>
														<div className="p-6 space-y-6">
															{/* Input/Output Grid */}
															<div className="grid gap-4 lg:grid-cols-2">
																{/* Input Section */}
																<DataBlock
																	title="Input"
																	icon={<MessageSquare className="h-4 w-4" />}
																	content={result.input}
																	onCopy={() =>
																		copyToClipboard(
																			JSON.stringify(result.input, null, 2),
																			`input-${result.id}`
																		)
																	}
																	copied={copiedId === `input-${result.id}`}
																/>

																{/* Output Section */}
																<DataBlock
																	title="Actual Output"
																	icon={<Sparkles className="h-4 w-4" />}
																	content={result.actualOutput}
																	onCopy={() =>
																		copyToClipboard(
																			JSON.stringify(result.actualOutput, null, 2),
																			`output-${result.id}`
																		)
																	}
																	copied={copiedId === `output-${result.id}`}
																/>
															</div>

															{/* Expected Output */}
															{result.expected != null && (
																<DataBlock
																	title="Expected Output"
																	icon={<FileText className="h-4 w-4" />}
																	content={result.expected}
																	onCopy={() =>
																		copyToClipboard(
																			JSON.stringify(result.expected, null, 2),
																			`expected-${result.id}`
																		)
																	}
																	copied={copiedId === `expected-${result.id}`}
																	variant="muted"
																/>
															)}

															{/* Context (for RAG) */}
															{result.context != null && (
																<DataBlock
																	title="Context"
																	icon={<FileText className="h-4 w-4" />}
																	content={result.context}
																	onCopy={() =>
																		copyToClipboard(
																			JSON.stringify(result.context, null, 2),
																			`context-${result.id}`
																		)
																	}
																	copied={copiedId === `context-${result.id}`}
																	variant="muted"
																/>
															)}

															{/* Metric Scores */}
															{scores.length > 0 && (
																<div>
																	<h4 className="flex items-center gap-2 text-sm font-medium mb-3">
																		<Zap className="h-4 w-4 text-amber-500" />
																		Metric Scores
																	</h4>
																	<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
																		{scores.map((metric) => (
																			<MetricCard key={metric.id} metric={metric} />
																		))}
																	</div>
																</div>
															)}

															{/* Error Display */}
															{result.error && (
																<div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
																	<div className="flex items-center gap-2 mb-2">
																		<AlertTriangle className="h-4 w-4 text-destructive" />
																		<h4 className="text-sm font-medium text-destructive">Error</h4>
																	</div>
																	<p className="text-sm text-destructive/80 font-mono">
																		{result.error}
																	</p>
																</div>
															)}
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</Fragment>
									)
								})
							)}
						</div>
					</div>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</CardContent>
		</Card>
	)
}

function DataBlock({
	title,
	icon,
	content,
	onCopy,
	copied,
	variant = "default",
}: {
	title: string
	icon: React.ReactNode
	content: unknown
	onCopy: () => void
	copied: boolean
	variant?: "default" | "muted"
}) {
	const formattedContent = typeof content === "string" ? content : JSON.stringify(content, null, 2)

	return (
		<div
			className={cn(
				"rounded-lg border overflow-hidden",
				variant === "muted" ? "bg-muted/30 border-border/50" : "bg-background border-border/50"
			)}
		>
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/30">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground">{icon}</span>
					<span className="text-sm font-medium">{title}</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 w-7 p-0"
					onClick={(e) => {
						e.stopPropagation()
						onCopy()
					}}
				>
					{copied ? (
						<Check className="h-3.5 w-3.5 text-emerald-500" />
					) : (
						<Copy className="h-3.5 w-3.5 text-muted-foreground" />
					)}
				</Button>
			</div>
			<ScrollArea className="max-h-[200px]">
				<pre className="p-4 text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words">
					{formattedContent}
				</pre>
			</ScrollArea>
		</div>
	)
}

function MetricCard({ metric }: { metric: MetricScore }) {
	const [isReasonExpanded, setIsReasonExpanded] = useState(false)
	const percentage = metric.score * 100

	return (
		<div
			className={cn(
				"rounded-lg border p-4 transition-all",
				metric.passed
					? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
					: "bg-destructive/5 border-destructive/20 hover:border-destructive/40"
			)}
		>
			<div className="flex items-start justify-between mb-2">
				<div className="flex items-center gap-2">
					{metric.passed ? (
						<CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
					) : (
						<XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
					)}
					<span className="text-sm font-medium truncate">
						{formatMetricName(metric.metricName)}
					</span>
				</div>
				<ScoreDisplay score={metric.score} small />
			</div>

			{/* Score Bar */}
			<div className="h-1.5 rounded-full bg-muted/50 overflow-hidden mb-3">
				<motion.div
					initial={{ width: 0 }}
					animate={{ width: `${percentage}%` }}
					transition={{ duration: 0.5, ease: "easeOut" }}
					className={cn(
						"h-full rounded-full",
						percentage >= 80
							? "bg-emerald-500"
							: percentage >= 50
								? "bg-amber-500"
								: "bg-destructive"
					)}
				/>
			</div>

			{/* Reason */}
			{metric.reason && (
				<div>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							setIsReasonExpanded(!isReasonExpanded)
						}}
						className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
					>
						{isReasonExpanded ? (
							<ChevronUp className="h-3 w-3" />
						) : (
							<ChevronDown className="h-3 w-3" />
						)}
						{isReasonExpanded ? "Hide reasoning" : "Show reasoning"}
					</button>
					<AnimatePresence>
						{isReasonExpanded && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.2 }}
								className="overflow-hidden"
							>
								<p className="text-xs text-muted-foreground mt-2 leading-relaxed">
									{metric.reason}
								</p>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			)}
		</div>
	)
}

function ScoreDisplay({ score, small }: { score: number | null; small?: boolean }) {
	if (score === null) return <span className="text-muted-foreground text-sm">-</span>

	const percentage = score * 100
	const colorClass =
		percentage >= 80 ? "text-emerald-600" : percentage >= 50 ? "text-amber-600" : "text-destructive"

	return (
		<span
			className={cn(
				"font-mono font-semibold tabular-nums",
				colorClass,
				small ? "text-sm" : "text-sm"
			)}
		>
			{percentage.toFixed(0)}%
		</span>
	)
}

export type { TestResult, MetricScore, RawScoreData }
