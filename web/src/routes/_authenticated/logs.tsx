import { createFileRoute } from "@tanstack/react-router"
import {
	ChevronDown,
	ChevronRight,
	Download,
	Filter,
	Loader2,
	RefreshCw,
	Search,
	X,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/_authenticated/logs")({
	component: Logs,
})

type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"

const levelColors: Record<LogLevel, string> = {
	DEBUG: "bg-slate-500",
	INFO: "bg-blue-500",
	WARNING: "bg-yellow-500",
	ERROR: "bg-red-500",
	CRITICAL: "bg-red-700",
}

const levelTextColors: Record<LogLevel, string> = {
	DEBUG: "text-slate-500",
	INFO: "text-blue-500",
	WARNING: "text-yellow-500",
	ERROR: "text-red-500",
	CRITICAL: "text-red-700",
}

function Logs() {
	const [searchQuery, setSearchQuery] = useState("")
	const [levelFilter, setLevelFilter] = useState<string>("all")
	const [sourceFilter, setSourceFilter] = useState<string>("all")
	const [agentFilter, setAgentFilter] = useState<string>("all")
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

	// Fetch logs from API
	const {
		data: logsData,
		isLoading,
		refetch,
	} = trpc.logs.list.useQuery({
		level: levelFilter !== "all" ? (levelFilter as LogLevel) : undefined,
		source: sourceFilter !== "all" ? sourceFilter : undefined,
		agentId: agentFilter !== "all" ? agentFilter : undefined,
		search: searchQuery || undefined,
		limit: 100,
	})

	// Fetch sources for filter dropdown
	const { data: sources = [] } = trpc.logs.getSources.useQuery()

	// Fetch agent IDs for filter dropdown
	const { data: agentIds = [] } = trpc.logs.getAgentIds.useQuery()

	// Fetch stats
	const { data: stats } = trpc.logs.getStats.useQuery()

	const logs = logsData?.logs ?? []

	const toggleRow = (id: string) => {
		const newExpanded = new Set(expandedRows)
		if (newExpanded.has(id)) {
			newExpanded.delete(id)
		} else {
			newExpanded.add(id)
		}
		setExpandedRows(newExpanded)
	}

	const clearFilters = () => {
		setSearchQuery("")
		setLevelFilter("all")
		setSourceFilter("all")
		setAgentFilter("all")
	}

	const hasActiveFilters =
		searchQuery || levelFilter !== "all" || sourceFilter !== "all" || agentFilter !== "all"

	const formatTimestamp = (timestamp: Date | string) => {
		const date = new Date(timestamp)
		return (
			date.toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false,
			}) +
			"." +
			date.getMilliseconds().toString().padStart(3, "0")
		)
	}

	const handleExport = () => {
		if (logs.length === 0) return

		const csvContent = [
			["Timestamp", "Level", "Source", "Agent", "Message"].join(","),
			...logs.map((log) =>
				[
					new Date(log.timestamp).toISOString(),
					log.level,
					log.source,
					log.agentId || "",
					`"${log.message.replace(/"/g, '""')}"`,
				].join(",")
			),
		].join("\n")

		const blob = new Blob([csvContent], { type: "text/csv" })
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download = `logs-${new Date().toISOString().split("T")[0]}.csv`
		a.click()
		URL.revokeObjectURL(url)
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-semibold">Logs</h1>
					<p className="text-muted-foreground mt-1">
						View and analyze agent execution logs, tool calls, and system events
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						data-testid="button-refresh-logs"
						onClick={() => refetch()}
						disabled={isLoading}
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<RefreshCw className="h-4 w-4 mr-2" />
						)}
						Refresh
					</Button>
					<Button
						variant="outline"
						size="sm"
						data-testid="button-export-logs"
						onClick={handleExport}
						disabled={logs.length === 0}
					>
						<Download className="h-4 w-4 mr-2" />
						Export
					</Button>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base font-medium flex items-center gap-2">
							<Filter className="h-4 w-4" />
							Filters
						</CardTitle>
						{hasActiveFilters && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearFilters}
								className="h-8 text-muted-foreground"
							>
								<X className="h-4 w-4 mr-1" />
								Clear all
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-4">
						<div className="flex-1 min-w-[200px]">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search logs..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9"
									data-testid="input-search-logs"
								/>
							</div>
						</div>

						<Select value={levelFilter} onValueChange={setLevelFilter}>
							<SelectTrigger className="w-[140px]" data-testid="select-log-level">
								<SelectValue placeholder="Log Level" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Levels</SelectItem>
								<SelectItem value="DEBUG">Debug</SelectItem>
								<SelectItem value="INFO">Info</SelectItem>
								<SelectItem value="WARNING">Warning</SelectItem>
								<SelectItem value="ERROR">Error</SelectItem>
								<SelectItem value="CRITICAL">Critical</SelectItem>
							</SelectContent>
						</Select>

						<Select value={sourceFilter} onValueChange={setSourceFilter}>
							<SelectTrigger className="w-[180px]" data-testid="select-log-source">
								<SelectValue placeholder="Source" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Sources</SelectItem>
								{sources.map((source) => (
									<SelectItem key={source} value={source}>
										{source}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={agentFilter} onValueChange={setAgentFilter}>
							<SelectTrigger className="w-[150px]" data-testid="select-log-agent">
								<SelectValue placeholder="Agent" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Agents</SelectItem>
								{agentIds.map((agent) => (
									<SelectItem key={agent} value={agent}>
										{agent}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Logs Table */}
			<Card>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[40px]"></TableHead>
									<TableHead className="w-[120px]">Timestamp</TableHead>
									<TableHead className="w-[100px]">Level</TableHead>
									<TableHead className="w-[180px]">Source</TableHead>
									<TableHead className="w-[120px]">Agent</TableHead>
									<TableHead>Message</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{logs.map((log) => {
									const metadata = log.metadata as Record<string, unknown> | null
									const hasMetadata = metadata && Object.keys(metadata).length > 0

									return (
										<Collapsible key={log.id} open={expandedRows.has(log.id)} asChild>
											<TableRow
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => hasMetadata && toggleRow(log.id)}
												data-testid={`log-row-${log.id}`}
											>
												<TableCell>
													{hasMetadata && (
														<CollapsibleTrigger asChild>
															<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
																{expandedRows.has(log.id) ? (
																	<ChevronDown className="h-4 w-4" />
																) : (
																	<ChevronRight className="h-4 w-4" />
																)}
															</Button>
														</CollapsibleTrigger>
													)}
												</TableCell>
												<TableCell className="font-mono text-xs text-muted-foreground">
													{formatTimestamp(log.timestamp)}
												</TableCell>
												<TableCell>
													<Badge
														variant="secondary"
														className={`${levelColors[log.level as LogLevel]} text-white text-xs uppercase`}
													>
														{log.level.toLowerCase()}
													</Badge>
												</TableCell>
												<TableCell className="font-mono text-xs">{log.source}</TableCell>
												<TableCell className="font-mono text-xs text-muted-foreground">
													{log.agentId || "-"}
												</TableCell>
												<TableCell className={`text-sm ${levelTextColors[log.level as LogLevel]}`}>
													{log.message}
												</TableCell>
											</TableRow>
											{hasMetadata && (
												<CollapsibleContent asChild>
													<TableRow className="bg-muted/30">
														<TableCell colSpan={6} className="py-3">
															<div className="pl-10">
																<p className="text-xs font-medium text-muted-foreground mb-2">
																	Metadata
																</p>
																<pre className="text-xs bg-background p-3 rounded-md overflow-x-auto">
																	{JSON.stringify(metadata, null, 2)}
																</pre>
															</div>
														</TableCell>
													</TableRow>
												</CollapsibleContent>
											)}
										</Collapsible>
									)
								})}
								{logs.length === 0 && (
									<TableRow>
										<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
											{hasActiveFilters
												? "No logs found matching the current filters."
												: "No logs yet. Logs will appear here when your agents run."}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Summary Stats */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold">{stats?.total ?? 0}</div>
						<p className="text-xs text-muted-foreground">Total Logs</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold text-red-500">{stats?.errors ?? 0}</div>
						<p className="text-xs text-muted-foreground">Errors</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold text-yellow-500">{stats?.warnings ?? 0}</div>
						<p className="text-xs text-muted-foreground">Warnings</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold">{stats?.activeAgents ?? 0}</div>
						<p className="text-xs text-muted-foreground">Active Agents</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
