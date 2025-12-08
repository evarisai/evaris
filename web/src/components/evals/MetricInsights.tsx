import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
	Sparkles,
	AlertTriangle,
	TrendingUp,
	Zap,
	ChevronDown,
	Brain,
	Wrench,
	GitCompare,
	Search,
	XCircle,
	Copy,
	Check,
	CheckCircle2,
	Lightbulb,
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
	reasoning_steps?: unknown[] | null
	reasoning_type?: string | null
	metadata?: Record<string, unknown>
}

interface TestResult {
	id: string
	input: unknown
	expected: unknown
	actualOutput: unknown
	context?: unknown
	passed: boolean
	overallScore: number | null
	latencyMs?: number | null
	tokenCount?: number | null
	cost?: number | null
	error?: string | null
	errorType?: string | null
	metadata?: Record<string, unknown>
	scores: RawScoreData[] | unknown
	metricScores: MetricScore[]
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
		}))
	}
	return []
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

interface MetricInsightsProps {
	testResults: TestResult[]
	metricStats: MetricStat[]
	evalData: {
		total: number | null
		passed: number | null
		failed: number | null
		accuracy: number | null
		baselineEval?: BaselineEval | null
	}
}

interface Insight {
	id: string
	type: "critical" | "warning" | "improvement" | "pattern" | "comparison" | "action"
	category: "pattern" | "comparison" | "action"
	title: string
	description: string
	metric?: string
	severity: number
	details?: string
	suggestion?: string
	codeExample?: string
	affectedTests?: number
	improvement?: number
}

const categoryIcons = {
	pattern: Brain,
	comparison: GitCompare,
	action: Wrench,
}

const categoryColors = {
	pattern: {
		bg: "bg-violet-500/10",
		border: "border-violet-500/20",
		text: "text-violet-500",
		glow: "shadow-violet-500/20",
	},
	comparison: {
		bg: "bg-blue-500/10",
		border: "border-blue-500/20",
		text: "text-blue-500",
		glow: "shadow-blue-500/20",
	},
	action: {
		bg: "bg-emerald-500/10",
		border: "border-emerald-500/20",
		text: "text-emerald-500",
		glow: "shadow-emerald-500/20",
	},
}

const severityColors = {
	critical: {
		bg: "bg-red-500/10",
		border: "border-red-500/30",
		text: "text-red-500",
		badge: "bg-red-500/20 text-red-400 border-red-500/30",
	},
	warning: {
		bg: "bg-amber-500/10",
		border: "border-amber-500/30",
		text: "text-amber-500",
		badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
	},
	improvement: {
		bg: "bg-emerald-500/10",
		border: "border-emerald-500/30",
		text: "text-emerald-500",
		badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
	},
}

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.08, delayChildren: 0.1 },
	},
}

const itemVariants = {
	hidden: { opacity: 0, x: -20 },
	visible: {
		opacity: 1,
		x: 0,
		transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
	},
}

