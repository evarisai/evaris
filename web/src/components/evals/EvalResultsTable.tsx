import { motion, AnimatePresence } from "framer-motion"
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Brain,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Copy,
	Filter,
	MessageSquare,
	Settings2,
	Sparkles,
	XCircle,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface MetricScoreData {
	name: string
	score: number
	passed: boolean
	threshold: number
	reason?: string
}

export interface TestResultData {
	id: string
	input: string | Record<string, unknown>
	expected?: string | Record<string, unknown>
	actualOutput: string | Record<string, unknown>
	context?: string | Record<string, unknown>
	passed: boolean
	overallScore: number
	latencyMs: number
	cost?: number
	metrics: MetricScoreData[]
}

export interface EvalConfig {
	model: string
	temperature: number
	maxTokens?: number
	prompt?: string
	systemPrompt?: string
	topP?: number
	frequencyPenalty?: number
	presencePenalty?: number
}

interface EvalResultsTableProps {
	evalId: string
	evalName: string
	results: TestResultData[]
	config?: EvalConfig
	experimentName?: string
	onCompare?: () => void
}

type SortField = "overallScore" | "latencyMs" | "passed"
type SortDirection = "asc" | "desc"

function truncateText(text: string, maxLength: number = 100): string {
	if (text.length <= maxLength) return text
	return `${text.slice(0, maxLength)}...`
}

function formatValue(value: string | Record<string, unknown>): string {
	if (typeof value === "string") return value
	return JSON.stringify(value, null, 2)
}

