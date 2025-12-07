import { createFileRoute } from "@tanstack/react-router"
import {
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	Filter,
	Layers,
	Loader2,
	RefreshCw,
	Search,
	X,
	XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/_authenticated/traces")({
	component: Traces,
})

type SpanStatus = "OK" | "ERROR" | "UNSET"
type SpanKind = "INTERNAL" | "CLIENT" | "SERVER" | "PRODUCER" | "CONSUMER"

interface Span {
	id: string
	spanId: string
	parentSpanId: string | null
	operationName: string
	serviceName: string
	kind: SpanKind
	status: SpanStatus
	startTime: number
	duration: number
	attributes: Record<string, unknown> | null
	events: Array<{
		name: string
		timestamp: number
		attributes?: Record<string, unknown>
	}> | null
}

// Type for trace with spans (used by API response typing)
type _TraceWithSpans = {
	id: string
	traceId: string
	rootSpanName: string
	serviceName: string
	status: SpanStatus
	startTime: Date
	duration: number
	spanCount: number
	spans?: Span[]
}

const _statusColors: Record<SpanStatus, string> = {
	OK: "text-green-500",
	ERROR: "text-red-500",
	UNSET: "text-gray-500",
}

const statusBgColors: Record<SpanStatus, string> = {
	OK: "bg-green-500",
	ERROR: "bg-red-500",
	UNSET: "bg-gray-500",
}

const kindLabels: Record<SpanKind, string> = {
	INTERNAL: "Internal",
	CLIENT: "Client",
	SERVER: "Server",
	PRODUCER: "Producer",
	CONSUMER: "Consumer",
}

