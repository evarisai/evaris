import { motion, AnimatePresence } from "framer-motion"
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	Clock,
	DollarSign,
	Loader2,
	Play,
	XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface EvalMetric {
	name: string
	score: number
	passed: boolean
	threshold?: number
}

export interface EvalRunData {
	id: string
	name: string
	status: "pending" | "running" | "passed" | "failed"
	progress: number
	total: number
	passed: number
	failed: number
	accuracy: number | null
	metrics: EvalMetric[]
	durationMs: number | null
	cost: number | null
	experimentName?: string
	modelName?: string
	createdAt: string
}

interface EvalRunCardProps {
	data: EvalRunData
	onViewDetails?: (id: string) => void
	onRerun?: (id: string) => void
	isExpanded?: boolean
	onToggleExpand?: () => void
}

const statusConfig = {
	pending: {
		icon: Clock,
		label: "Pending",
		color: "text-muted-foreground",
		bgColor: "bg-muted",
		borderColor: "border-border",
		glowColor: "shadow-muted/20",
	},
	running: {
		icon: Loader2,
		label: "Running",
		color: "text-amber-500 dark:text-amber-400",
		bgColor: "bg-amber-500/10",
		borderColor: "border-amber-500/30",
		glowColor: "shadow-amber-500/10",
	},
	passed: {
		icon: CheckCircle2,
		label: "Passed",
		color: "text-success",
		bgColor: "bg-success/10",
		borderColor: "border-success/30",
		glowColor: "shadow-success/10",
	},
	failed: {
		icon: XCircle,
		label: "Failed",
		color: "text-destructive",
		bgColor: "bg-destructive/10",
		borderColor: "border-destructive/30",
		glowColor: "shadow-destructive/10",
	},
}

