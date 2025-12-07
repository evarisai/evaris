import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Eye,
	MoreHorizontal,
	Pencil,
	Play,
	Search,
	Trash2,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface EvalRun {
	id: string
	name: string
	project: string
	dataset: string
	status: "passed" | "failed" | "running" | "pending"
	total: number | null
	passed: number | null
	failed: number | null
	accuracy: number | null
	timestamp: string
}

interface EvalsTableProps {
	data: EvalRun[]
	onViewDetails?: (id: string) => void
	onRerun?: (id: string) => void
	onEdit?: (id: string) => void
	onDelete?: (id: string) => void
}

type SortField = keyof EvalRun
type SortDirection = "asc" | "desc"

export function EvalsTable({ data, onViewDetails, onRerun, onEdit, onDelete }: EvalsTableProps) {
	const [search, setSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState<string>("all")
	const [sortField, setSortField] = useState<SortField>("timestamp")
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc")
		} else {
			setSortField(field)
			setSortDirection("asc")
		}
	}

	const filteredData = data
		.filter((item) => {
			const matchesSearch =
				item.name.toLowerCase().includes(search.toLowerCase()) ||
				item.project.toLowerCase().includes(search.toLowerCase())
			const matchesStatus = statusFilter === "all" || item.status === statusFilter
			return matchesSearch && matchesStatus
		})
		.sort((a, b) => {
			const aVal = a[sortField]
			const bVal = b[sortField]
			if (typeof aVal === "string" && typeof bVal === "string") {
				return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
			}
			if (typeof aVal === "number" && typeof bVal === "number") {
				return sortDirection === "asc" ? aVal - bVal : bVal - aVal
			}
			return 0
		})

	const totalPages = Math.ceil(filteredData.length / itemsPerPage)
	const paginatedData = filteredData.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	const getStatusBadge = (status: EvalRun["status"]) => {
		const styles: Record<string, string> = {
			passed: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
			failed: "bg-destructive/10 text-destructive border-destructive/20",
			running: "bg-chart-2/10 text-chart-2 border-chart-2/20 animate-pulse-soft",
			pending: "bg-muted text-muted-foreground border-border",
		}
		return (
			<span
				className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border capitalize ${styles[status]}`}
			>
				{status}
			</span>
		)
	}

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) return null
		return sortDirection === "asc" ? (
			<ChevronUp className="h-3 w-3 ml-1" />
		) : (
			<ChevronDown className="h-3 w-3 ml-1" />
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-4">
				<div className="relative flex-1 min-w-[200px]">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search evals..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
						data-testid="input-search-evals"
					/>
				</div>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[140px]" data-testid="select-status-filter">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="passed">Passed</SelectItem>
						<SelectItem value="failed">Failed</SelectItem>
						<SelectItem value="running">Running</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="rounded-lg border border-card-border bg-card overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
								<div className="flex items-center">
									Name <SortIcon field="name" />
								</div>
							</TableHead>
							<TableHead
								className="cursor-pointer select-none"
								onClick={() => handleSort("project")}
							>
								<div className="flex items-center">
									Project <SortIcon field="project" />
								</div>
							</TableHead>
							<TableHead>Dataset</TableHead>
							<TableHead>Status</TableHead>
							<TableHead
								className="cursor-pointer select-none text-right"
								onClick={() => handleSort("total")}
							>
								<div className="flex items-center justify-end">
									Total <SortIcon field="total" />
								</div>
							</TableHead>
							<TableHead
								className="cursor-pointer select-none text-right"
								onClick={() => handleSort("passed")}
							>
								<div className="flex items-center justify-end">
									Passed <SortIcon field="passed" />
								</div>
							</TableHead>
							<TableHead
								className="cursor-pointer select-none text-right"
								onClick={() => handleSort("accuracy")}
							>
								<div className="flex items-center justify-end">
									Accuracy <SortIcon field="accuracy" />
								</div>
							</TableHead>
							<TableHead
								className="cursor-pointer select-none"
								onClick={() => handleSort("timestamp")}
							>
								<div className="flex items-center">
									Time <SortIcon field="timestamp" />
								</div>
							</TableHead>
							<TableHead className="w-[50px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedData.length === 0 ? (
							<TableRow>
								<TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
									No results found.
								</TableCell>
							</TableRow>
						) : (
							paginatedData.map((row) => (
								<TableRow
									key={row.id}
									className="hover:bg-muted/40 transition-colors"
									data-testid={`row-eval-${row.id}`}
								>
									<TableCell className="font-medium">{row.name}</TableCell>
									<TableCell className="text-muted-foreground">{row.project}</TableCell>
									<TableCell className="text-muted-foreground">{row.dataset}</TableCell>
									<TableCell>{getStatusBadge(row.status)}</TableCell>
									<TableCell className="text-right font-mono text-sm tabular-nums">
										{row.total ?? "-"}
									</TableCell>
									<TableCell className="text-right font-mono text-sm tabular-nums text-green-600 dark:text-green-400">
										{row.passed ?? "-"}
									</TableCell>
									<TableCell className="text-right font-mono text-sm tabular-nums">
										{row.accuracy != null ? `${(row.accuracy * 100).toFixed(1)}%` : "-"}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">{row.timestamp}</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													data-testid={`button-actions-${row.id}`}
												>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => onViewDetails?.(row.id)}>
													<Eye className="mr-2 h-4 w-4" />
													View Details
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => onEdit?.(row.id)}>
													<Pencil className="mr-2 h-4 w-4" />
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => onRerun?.(row.id)}>
													<Play className="mr-2 h-4 w-4" />
													Re-run Eval
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => onDelete?.(row.id)}
													className="text-destructive focus:text-destructive"
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-sm text-muted-foreground">
					Showing {(currentPage - 1) * itemsPerPage + 1}-
					{Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
				</p>
				<div className="flex items-center gap-2">
					<Button
						size="icon"
						variant="outline"
						onClick={() => setCurrentPage(currentPage - 1)}
						disabled={currentPage === 1}
						data-testid="button-prev-page"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-sm">
						Page {currentPage} of {totalPages || 1}
					</span>
					<Button
						size="icon"
						variant="outline"
						onClick={() => setCurrentPage(currentPage + 1)}
						disabled={currentPage === totalPages || totalPages === 0}
						data-testid="button-next-page"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	)
}