function Traces() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState<string>("all")
	const [serviceFilter, setServiceFilter] = useState<string>("all")
	const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
	const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set())

	// Fetch traces from API
	const {
		data: tracesData,
		isLoading,
		refetch,
	} = trpc.traces.list.useQuery({
		status: statusFilter !== "all" ? (statusFilter as SpanStatus) : undefined,
		serviceName: serviceFilter !== "all" ? serviceFilter : undefined,
		search: searchQuery || undefined,
		limit: 50,
	})

	// Fetch services for filter dropdown
	const { data: services = [] } = trpc.traces.getServices.useQuery()

	// Fetch stats
	const { data: stats } = trpc.traces.getStats.useQuery()

	// Fetch selected trace with spans
	const { data: selectedTrace } = trpc.traces.getById.useQuery(
		{ id: selectedTraceId! },
		{ enabled: !!selectedTraceId }
	)

	const traces = tracesData?.traces ?? []

	const toggleSpan = (spanId: string) => {
		const newExpanded = new Set(expandedSpans)
		if (newExpanded.has(spanId)) {
			newExpanded.delete(spanId)
		} else {
			newExpanded.add(spanId)
		}
		setExpandedSpans(newExpanded)
	}

	const formatDuration = (ms: number): string => {
		if (ms < 1000) return `${ms}ms`
		return `${(ms / 1000).toFixed(2)}s`
	}

	const formatTimestamp = (timestamp: Date | string) => {
		return new Date(timestamp).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		})
	}

	const clearFilters = () => {
		setSearchQuery("")
		setStatusFilter("all")
		setServiceFilter("all")
	}

	const hasActiveFilters = searchQuery || statusFilter !== "all" || serviceFilter !== "all"

	const renderSpanBar = (span: Span, totalDuration: number) => {
		const leftPercent = (span.startTime / totalDuration) * 100
		const widthPercent = Math.max((span.duration / totalDuration) * 100, 1)

		return (
			<div className="relative h-6 bg-muted rounded">
				<div
					className={`absolute h-full rounded ${statusBgColors[span.status]} opacity-80`}
					style={{
						left: `${leftPercent}%`,
						width: `${widthPercent}%`,
					}}
				/>
				<div
					className="absolute text-xs text-muted-foreground whitespace-nowrap"
					style={{ left: `${leftPercent + widthPercent + 1}%` }}
				>
					{formatDuration(span.duration)}
				</div>
			</div>
		)
	}

	const getSpanDepth = (span: Span, spans: Span[]): number => {
		if (!span.parentSpanId) return 0
		const parent = spans.find((s) => s.spanId === span.parentSpanId)
		return parent ? getSpanDepth(parent, spans) + 1 : 0
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-semibold">Traces</h1>
					<p className="text-muted-foreground mt-1">
						Distributed traces from OpenTelemetry - view agent calls, tool executions, and LLM
						requests
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					data-testid="button-refresh-traces"
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
									placeholder="Search by trace ID, operation name..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9"
									data-testid="input-search-traces"
								/>
							</div>
						</div>

						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-[140px]" data-testid="select-trace-status">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="OK">Success</SelectItem>
								<SelectItem value="ERROR">Error</SelectItem>
							</SelectContent>
						</Select>

						<Select value={serviceFilter} onValueChange={setServiceFilter}>
							<SelectTrigger className="w-[200px]" data-testid="select-trace-service">
								<SelectValue placeholder="Service" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Services</SelectItem>
								{services.map((service) => (
									<SelectItem key={service} value={service}>
										{service}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Trace List */}
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle className="text-base font-medium flex items-center gap-2">
							<Layers className="h-4 w-4" />
							Traces ({tracesData?.total ?? 0})
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : (
							<div className="divide-y">
								{traces.map((trace) => (
									<div
										key={trace.id}
										className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
											selectedTraceId === trace.id ? "bg-muted/50" : ""
										}`}
										onClick={() => setSelectedTraceId(trace.id)}
										data-testid={`trace-row-${trace.traceId}`}
									>
										<div className="flex items-start justify-between gap-4">
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 mb-1">
													{trace.status === "OK" ? (
														<CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
													) : (
														<XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
													)}
													<span className="font-medium truncate">{trace.rootSpanName}</span>
												</div>
												<div className="flex items-center gap-4 text-xs text-muted-foreground">
													<span className="font-mono">{trace.traceId.slice(0, 12)}...</span>
													<span>{trace.serviceName}</span>
												</div>
											</div>
											<div className="text-right flex-shrink-0">
												<div className="flex items-center gap-1 text-sm">
													<Clock className="h-3 w-3" />
													{formatDuration(trace.duration)}
												</div>
												<div className="text-xs text-muted-foreground">{trace.spanCount} spans</div>
											</div>
										</div>
										<div className="mt-2 text-xs text-muted-foreground">
											{formatTimestamp(trace.startTime)}
										</div>
									</div>
								))}
								{traces.length === 0 && (
									<div className="p-8 text-center text-muted-foreground">
										{hasActiveFilters
											? "No traces found matching the current filters."
											: "No traces yet. Traces will appear here when your agents run."}
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Trace Detail */}
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle className="text-base font-medium">
							{selectedTrace ? "Trace Details" : "Select a trace"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{selectedTrace?.spans ? (
							<Tabs defaultValue="timeline" className="w-full">
								<TabsList className="mb-4">
									<TabsTrigger value="timeline">Timeline</TabsTrigger>
									<TabsTrigger value="spans">Spans</TabsTrigger>
								</TabsList>

								<TabsContent value="timeline" className="space-y-4">
									<div className="space-y-1">
										<div className="text-xs text-muted-foreground mb-2">
											Total Duration: {formatDuration(selectedTrace.duration)}
										</div>
										{selectedTrace.spans.map((span) => {
											const depth = getSpanDepth(span as Span, selectedTrace.spans as Span[])
											return (
												<Collapsible key={span.id} open={expandedSpans.has(span.spanId)}>
													<div
														className="flex items-center gap-2 py-1"
														style={{ paddingLeft: `${depth * 16}px` }}
													>
														<CollapsibleTrigger asChild>
															<Button
																variant="ghost"
																size="sm"
																className="h-5 w-5 p-0"
																onClick={() => toggleSpan(span.spanId)}
															>
																{expandedSpans.has(span.spanId) ? (
																	<ChevronDown className="h-3 w-3" />
																) : (
																	<ChevronRight className="h-3 w-3" />
																)}
															</Button>
														</CollapsibleTrigger>
														<span
															className={`w-2 h-2 rounded-full ${statusBgColors[span.status as SpanStatus]}`}
														/>
														<span className="text-xs font-medium truncate flex-1">
															{span.operationName}
														</span>
														<Badge variant="outline" className="text-xs">
															{kindLabels[span.kind as SpanKind]}
														</Badge>
													</div>
													<div className="mb-2" style={{ paddingLeft: `${depth * 16 + 28}px` }}>
														{renderSpanBar(span as Span, selectedTrace.duration)}
													</div>
													<CollapsibleContent>
														<div
															className="bg-muted/50 rounded p-3 mb-2 text-xs"
															style={{ marginLeft: `${depth * 16 + 28}px` }}
														>
															<div className="grid grid-cols-2 gap-2 mb-2">
																<div>
																	<span className="text-muted-foreground">Service:</span>{" "}
																	{span.serviceName}
																</div>
																<div>
																	<span className="text-muted-foreground">Duration:</span>{" "}
																	{formatDuration(span.duration)}
																</div>
															</div>
															{span.attributes && Object.keys(span.attributes).length > 0 && (
																<>
																	<div className="text-muted-foreground mb-1">Attributes:</div>
																	<pre className="bg-background p-2 rounded overflow-x-auto text-xs">
																		{JSON.stringify(span.attributes, null, 2)}
																	</pre>
																</>
															)}
															{span.events &&
																Array.isArray(span.events) &&
																span.events.length > 0 && (
																	<>
																		<div className="text-muted-foreground mt-2 mb-1">Events:</div>
																		<div className="space-y-1">
																			{(
																				span.events as Array<{ name: string; timestamp: number }>
																			).map((event) => (
																				<div
																					key={`${event.name}-${event.timestamp}`}
																					className="flex items-center gap-2"
																				>
																					<span className="text-muted-foreground">
																						+{event.timestamp - span.startTime}ms
																					</span>
																					<span>{event.name}</span>
																				</div>
																			))}
																		</div>
																	</>
																)}
														</div>
													</CollapsibleContent>
												</Collapsible>
											)
										})}
									</div>
								</TabsContent>

								<TabsContent value="spans" className="space-y-2">
									{selectedTrace.spans.map((span) => (
										<Card key={span.id} className="p-3">
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-2">
													<span
														className={`w-2 h-2 rounded-full ${statusBgColors[span.status as SpanStatus]}`}
													/>
													<span className="font-medium text-sm">{span.operationName}</span>
												</div>
												<Badge variant="outline" className="text-xs">
													{formatDuration(span.duration)}
												</Badge>
											</div>
											<div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
												<div>Service: {span.serviceName}</div>
												<div>Kind: {kindLabels[span.kind as SpanKind]}</div>
												<div>Span ID: {span.spanId}</div>
												{span.parentSpanId && <div>Parent: {span.parentSpanId}</div>}
											</div>
										</Card>
									))}
								</TabsContent>
							</Tabs>
						) : (
							<div className="text-center text-muted-foreground py-8">
								Click on a trace to view its details and span breakdown.
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Summary Stats */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold">{stats?.total ?? 0}</div>
						<p className="text-xs text-muted-foreground">Total Traces</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold text-green-500">{stats?.successful ?? 0}</div>
						<p className="text-xs text-muted-foreground">Successful</p>
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
						<div className="text-2xl font-bold">
							{stats?.avgDuration ? formatDuration(Math.round(stats.avgDuration)) : "-"}
						</div>
						<p className="text-xs text-muted-foreground">Avg Duration</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