function MetricPill({ metric }: { metric: EvalMetric }) {
	const scorePercent = Math.round(metric.score * 100)
	return (
		<div
			className={cn(
				"inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono",
				"border transition-all duration-200",
				metric.passed
					? "bg-success/5 border-success/20 text-success"
					: "bg-destructive/5 border-destructive/20 text-destructive"
			)}
		>
			<span className="text-muted-foreground text-[10px] uppercase tracking-wider">
				{metric.name}
			</span>
			<span className="font-semibold">{scorePercent}%</span>
			{metric.passed ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
		</div>
	)
}

function formatDuration(ms: number | null): string {
	if (ms === null) return "--"
	if (ms < 1000) return `${ms}ms`
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
	const minutes = Math.floor(ms / 60000)
	const seconds = Math.round((ms % 60000) / 1000)
	return `${minutes}m ${seconds}s`
}

function formatCost(cost: number | null): string {
	if (cost === null) return "--"
	if (cost < 0.01) return `$${cost.toFixed(4)}`
	return `$${cost.toFixed(2)}`
}

export function EvalRunCard({
	data,
	onViewDetails,
	onRerun,
	isExpanded = false,
	onToggleExpand,
}: EvalRunCardProps) {
	const config = statusConfig[data.status]
	const StatusIcon = config.icon
	const isRunning = data.status === "running"
	const accuracyPercent = data.accuracy !== null ? Math.round(data.accuracy * 100) : null

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8 }}
			className={cn(
				"group relative rounded-lg border bg-card backdrop-blur-sm card-hover cursor-pointer",
				config.borderColor,
				isExpanded && "ring-1 ring-primary/20"
			)}
		>
			<div
				className={cn(
					"absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
					config.glowColor,
					"shadow-[0_0_40px_-10px]"
				)}
			/>

			<div
				className="relative p-4 cursor-pointer"
				onClick={onToggleExpand}
				onKeyDown={(e) => e.key === "Enter" && onToggleExpand?.()}
				tabIndex={0}
				role="button"
			>
				<div className="flex items-start justify-between gap-4 mb-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div
							className={cn(
								"flex items-center justify-center w-8 h-8 rounded-md",
								config.bgColor,
								"transition-transform duration-200",
								isRunning && "animate-pulse"
							)}
						>
							<StatusIcon className={cn("w-4 h-4", config.color, isRunning && "animate-spin")} />
						</div>

						<div className="min-w-0 flex-1">
							<h3 className="card-title font-semibold text-foreground truncate">{data.name}</h3>
							<div className="flex items-center gap-2 mt-0.5">
								<code className="text-xs font-mono text-muted-foreground">
									{data.id.slice(0, 12)}
								</code>
								{data.experimentName && (
									<Badge variant="outline" className="text-[10px] px-1.5 py-0">
										{data.experimentName}
									</Badge>
								)}
								{data.modelName && (
									<Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
										{data.modelName}
									</Badge>
								)}
							</div>
						</div>
					</div>

					<motion.div
						animate={{ rotate: isExpanded ? 180 : 0 }}
						transition={{ duration: 0.2 }}
						className="text-muted-foreground"
					>
						<ChevronDown className="w-5 h-5" />
					</motion.div>
				</div>

				{isRunning && (
					<div className="mb-3">
						<div className="flex items-center justify-between text-xs mb-1.5">
							<span className="text-muted-foreground">Progress</span>
							<span className="font-mono text-amber-500 dark:text-amber-400">{data.progress}%</span>
						</div>
						<div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
							<motion.div
								className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
								initial={{ width: 0 }}
								animate={{ width: `${data.progress}%` }}
								transition={{ duration: 0.5, ease: "easeOut" }}
							/>
							<motion.div
								className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
								animate={{ x: ["-100%", "200%"] }}
								transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
							/>
						</div>
					</div>
				)}

				<div className="grid grid-cols-4 gap-3 mb-3">
					<div className="text-center p-2 rounded-md bg-muted/50 border border-border">
						<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
							Accuracy
						</div>
						<div
							className={cn(
								"text-lg font-mono font-bold tabular-nums",
								accuracyPercent !== null && accuracyPercent >= 80
									? "text-success"
									: accuracyPercent !== null && accuracyPercent >= 60
										? "text-amber-500 dark:text-amber-400"
										: accuracyPercent !== null
											? "text-destructive"
											: "text-muted-foreground"
							)}
						>
							{accuracyPercent !== null ? `${accuracyPercent}%` : "--"}
						</div>
					</div>

					<div className="text-center p-2 rounded-md bg-muted/50 border border-border">
						<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
							Pass Rate
						</div>
						<div className="text-lg font-mono font-bold tabular-nums">
							<span className="text-success">{data.passed}</span>
							<span className="text-muted-foreground/50">/</span>
							<span className="text-foreground/70">{data.total}</span>
						</div>
					</div>

					<div className="text-center p-2 rounded-md bg-muted/50 border border-border">
						<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
							Duration
						</div>
						<div className="text-lg font-mono font-bold tabular-nums text-foreground/80 flex items-center justify-center gap-1">
							<Clock className="w-3.5 h-3.5 text-muted-foreground" />
							{formatDuration(data.durationMs)}
						</div>
					</div>

					<div className="text-center p-2 rounded-md bg-muted/50 border border-border">
						<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
							Cost
						</div>
						<div className="text-lg font-mono font-bold tabular-nums text-foreground/80 flex items-center justify-center gap-1">
							<DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
							{formatCost(data.cost)}
						</div>
					</div>
				</div>

				{data.metrics.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{data.metrics.slice(0, 5).map((metric) => (
							<MetricPill key={metric.name} metric={metric} />
						))}
						{data.metrics.length > 5 && (
							<span className="text-xs text-muted-foreground self-center">
								+{data.metrics.length - 5} more
							</span>
						)}
					</div>
				)}
			</div>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="overflow-hidden"
					>
						<div className="px-4 pb-4 border-t border-border pt-4">
							<div className="flex items-center gap-2 mb-4">
								<Button
									size="sm"
									variant="outline"
									onClick={(e) => {
										e.stopPropagation()
										onViewDetails?.(data.id)
									}}
									className="gap-1.5"
								>
									<Activity className="w-3.5 h-3.5" />
									View Results
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={(e) => {
										e.stopPropagation()
										onRerun?.(data.id)
									}}
									className="gap-1.5"
								>
									<Play className="w-3.5 h-3.5" />
									Re-run
								</Button>
							</div>

							{data.metrics.length > 0 && (
								<div className="space-y-2">
									<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Metric Details
									</h4>
									<div className="grid grid-cols-2 gap-2">
										{data.metrics.map((metric) => (
											<div
												key={metric.name}
												className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border"
											>
												<span className="text-sm text-muted-foreground">{metric.name}</span>
												<div className="flex items-center gap-2">
													<div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
														<div
															className={cn(
																"h-full rounded-full transition-all",
																metric.passed ? "bg-success" : "bg-destructive"
															)}
															style={{ width: `${metric.score * 100}%` }}
														/>
													</div>
													<span
														className={cn(
															"text-sm font-mono font-semibold",
															metric.passed ? "text-success" : "text-destructive"
														)}
													>
														{Math.round(metric.score * 100)}%
													</span>
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	)
}

export function EvalRunCardSkeleton() {
	return (
		<div className="rounded-lg border border-border bg-card p-4 animate-pulse">
			<div className="flex items-start gap-3 mb-3">
				<div className="w-8 h-8 rounded-md bg-muted" />
				<div className="flex-1">
					<div className="h-5 w-40 bg-muted rounded mb-1.5" />
					<div className="h-3 w-24 bg-muted rounded" />
				</div>
			</div>
			<div className="grid grid-cols-4 gap-3 mb-3">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="h-16 bg-muted rounded-md" />
				))}
			</div>
			<div className="flex gap-1.5">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-6 w-20 bg-muted rounded" />
				))}
			</div>
		</div>
	)
}