export function MetricInsights({ testResults, metricStats, evalData }: MetricInsightsProps) {
	const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set())
	const [activeCategory, setActiveCategory] = useState<"all" | "pattern" | "comparison" | "action">(
		"all"
	)
	const [copiedId, setCopiedId] = useState<string | null>(null)

	const insights = useMemo(() => {
		const result: Insight[] = []
		let insightId = 0

		const failedResults = testResults.filter((r) => !r.passed)

		for (const metric of metricStats) {
			if (metric.passRate < 50) {
				result.push({
					id: `insight-${insightId++}`,
					type: "critical",
					category: "pattern",
					title: `Critical: ${metric.name} Failing`,
					description: `Only ${metric.passRate.toFixed(1)}% of tests pass for ${metric.name}. This metric is severely underperforming and requires immediate attention.`,
					metric: metric.rawName,
					severity: 100 - metric.passRate,
					affectedTests: metric.total - metric.passed,
					details: analyzeMetricFailures(testResults, metric.rawName),
					suggestion: generateMetricSuggestion(metric.rawName, "critical"),
				})
			} else if (metric.passRate < 80) {
				result.push({
					id: `insight-${insightId++}`,
					type: "warning",
					category: "pattern",
					title: `${metric.name} Needs Improvement`,
					description: `${metric.passRate.toFixed(1)}% pass rate for ${metric.name}. There's room for improvement in this area.`,
					metric: metric.rawName,
					severity: 80 - metric.passRate,
					affectedTests: metric.total - metric.passed,
					details: analyzeMetricFailures(testResults, metric.rawName),
					suggestion: generateMetricSuggestion(metric.rawName, "warning"),
				})
			}

			if (metric.avgScore < 0.5) {
				result.push({
					id: `insight-${insightId++}`,
					type: "critical",
					category: "pattern",
					title: `Low Average Score: ${metric.name}`,
					description: `Average score of ${(metric.avgScore * 100).toFixed(1)}% indicates fundamental quality issues that need addressing.`,
					metric: metric.rawName,
					severity: (0.5 - metric.avgScore) * 100,
				})
			}
		}

		if (evalData.baselineEval) {
			const baseline = evalData.baselineEval
			const currentAccuracy = evalData.accuracy ?? 0
			const baselineAccuracy = baseline.accuracy ?? 0
			const diff = currentAccuracy - baselineAccuracy

			if (diff > 0.05) {
				result.push({
					id: `insight-${insightId++}`,
					type: "improvement",
					category: "comparison",
					title: "Accuracy Improved vs Baseline",
					description: `This evaluation shows a ${(diff * 100).toFixed(1)}% improvement in accuracy compared to the baseline (${(baselineAccuracy * 100).toFixed(1)}% -> ${(currentAccuracy * 100).toFixed(1)}%).`,
					severity: 0,
					improvement: diff * 100,
				})
			} else if (diff < -0.05) {
				result.push({
					id: `insight-${insightId++}`,
					type: "critical",
					category: "comparison",
					title: "Accuracy Regression Detected",
					description: `This evaluation shows a ${(Math.abs(diff) * 100).toFixed(1)}% decrease in accuracy compared to the baseline (${(baselineAccuracy * 100).toFixed(1)}% -> ${(currentAccuracy * 100).toFixed(1)}%). Investigate recent changes.`,
					severity: Math.abs(diff) * 100,
				})
			}
		}

		if (failedResults.length > 0) {
			const errorPatterns: Record<string, { count: number; examples: string[] }> = {}

			for (const result of failedResults) {
				for (const metric of parseScores(result)) {
					if (!metric.passed && metric.reason) {
						const pattern = extractErrorPattern(metric.reason)
						if (!errorPatterns[pattern]) {
							errorPatterns[pattern] = { count: 0, examples: [] }
						}
						errorPatterns[pattern].count++
						if (errorPatterns[pattern].examples.length < 3) {
							errorPatterns[pattern].examples.push(metric.reason)
						}
					}
				}
			}

			const sortedPatterns = Object.entries(errorPatterns)
				.filter(([, data]) => data.count >= 2)
				.sort(([, a], [, b]) => b.count - a.count)
				.slice(0, 5)

			for (const [pattern, data] of sortedPatterns) {
				result.push({
					id: `insight-${insightId++}`,
					type: "warning",
					category: "pattern",
					title: `Recurring Issue: ${pattern}`,
					description: `This pattern appears in ${data.count} failing test cases. Addressing this could significantly improve results.`,
					severity: (data.count / failedResults.length) * 100,
					affectedTests: data.count,
					details: data.examples.join("\n\n"),
				})
			}
		}

		result.push({
			id: `insight-${insightId++}`,
			type: "improvement",
			category: "action",
			title: "Prompt Engineering Recommendations",
			description: "Based on the failure patterns, consider these prompt improvements:",
			severity: 0,
			suggestion: generatePromptSuggestions(metricStats, failedResults),
			codeExample: generatePromptExample(metricStats),
		})

		if (failedResults.length > testResults.length * 0.1) {
			result.push({
				id: `insight-${insightId++}`,
				type: "improvement",
				category: "action",
				title: "Consider Threshold Adjustment",
				description: `With ${((failedResults.length / testResults.length) * 100).toFixed(1)}% failure rate, you may want to review your metric thresholds to ensure they're appropriately calibrated for your use case.`,
				severity: 0,
				suggestion:
					"Review the distribution of scores for each metric and consider if thresholds are too strict or if the model genuinely needs improvement in these areas.",
			})
		}

		return result.sort((a, b) => b.severity - a.severity)
	}, [testResults, metricStats, evalData])

	const filteredInsights = useMemo(() => {
		if (activeCategory === "all") return insights
		return insights.filter((i) => i.category === activeCategory)
	}, [insights, activeCategory])

	const categoryCounts = useMemo(
		() => ({
			all: insights.length,
			pattern: insights.filter((i) => i.category === "pattern").length,
			comparison: insights.filter((i) => i.category === "comparison").length,
			action: insights.filter((i) => i.category === "action").length,
		}),
		[insights]
	)

	const toggleInsight = (id: string) => {
		const newExpanded = new Set(expandedInsights)
		if (newExpanded.has(id)) {
			newExpanded.delete(id)
		} else {
			newExpanded.add(id)
		}
		setExpandedInsights(newExpanded)
	}

	const copyCode = (code: string, id: string) => {
		navigator.clipboard.writeText(code)
		setCopiedId(id)
		setTimeout(() => setCopiedId(null), 2000)
	}

	if (insights.length === 0) {
		return (
			<Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
				<CardContent className="pt-6">
					<div className="flex items-center gap-3 text-emerald-500">
						<CheckCircle2 className="h-6 w-6" />
						<div>
							<p className="font-semibold">Excellent Performance</p>
							<p className="text-sm text-muted-foreground">
								All metrics are performing well. No immediate improvements needed.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="overflow-hidden border-0 bg-gradient-to-br from-card via-card to-muted/20">
			<CardHeader className="border-b border-border/50 pb-4">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="relative">
							<div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-emerald-500 rounded-lg blur-lg opacity-30" />
							<div className="relative p-2.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-emerald-500/20 border border-violet-500/20">
								<Sparkles className="h-5 w-5 text-violet-400" />
							</div>
						</div>
						<div>
							<CardTitle className="text-xl font-semibold tracking-tight">Insight Engine</CardTitle>
							<CardDescription className="text-sm">
								AI-powered analysis of {testResults.length} test results
							</CardDescription>
						</div>
					</div>
					<Badge variant="outline" className="font-mono text-xs">
						{insights.length} insights
					</Badge>
				</div>

				<div className="flex gap-1 mt-4 p-1 bg-muted/30 rounded-lg w-fit">
					{(["all", "pattern", "comparison", "action"] as const).map((cat) => {
						const Icon = cat === "all" ? Search : categoryIcons[cat]
						const count = categoryCounts[cat]
						return (
							<Button
								key={cat}
								variant={activeCategory === cat ? "secondary" : "ghost"}
								size="sm"
								onClick={() => setActiveCategory(cat)}
								className={cn(
									"h-8 px-3 text-xs gap-1.5",
									activeCategory === cat && cat !== "all" && categoryColors[cat]?.text
								)}
							>
								<Icon className="h-3.5 w-3.5" />
								<span className="capitalize">{cat}</span>
								<span className="text-muted-foreground">({count})</span>
							</Button>
						)
					})}
				</div>
			</CardHeader>

			<CardContent className="p-0">
				<ScrollArea className="h-[500px]">
					<motion.div
						variants={containerVariants}
						initial="hidden"
						animate="visible"
						className="p-4 space-y-3"
					>
						<AnimatePresence mode="popLayout">
							{filteredInsights.map((insight) => (
								<InsightCard
									key={insight.id}
									insight={insight}
									isExpanded={expandedInsights.has(insight.id)}
									onToggle={() => toggleInsight(insight.id)}
									onCopyCode={copyCode}
									copiedId={copiedId}
								/>
							))}
						</AnimatePresence>
					</motion.div>
				</ScrollArea>
			</CardContent>
		</Card>
	)
}

