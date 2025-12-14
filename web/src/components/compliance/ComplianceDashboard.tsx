import { motion } from "framer-motion"
import {
	AlertTriangle,
	CheckCircle2,
	ChevronRight,
	FileWarning,
	HelpCircle,
	Scale,
	Shield,
	ShieldCheck,
	XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type ComplianceStatus = "compliant" | "warning" | "violation" | "unchecked"

export interface ComplianceRule {
	id: string
	name: string
	description: string
	status: ComplianceStatus
	score?: number
	evidence?: string
	suggestion?: string
	checkedAt?: string
}

export interface ComplianceFrameworkData {
	id: string
	name: string
	shortName: string
	description: string
	icon: "abc" | "soc2" | "gdpr" | "eu_ai_act"
	status: ComplianceStatus
	score: number
	totalRules: number
	passedRules: number
	warningRules: number
	violationRules: number
	rules: ComplianceRule[]
}

interface ComplianceDashboardProps {
	frameworks: ComplianceFrameworkData[]
	onViewFramework?: (frameworkId: string) => void
	onRunCheck?: (frameworkId: string) => void
}

const frameworkIcons = {
	abc: Shield,
	soc2: ShieldCheck,
	gdpr: Scale,
	eu_ai_act: FileWarning,
}

const statusConfig = {
	compliant: {
		color: "text-emerald-400",
		bgColor: "bg-emerald-500/10",
		borderColor: "border-emerald-500/30",
		icon: CheckCircle2,
		label: "Compliant",
	},
	warning: {
		color: "text-amber-400",
		bgColor: "bg-amber-500/10",
		borderColor: "border-amber-500/30",
		icon: AlertTriangle,
		label: "Warnings",
	},
	violation: {
		color: "text-rose-400",
		bgColor: "bg-rose-500/10",
		borderColor: "border-rose-500/30",
		icon: XCircle,
		label: "Violations",
	},
	unchecked: {
		color: "text-muted-foreground",
		bgColor: "bg-muted",
		borderColor: "border-border",
		icon: HelpCircle,
		label: "Unchecked",
	},
}

function getOverallStatus(frameworks: ComplianceFrameworkData[]): ComplianceStatus {
	if (frameworks.some((f) => f.status === "violation")) return "violation"
	if (frameworks.some((f) => f.status === "warning")) return "warning"
	if (frameworks.some((f) => f.status === "unchecked")) return "unchecked"
	return "compliant"
}

function ComplianceProgressRing({
	score,
	size = 80,
	strokeWidth = 6,
	status,
}: {
	score: number
	size?: number
	strokeWidth?: number
	status: ComplianceStatus
}) {
	const radius = (size - strokeWidth) / 2
	const circumference = radius * 2 * Math.PI
	const offset = circumference - (score / 100) * circumference

	const statusColors = {
		compliant: "stroke-emerald-500",
		warning: "stroke-amber-500",
		violation: "stroke-rose-500",
		unchecked: "stroke-muted-foreground",
	}

	return (
		<div className="relative" style={{ width: size, height: size }}>
			<svg className="transform -rotate-90" width={size} height={size}>
				{/* Background circle */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="currentColor"
					strokeWidth={strokeWidth}
					fill="none"
					className="text-muted"
				/>
				{/* Progress circle */}
				<motion.circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="currentColor"
					strokeWidth={strokeWidth}
					fill="none"
					strokeLinecap="round"
					className={statusColors[status]}
					initial={{ strokeDashoffset: circumference }}
					animate={{ strokeDashoffset: offset }}
					transition={{ duration: 1, ease: "easeOut" }}
					style={{
						strokeDasharray: circumference,
					}}
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span className={cn("text-xl font-mono font-bold", statusConfig[status].color)}>
					{score}%
				</span>
			</div>
		</div>
	)
}

function FrameworkCard({
	framework,
	onViewDetails,
	onRunCheck,
}: {
	framework: ComplianceFrameworkData
	onViewDetails?: () => void
	onRunCheck?: () => void
}) {
	const Icon = frameworkIcons[framework.icon]
	const config = statusConfig[framework.status]
	const StatusIcon = config.icon

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			className={cn(
				"relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm p-5 card-hover cursor-pointer",
				config.borderColor
			)}
		>
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-3">
					<div
						className={cn("flex items-center justify-center w-10 h-10 rounded-lg", config.bgColor)}
					>
						<Icon className={cn("w-5 h-5", config.color)} />
					</div>
					<div>
						<h3 className="card-title font-semibold text-foreground">{framework.name}</h3>
						<p className="text-xs text-muted-foreground">{framework.description}</p>
					</div>
				</div>
				<Badge className={cn("text-xs", config.bgColor, config.color, "border-0")}>
					<StatusIcon className="w-3 h-3 mr-1" />
					{config.label}
				</Badge>
			</div>

			<div className="flex items-center gap-6 mb-4">
				<ComplianceProgressRing score={framework.score} status={framework.status} />

				<div className="flex-1 space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Total Rules</span>
						<span className="font-mono text-foreground/80">{framework.totalRules}</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-emerald-400">Passed</span>
						<span className="font-mono text-emerald-400">{framework.passedRules}</span>
					</div>
					{framework.warningRules > 0 && (
						<div className="flex items-center justify-between text-sm">
							<span className="text-amber-400">Warnings</span>
							<span className="font-mono text-amber-400">{framework.warningRules}</span>
						</div>
					)}
					{framework.violationRules > 0 && (
						<div className="flex items-center justify-between text-sm">
							<span className="text-rose-400">Violations</span>
							<span className="font-mono text-rose-400">{framework.violationRules}</span>
						</div>
					)}
				</div>
			</div>

			<div className="mb-4">
				<div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
					{framework.passedRules > 0 && (
						<motion.div
							initial={{ width: 0 }}
							animate={{
								width: `${(framework.passedRules / framework.totalRules) * 100}%`,
							}}
							transition={{ duration: 0.6, ease: "easeOut" }}
							className="bg-emerald-500 rounded-l-full"
						/>
					)}
					{framework.warningRules > 0 && (
						<motion.div
							initial={{ width: 0 }}
							animate={{
								width: `${(framework.warningRules / framework.totalRules) * 100}%`,
							}}
							transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
							className="bg-amber-500"
						/>
					)}
					{framework.violationRules > 0 && (
						<motion.div
							initial={{ width: 0 }}
							animate={{
								width: `${(framework.violationRules / framework.totalRules) * 100}%`,
							}}
							transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
							className="bg-rose-500 rounded-r-full"
						/>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onViewDetails}>
					View Details
					<ChevronRight className="w-3.5 h-3.5" />
				</Button>
				<Button size="sm" variant="ghost" onClick={onRunCheck}>
					Re-check
				</Button>
			</div>
		</motion.div>
	)
}

function OverallComplianceHeader({ frameworks }: { frameworks: ComplianceFrameworkData[] }) {
	const overallStatus = getOverallStatus(frameworks)
	const config = statusConfig[overallStatus]
	const StatusIcon = config.icon

	const totalRules = frameworks.reduce((sum, f) => sum + f.totalRules, 0)
	const passedRules = frameworks.reduce((sum, f) => sum + f.passedRules, 0)
	const overallScore = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0

	return (
		<motion.div
			initial={{ opacity: 0, y: -12 }}
			animate={{ opacity: 1, y: 0 }}
			className={cn(
				"relative overflow-hidden rounded-2xl border-2 p-6 mb-6",
				"bg-gradient-to-br from-card/80 to-card/40",
				config.borderColor
			)}
		>
			<div className="absolute inset-0 opacity-10">
				<div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-current to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
				<div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-current to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
			</div>

			<div className="relative flex items-center justify-between">
				<div className="flex items-center gap-6">
					{/* Large status icon */}
					<div
						className={cn(
							"flex items-center justify-center w-20 h-20 rounded-2xl",
							config.bgColor,
							"border-2",
							config.borderColor
						)}
					>
						<StatusIcon className={cn("w-10 h-10", config.color)} />
					</div>

					<div>
						<h2 className="text-2xl font-bold text-foreground mb-1">Overall Compliance Status</h2>
						<p className="text-muted-foreground">
							{overallStatus === "compliant" && "All compliance checks are passing."}
							{overallStatus === "warning" && "Some checks require attention."}
							{overallStatus === "violation" && "Critical violations detected."}
							{overallStatus === "unchecked" && "Compliance checks pending."}
						</p>
						<div className="flex items-center gap-4 mt-3">
							<TooltipProvider>
								{frameworks.map((f) => {
									const FIcon = frameworkIcons[f.icon]
									const fConfig = statusConfig[f.status]
									return (
										<Tooltip key={f.id}>
											<TooltipTrigger>
												<div
													className={cn(
														"flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
														fConfig.bgColor,
														fConfig.color
													)}
												>
													<FIcon className="w-3.5 h-3.5" />
													{f.shortName}
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p>
													{f.name}: {f.score}% compliant
												</p>
											</TooltipContent>
										</Tooltip>
									)
								})}
							</TooltipProvider>
						</div>
					</div>
				</div>

				<div className="text-right">
					<ComplianceProgressRing
						score={overallScore}
						size={100}
						strokeWidth={8}
						status={overallStatus}
					/>
					<p className="text-xs text-muted-foreground mt-2">
						{passedRules}/{totalRules} rules passing
					</p>
				</div>
			</div>
		</motion.div>
	)
}

export function ComplianceDashboard({
	frameworks,
	onViewFramework,
	onRunCheck,
}: ComplianceDashboardProps) {
	return (
		<div className="space-y-6">
			<OverallComplianceHeader frameworks={frameworks} />

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{frameworks.map((framework, index) => (
					<motion.div
						key={framework.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
					>
						<FrameworkCard
							framework={framework}
							onViewDetails={() => onViewFramework?.(framework.id)}
							onRunCheck={() => onRunCheck?.(framework.id)}
						/>
					</motion.div>
				))}
			</div>
		</div>
	)
}

// Rule detail component for individual rule display
export function ComplianceRuleItem({ rule }: { rule: ComplianceRule }) {
	const config = statusConfig[rule.status]
	const StatusIcon = config.icon

	return (
		<div
			className={cn("p-4 rounded-lg border transition-all", config.borderColor, "hover:bg-card/50")}
		>
			<div className="flex items-start justify-between mb-2">
				<div className="flex items-center gap-2">
					<StatusIcon className={cn("w-4 h-4", config.color)} />
					<h4 className="font-medium text-foreground">{rule.name}</h4>
				</div>
				{rule.score !== undefined && (
					<span className={cn("font-mono text-sm", config.color)}>{rule.score}%</span>
				)}
			</div>

			<p className="text-sm text-muted-foreground mb-3">{rule.description}</p>

			{rule.evidence && (
				<div className="text-xs bg-muted/50 rounded p-2 mb-2 font-mono text-muted-foreground">
					{rule.evidence}
				</div>
			)}

			{rule.suggestion && rule.status !== "compliant" && (
				<div className="flex items-start gap-2 text-xs">
					<AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
					<span className="text-amber-400">{rule.suggestion}</span>
				</div>
			)}
		</div>
	)
}

// Skeleton for loading state
export function ComplianceDashboardSkeleton() {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="h-40 bg-muted rounded-2xl" />
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="h-64 bg-muted rounded-xl" />
				))}
			</div>
		</div>
	)
}
