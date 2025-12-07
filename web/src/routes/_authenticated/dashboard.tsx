import { createFileRoute } from "@tanstack/react-router"
import { AlertCircle, CheckCircle2, Database, FlaskConical, FolderKanban } from "lucide-react"
import { EvalsTable } from "@/components/dashboard/EvalsTable"
import { PerformanceChart } from "@/components/dashboard/PerformanceChart"
import { RecentActivity } from "@/components/dashboard/RecentActivity"
import { StatCard } from "@/components/dashboard/StatCard"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: Dashboard,
})

// Helper to safely calculate pass rate avoiding division by zero
function calculatePassRate(passed: number | undefined, total: number | undefined): string {
	if (!total || total === 0) return "0%"
	if (!passed) return "0%"
	return `${Math.round((passed / total) * 100)}%`
}

function Dashboard() {
	// Fetch stats from database with error handling
	const {
		data: statsData,
		error: statsError,
		isLoading: statsLoading,
	} = trpc.evals.getStats.useQuery()
	const {
		data: projectsData,
		error: projectsError,
		isLoading: projectsLoading,
	} = trpc.projects.list.useQuery()
	const {
		data: datasetsData,
		error: datasetsError,
		isLoading: datasetsLoading,
	} = trpc.datasets.list.useQuery()
	const {
		data: evalsData,
		error: evalsError,
		isLoading: evalsLoading,
	} = trpc.evals.list.useQuery({ limit: 6 })

	// Check for any errors
	const hasError = statsError || projectsError || datasetsError || evalsError
	const _isLoading = statsLoading || projectsLoading || datasetsLoading || evalsLoading

	return (
		<div className="space-y-8">
			{/* Header with subtle animation */}
			<div className="animate-fade-in-up">
				<h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground mt-1.5">Overview of your evaluation metrics</p>
			</div>

			{/* Error Banner */}
			{hasError && (
				<div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 animate-fade-in">
					<AlertCircle className="h-5 w-5 shrink-0" />
					<p className="text-sm">Some data failed to load. Please try refreshing the page.</p>
				</div>
			)}

			{/* Stats Grid with staggered animation */}
			<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
				<div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
					<StatCard
						title="Total Evals"
						value={statsLoading ? "..." : (statsData?.total ?? 0)}
						icon={FlaskConical}
					/>
				</div>
				<div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
					<StatCard
						title="Active Projects"
						value={projectsLoading ? "..." : (projectsData?.length ?? 0)}
						icon={FolderKanban}
					/>
				</div>
				<div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
					<StatCard
						title="Datasets"
						value={datasetsLoading ? "..." : (datasetsData?.total ?? 0)}
						icon={Database}
					/>
				</div>
				<div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
					<StatCard
						title="Pass Rate"
						value={statsLoading ? "..." : calculatePassRate(statsData?.passed, statsData?.total)}
						icon={CheckCircle2}
					/>
				</div>
			</div>

			{/* Charts Section */}
			<div className="grid gap-5 lg:grid-cols-3">
				<div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
					<PerformanceChart title="Agent Performance Over Time" data={[]} showAccuracy />
				</div>
				<div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
					<RecentActivity activities={[]} />
				</div>
			</div>

			{/* Table Section */}
			<div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-medium tracking-tight">Recent Eval Runs</h2>
				</div>
				<EvalsTable
					data={
						evalsData?.evals.map((e) => ({
							id: e.id,
							name: e.name,
							project: e.project.name,
							dataset: e.dataset?.name || "-",
							status: e.status.toLowerCase() as "passed" | "failed" | "running" | "pending",
							total: e.total ?? null,
							passed: e.passed ?? null,
							failed: e.failed ?? null,
							accuracy: e.accuracy ?? null,
							timestamp: new Date(e.createdAt).toLocaleString(),
						})) || []
					}
					onViewDetails={(id) => console.log("View details:", id)}
					onRerun={(id) => console.log("Re-run:", id)}
				/>
			</div>
		</div>
	)
}
