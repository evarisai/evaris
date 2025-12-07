import type { LucideIcon } from "lucide-react"
import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
	title: string
	value: string | number
	trend?: number
	trendLabel?: string
	icon?: LucideIcon
}

export function StatCard({ title, value, trend, trendLabel, icon: Icon }: StatCardProps) {
	const getTrendIcon = () => {
		if (trend === undefined) return null
		if (trend > 0) return <TrendingUp className="h-3.5 w-3.5" />
		if (trend < 0) return <TrendingDown className="h-3.5 w-3.5" />
		return <Minus className="h-3.5 w-3.5" />
	}

	const getTrendColor = () => {
		if (trend === undefined) return ""
		if (trend > 0) return "text-green-600 dark:text-green-400"
		if (trend < 0) return "text-destructive"
		return "text-muted-foreground"
	}

	const getTrendBgColor = () => {
		if (trend === undefined) return ""
		if (trend > 0) return "bg-green-500/10"
		if (trend < 0) return "bg-destructive/10"
		return "bg-muted"
	}

	return (
		<Card className="hover-elevate group transition-all duration-300 hover:shadow-md border-card-border">
			<CardContent className="p-6">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">{title}</p>
						<p className="text-3xl font-semibold font-mono tracking-tight">{value}</p>
						{trend !== undefined && (
							<div
								className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${getTrendColor()} ${getTrendBgColor()}`}
							>
								{getTrendIcon()}
								<span>
									{trend > 0 ? "+" : ""}
									{trend}%
								</span>
								{trendLabel && (
									<span className="text-muted-foreground font-normal">{trendLabel}</span>
								)}
							</div>
						)}
					</div>
					{Icon && (
						<div className="rounded-lg bg-muted/80 p-2.5 transition-colors group-hover:bg-accent-color/10">
							<Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-accent-color" />
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