function InsightCard({
	insight,
	isExpanded,
	onToggle,
	onCopyCode,
	copiedId,
}: {
	insight: Insight
	isExpanded: boolean
	onToggle: () => void
	onCopyCode: (code: string, id: string) => void
	copiedId: string | null
}) {
	const categoryStyle = categoryColors[insight.category]
	const severityStyle =
		severityColors[insight.type as keyof typeof severityColors] || severityColors.warning

	const Icon =
		insight.type === "critical"
			? XCircle
			: insight.type === "improvement"
				? TrendingUp
				: AlertTriangle

	return (
		<motion.div
			variants={itemVariants}
			layout
			className={cn(
				"group rounded-xl border transition-all duration-300",
				severityStyle.border,
				severityStyle.bg,
				isExpanded && "shadow-lg",
				isExpanded && categoryStyle.glow
			)}
		>
			<Collapsible open={isExpanded} onOpenChange={onToggle}>
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className="w-full p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
					>
						<div className="flex items-start gap-3">
							<div className={cn("p-2 rounded-lg shrink-0", categoryStyle.bg)}>
								<Icon className={cn("h-4 w-4", severityStyle.text)} />
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 flex-wrap mb-1">
									<h4 className="font-semibold text-sm">{insight.title}</h4>
									{insight.metric && (
										<Badge variant="outline" className="text-[10px] px-1.5 py-0">
											{insight.metric}
										</Badge>
									)}
								</div>
								<p className="text-sm text-muted-foreground line-clamp-2">{insight.description}</p>

								<div className="flex items-center gap-3 mt-2">
									{insight.affectedTests !== undefined && (
										<span className="text-xs text-muted-foreground">
											{insight.affectedTests} tests affected
										</span>
									)}
									{insight.improvement !== undefined && (
										<span className="text-xs text-emerald-500 flex items-center gap-1">
											<TrendingUp className="h-3 w-3" />+{insight.improvement.toFixed(1)}%
										</span>
									)}
									{insight.severity > 0 && (
										<div className="flex items-center gap-1.5">
											<Progress value={Math.min(insight.severity, 100)} className="h-1 w-16" />
											<span className="text-[10px] text-muted-foreground">
												{insight.severity.toFixed(0)}% severity
											</span>
										</div>
									)}
								</div>
							</div>

							<div
								className={cn(
									"p-1 rounded transition-transform duration-200",
									isExpanded && "rotate-180"
								)}
							>
								<ChevronDown className="h-4 w-4 text-muted-foreground" />
							</div>
						</div>
					</button>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<div className="px-4 pb-4 pt-0 space-y-4">
						<div className="h-px bg-border/50" />

						{insight.details && (
							<div className="space-y-2">
								<h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
									<Search className="h-3 w-3" />
									Analysis Details
								</h5>
								<div className="p-3 rounded-lg bg-background/50 border border-border/50">
									<p className="text-sm text-muted-foreground whitespace-pre-wrap">
										{insight.details}
									</p>
								</div>
							</div>
						)}

						{insight.suggestion && (
							<div className="space-y-2">
								<h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
									<Lightbulb className="h-3 w-3" />
									Recommendation
								</h5>
								<div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
									<p className="text-sm text-foreground whitespace-pre-wrap">
										{insight.suggestion}
									</p>
								</div>
							</div>
						)}

						{insight.codeExample && (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
										<Zap className="h-3 w-3" />
										Example Implementation
									</h5>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 px-2 text-xs"
										onClick={() => onCopyCode(insight.codeExample!, insight.id)}
									>
										{copiedId === insight.id ? (
											<>
												<Check className="h-3 w-3 mr-1" />
												Copied
											</>
										) : (
											<>
												<Copy className="h-3 w-3 mr-1" />
												Copy
											</>
										)}
									</Button>
								</div>
								<div className="relative">
									<pre className="p-4 rounded-lg bg-[#0d1117] border border-border/50 overflow-x-auto">
										<code className="text-xs font-mono text-emerald-400 whitespace-pre">
											{insight.codeExample}
										</code>
									</pre>
								</div>
							</div>
						)}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</motion.div>
	)
}

