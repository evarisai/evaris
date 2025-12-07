import { Activity, CheckCircle2, Clock, PlayCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ActivityItem {
	id: string
	type: "eval_passed" | "eval_failed" | "eval_started" | "eval_pending"
	message: string
	project: string
	timestamp: string
}

interface RecentActivityProps {
	activities: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
	const getIcon = (type: ActivityItem["type"]) => {
		const iconClasses = "h-4 w-4"
		switch (type) {
			case "eval_passed":
				return <CheckCircle2 className={`${iconClasses} text-green-600 dark:text-green-400`} />
			case "eval_failed":
				return <XCircle className={`${iconClasses} text-destructive`} />
			case "eval_started":
				return <PlayCircle className={`${iconClasses} text-chart-2`} />
			case "eval_pending":
				return <Clock className={`${iconClasses} text-chart-4`} />
		}
	}

	const getTypeBadge = (type: ActivityItem["type"]) => {
		const labels: Record<ActivityItem["type"], string> = {
			eval_passed: "Passed",
			eval_failed: "Failed",
			eval_started: "Started",
			eval_pending: "Pending",
		}
		const styles: Record<ActivityItem["type"], string> = {
			eval_passed: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
			eval_failed: "bg-destructive/10 text-destructive border-destructive/20",
			eval_started: "bg-chart-2/10 text-chart-2 border-chart-2/20",
			eval_pending: "bg-chart-4/10 text-chart-4 border-chart-4/20",
		}
		return (
			<span
				className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[type]}`}
			>
				{labels[type]}
			</span>
		)
	}

	return (
		<Card className="h-full border-card-border">
			<CardHeader className="pb-4">
				<CardTitle className="text-sm font-semibold flex items-center gap-2">
					<Activity className="h-4 w-4 text-muted-foreground" />
					Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{activities.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
					) : (
						activities.map((activity, index) => (
							<div
								key={activity.id}
								className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors -mx-3"
								data-testid={`activity-${activity.id}`}
								style={{ animationDelay: `${index * 50}ms` }}
							>
								<div className="mt-0.5 p-1.5 rounded-md bg-muted/60">{getIcon(activity.type)}</div>
								<div className="flex-1 min-w-0 space-y-1.5">
									<p className="text-sm leading-snug">{activity.message}</p>
									<div className="flex flex-wrap items-center gap-2">
										{getTypeBadge(activity.type)}
										<span className="text-xs text-muted-foreground font-medium">
											{activity.project}
										</span>
										<span className="text-xs text-muted-foreground/70">{activity.timestamp}</span>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	)
}