function ConfigSidebar({ config }: { config?: EvalConfig }) {
	if (!config) return null

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5">
					<Settings2 className="w-4 h-4" />
					Parameters
				</Button>
			</SheetTrigger>
			<SheetContent className="w-[400px] sm:w-[540px]">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Sparkles className="w-5 h-5 text-primary" />
						Best Parameters
					</SheetTitle>
					<SheetDescription>Configuration snapshot for this evaluation run</SheetDescription>
				</SheetHeader>

				<div className="mt-6 space-y-6">
					{/* Model info */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Model</h4>
						<div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
							<div className="flex items-center justify-between mb-3">
								<span className="text-sm text-zinc-500">Model Name</span>
								<code className="text-sm font-mono text-foreground bg-zinc-800 px-2 py-0.5 rounded">
									{config.model}
								</code>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="p-2 rounded bg-zinc-800/50">
									<span className="text-xs text-zinc-500 block">Temperature</span>
									<span className="text-lg font-mono font-semibold text-amber-400">
										{config.temperature}
									</span>
								</div>
								{config.maxTokens && (
									<div className="p-2 rounded bg-zinc-800/50">
										<span className="text-xs text-zinc-500 block">Max Tokens</span>
										<span className="text-lg font-mono font-semibold text-blue-400">
											{config.maxTokens}
										</span>
									</div>
								)}
								{config.topP !== undefined && (
									<div className="p-2 rounded bg-zinc-800/50">
										<span className="text-xs text-zinc-500 block">Top P</span>
										<span className="text-lg font-mono font-semibold text-purple-400">
											{config.topP}
										</span>
									</div>
								)}
								{config.frequencyPenalty !== undefined && (
									<div className="p-2 rounded bg-zinc-800/50">
										<span className="text-xs text-zinc-500 block">Freq Penalty</span>
										<span className="text-lg font-mono font-semibold text-green-400">
											{config.frequencyPenalty}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Prompts */}
					{config.systemPrompt && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
									System Prompt
								</h4>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2"
									onClick={() => navigator.clipboard.writeText(config.systemPrompt || "")}
								>
									<Copy className="w-3 h-3 mr-1" />
									Copy
								</Button>
							</div>
							<Textarea
								value={config.systemPrompt}
								readOnly
								className="min-h-[120px] font-mono text-xs bg-zinc-900/50 border-zinc-800"
							/>
						</div>
					)}

					{config.prompt && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
									Prompt Template
								</h4>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2"
									onClick={() => navigator.clipboard.writeText(config.prompt || "")}
								>
									<Copy className="w-3 h-3 mr-1" />
									Copy
								</Button>
							</div>
							<Textarea
								value={config.prompt}
								readOnly
								className="min-h-[120px] font-mono text-xs bg-zinc-900/50 border-zinc-800"
							/>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}

function MetricScoreCell({ metric }: { metric: MetricScoreData }) {
	const [expanded, setExpanded] = useState(false)
	const scorePercent = Math.round(metric.score * 100)

	return (
		<Collapsible open={expanded} onOpenChange={setExpanded}>
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono",
						"border transition-all duration-200 cursor-pointer",
						"hover:scale-105",
						metric.passed
							? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
							: "bg-rose-500/10 border-rose-500/30 text-rose-400"
					)}
				>
					{metric.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
					<span className="font-semibold">{scorePercent}%</span>
					{metric.reason && (
						<ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
					)}
				</button>
			</CollapsibleTrigger>
			{metric.reason && (
				<CollapsibleContent>
					<motion.div
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						className="mt-2 p-2 rounded bg-zinc-900/80 border border-zinc-800 text-xs"
					>
						<div className="flex items-start gap-1.5">
							<Brain className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
							<p className="text-zinc-400 leading-relaxed">{metric.reason}</p>
						</div>
					</motion.div>
				</CollapsibleContent>
			)}
		</Collapsible>
	)
}

function TestResultRow({
	result,
	isExpanded,
	onToggle,
}: {
	result: TestResultData
	isExpanded: boolean
	onToggle: () => void
}) {
	const inputText = formatValue(result.input)
	const outputText = formatValue(result.actualOutput)

	return (
		<>
			<TableRow
				className={cn(
					"cursor-pointer transition-colors",
					"hover:bg-zinc-800/50",
					isExpanded && "bg-zinc-800/30"
				)}
				onClick={onToggle}
			>
				<TableCell className="w-10">
					{result.passed ? (
						<CheckCircle2 className="w-5 h-5 text-emerald-400" />
					) : (
						<XCircle className="w-5 h-5 text-rose-400" />
					)}
				</TableCell>

				<TableCell className="max-w-[200px]">
					<div className="flex items-start gap-2">
						<MessageSquare className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
						<span className="text-sm text-zinc-300 line-clamp-2">
							{truncateText(inputText, 80)}
						</span>
					</div>
				</TableCell>

				<TableCell className="max-w-[200px]">
					<span className="text-sm text-zinc-400 line-clamp-2">{truncateText(outputText, 80)}</span>
				</TableCell>

				<TableCell>
					<div
						className={cn(
							"inline-flex items-center px-2 py-1 rounded font-mono text-sm font-semibold",
							result.overallScore >= 0.8
								? "bg-emerald-500/10 text-emerald-400"
								: result.overallScore >= 0.5
									? "bg-amber-500/10 text-amber-400"
									: "bg-rose-500/10 text-rose-400"
						)}
					>
						{Math.round(result.overallScore * 100)}%
					</div>
				</TableCell>

				<TableCell className="font-mono text-sm text-zinc-400">
					{result.latencyMs.toFixed(0)}ms
				</TableCell>

				<TableCell className="w-10">
					<ChevronRight
						className={cn("w-4 h-4 text-zinc-500 transition-transform", isExpanded && "rotate-90")}
					/>
				</TableCell>
			</TableRow>

			<AnimatePresence>
				{isExpanded && (
					<TableRow>
						<TableCell colSpan={6} className="p-0 border-0">
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.2 }}
								className="overflow-hidden"
							>
								<div className="p-4 bg-zinc-900/50 border-y border-zinc-800 space-y-4">
									{/* Full input/output/expected */}
									<div className="grid grid-cols-2 gap-4">
										<div>
											<h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
												Input
											</h5>
											<pre className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-40 overflow-auto">
												{inputText}
											</pre>
										</div>
										<div>
											<h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
												Actual Output
											</h5>
											<pre className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-40 overflow-auto">
												{outputText}
											</pre>
										</div>
									</div>

									{result.expected && (
										<div>
											<h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
												Expected Output
											</h5>
											<pre className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-40 overflow-auto">
												{formatValue(result.expected)}
											</pre>
										</div>
									)}

									{result.context && (
										<div>
											<h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
												Context (RAG)
											</h5>
											<pre className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-40 overflow-auto">
												{formatValue(result.context)}
											</pre>
										</div>
									)}

									{/* Metric details with LLM reasoning */}
									<div>
										<h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
											Metric Scores & LLM Judge Reasoning
										</h5>
										<div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
											{result.metrics.map((metric) => (
												<div
													key={metric.name}
													className={cn(
														"p-3 rounded-lg border",
														metric.passed
															? "bg-emerald-500/5 border-emerald-500/20"
															: "bg-rose-500/5 border-rose-500/20"
													)}
												>
													<div className="flex items-center justify-between mb-2">
														<span className="text-sm font-medium text-zinc-300">{metric.name}</span>
														<MetricScoreCell metric={metric} />
													</div>
													<div className="flex items-center gap-2 text-xs text-zinc-500">
														<span>Threshold: {Math.round(metric.threshold * 100)}%</span>
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							</motion.div>
						</TableCell>
					</TableRow>
				)}
			</AnimatePresence>
		</>
	)
}

export function EvalResultsTable({
	evalId,
	evalName,
	results,
	config,
	experimentName,
	onCompare,
}: EvalResultsTableProps) {
	const [expandedId, setExpandedId] = useState<string | null>(null)
	const [search, setSearch] = useState("")
	const [filterPassed, setFilterPassed] = useState<string>("all")
	const [sortField, setSortField] = useState<SortField>("overallScore")
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc")
		} else {
			setSortField(field)
			setSortDirection("desc")
		}
	}

	const filteredResults = results
		.filter((r) => {
			const inputText = formatValue(r.input).toLowerCase()
			const outputText = formatValue(r.actualOutput).toLowerCase()
			const matchesSearch =
				inputText.includes(search.toLowerCase()) || outputText.includes(search.toLowerCase())
			const matchesFilter =
				filterPassed === "all" ||
				(filterPassed === "passed" && r.passed) ||
				(filterPassed === "failed" && !r.passed)
			return matchesSearch && matchesFilter
		})
		.sort((a, b) => {
			const aVal = a[sortField]
			const bVal = b[sortField]
			if (typeof aVal === "number" && typeof bVal === "number") {
				return sortDirection === "asc" ? aVal - bVal : bVal - aVal
			}
			if (typeof aVal === "boolean" && typeof bVal === "boolean") {
				return sortDirection === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
			}
			return 0
		})

	const passedCount = results.filter((r) => r.passed).length
	const failedCount = results.length - passedCount
	const avgScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold text-foreground">{evalName}</h2>
					<div className="flex items-center gap-3 mt-1">
						<code className="text-xs font-mono text-zinc-500">{evalId}</code>
						{experimentName && (
							<Badge variant="outline" className="text-xs">
								{experimentName}
							</Badge>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<ConfigSidebar config={config} />
					{onCompare && (
						<Button variant="outline" size="sm" onClick={onCompare}>
							Compare
						</Button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-4 gap-3">
				<div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
					<span className="text-xs text-zinc-500 uppercase tracking-wider">Total</span>
					<div className="text-2xl font-mono font-bold text-foreground">{results.length}</div>
				</div>
				<div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
					<span className="text-xs text-emerald-400 uppercase tracking-wider">Passed</span>
					<div className="text-2xl font-mono font-bold text-emerald-400">{passedCount}</div>
				</div>
				<div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
					<span className="text-xs text-rose-400 uppercase tracking-wider">Failed</span>
					<div className="text-2xl font-mono font-bold text-rose-400">{failedCount}</div>
				</div>
				<div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
					<span className="text-xs text-primary uppercase tracking-wider">Avg Score</span>
					<div className="text-2xl font-mono font-bold text-primary">
						{Math.round(avgScore * 100)}%
					</div>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<div className="relative flex-1 max-w-xs">
					<Input
						placeholder="Search inputs/outputs..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9 bg-zinc-900/50 border-zinc-800"
					/>
					<Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
				</div>

				<Select value={filterPassed} onValueChange={setFilterPassed}>
					<SelectTrigger className="w-[140px] bg-zinc-900/50 border-zinc-800">
						<SelectValue placeholder="Filter" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Results</SelectItem>
						<SelectItem value="passed">Passed Only</SelectItem>
						<SelectItem value="failed">Failed Only</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="rounded-lg border border-zinc-800 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-zinc-900/50 hover:bg-zinc-900/50">
							<TableHead className="w-10">Status</TableHead>
							<TableHead>Input</TableHead>
							<TableHead>Output</TableHead>
							<TableHead
								className="cursor-pointer select-none"
								onClick={() => handleSort("overallScore")}
							>
								<div className="flex items-center gap-1">
									Score
									{sortField === "overallScore" ? (
										sortDirection === "asc" ? (
											<ArrowUp className="w-3 h-3" />
										) : (
											<ArrowDown className="w-3 h-3" />
										)
									) : (
										<ArrowUpDown className="w-3 h-3 text-zinc-500" />
									)}
								</div>
							</TableHead>
							<TableHead
								className="cursor-pointer select-none"
								onClick={() => handleSort("latencyMs")}
							>
								<div className="flex items-center gap-1">
									Latency
									{sortField === "latencyMs" ? (
										sortDirection === "asc" ? (
											<ArrowUp className="w-3 h-3" />
										) : (
											<ArrowDown className="w-3 h-3" />
										)
									) : (
										<ArrowUpDown className="w-3 h-3 text-zinc-500" />
									)}
								</div>
							</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredResults.map((result) => (
							<TestResultRow
								key={result.id}
								result={result}
								isExpanded={expandedId === result.id}
								onToggle={() => setExpandedId(expandedId === result.id ? null : result.id)}
							/>
						))}
						{filteredResults.length === 0 && (
							<TableRow>
								<TableCell colSpan={6} className="h-32 text-center text-zinc-500">
									No results found
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