function extractErrorPattern(reason: string): string {
	const patterns = [
		{ regex: /hallucination|made up|fabricated|incorrect fact/i, label: "Hallucination" },
		{ regex: /not relevant|irrelevant|off-topic|doesn't address/i, label: "Relevance Issues" },
		{ regex: /incomplete|missing|didn't mention|lacks/i, label: "Incomplete Response" },
		{ regex: /too long|verbose|wordy|rambling/i, label: "Verbosity Issues" },
		{ regex: /too short|brief|insufficient/i, label: "Insufficient Detail" },
		{ regex: /format|structure|organization/i, label: "Formatting Issues" },
		{ regex: /toxic|harmful|inappropriate|offensive/i, label: "Safety Concerns" },
		{ regex: /contradicts|inconsistent|conflicting/i, label: "Self-Contradiction" },
		{ regex: /context|didn't use|ignored/i, label: "Context Utilization" },
	]

	for (const { regex, label } of patterns) {
		if (regex.test(reason)) return label
	}

	return reason.slice(0, 40).trim() + (reason.length > 40 ? "..." : "")
}

function analyzeMetricFailures(testResults: TestResult[], metricName: string): string {
	const failures = testResults
		.flatMap((r) => parseScores(r))
		.filter((m) => m.metricName === metricName && !m.passed)
		.slice(0, 5)

	if (failures.length === 0) return "No specific failure patterns identified."

	const reasons = failures
		.filter((f) => f.reason)
		.map((f) => `- ${f.reason}`)
		.join("\n")

	return reasons || "Failures occurred but no detailed reasoning was captured."
}

function generateMetricSuggestion(metricName: string, severity: "critical" | "warning"): string {
	const suggestions: Record<string, string> = {
		hallucination:
			severity === "critical"
				? "Add explicit grounding instructions: 'Only use information from the provided context. If unsure, say so.' Consider adding fact-checking verification steps."
				: "Reinforce source attribution in prompts. Add phrases like 'Based on the given information...' to encourage grounded responses.",
		answer_relevancy:
			severity === "critical"
				? "Restructure prompts to explicitly restate the question before answering. Add: 'Make sure your response directly addresses: [question]'"
				: "Add relevance checks in your prompt chain. Consider breaking complex questions into sub-questions.",
		faithfulness:
			"Strengthen context utilization instructions. Add: 'Your answer must be supported by the following context. Quote relevant passages.'",
		coherence:
			"Request structured responses with clear sections. Add: 'Organize your response with: 1) Summary, 2) Details, 3) Conclusion'",
		toxicity:
			"Add safety guardrails to system prompt. Consider using content filtering before evaluation.",
		helpfulness:
			"Clarify the user's underlying goal in your prompts. Add: 'The user wants to achieve [goal]. Provide actionable steps.'",
		correctness:
			"Add verification steps. Consider using chain-of-thought prompting: 'Think step by step and verify each claim.'",
		completeness:
			"Request comprehensive coverage. Add: 'Make sure to address all aspects: [list key points]'",
	}

	const normalizedName = metricName.toLowerCase().replace(/[_-]/g, "")
	for (const [key, suggestion] of Object.entries(suggestions)) {
		if (normalizedName.includes(key)) return suggestion
	}

	return severity === "critical"
		? "Review failing test cases for common patterns. Consider adjusting your prompt structure or adding specific instructions for this metric."
		: "Minor improvements may help. Review edge cases and consider adding clarifying instructions."
}

function generatePromptSuggestions(metricStats: MetricStat[], failedResults: TestResult[]): string {
	const suggestions: string[] = []

	const lowPassMetrics = metricStats.filter((m) => m.passRate < 70)
	if (lowPassMetrics.length > 0) {
		suggestions.push(`Focus on improving: ${lowPassMetrics.map((m) => m.name).join(", ")}`)
	}

	if (failedResults.length > 0) {
		suggestions.push("Consider adding few-shot examples that demonstrate correct behavior")
		suggestions.push("Break complex queries into smaller, focused prompts")
		suggestions.push("Add explicit output format requirements")
	}

	return suggestions.join("\n\n")
}

function generatePromptExample(metricStats: MetricStat[]): string {
	const lowPassMetric = metricStats.find((m) => m.passRate < 70)
	const _metricName = lowPassMetric?.rawName || "quality"

	return `# System Prompt Enhancement Example

You are a helpful assistant that provides accurate,
well-structured responses.

## Guidelines
- Only use information from the provided context
- Structure your response clearly with sections
- If uncertain, acknowledge limitations
- Stay focused on the user's actual question

## Response Format
1. Brief summary (1-2 sentences)
2. Detailed explanation with evidence
3. Actionable next steps if applicable

## Quality Checks
Before responding, verify:
- [ ] Response addresses the question directly
- [ ] All claims are supported by context
- [ ] No fabricated information included
- [ ] Appropriate length and detail level`
}
