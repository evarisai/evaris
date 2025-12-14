import { Database, Edit, Files, Layers, Loader2, MoreHorizontal, Trash2 } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DatasetCardProps {
	id: string
	name: string
	description: string
	fileCount: number
	totalItems: number
	updatedAt: string
	isCreating?: boolean
	onEdit?: (id: string) => void
	onDelete?: (id: string) => void
}

export function DatasetCard({
	id,
	name,
	description,
	fileCount,
	totalItems,
	updatedAt,
	isCreating = false,
	onEdit,
	onDelete,
}: DatasetCardProps) {
	const cardContent = (
		<Card
			className={`h-full relative ${isCreating ? "opacity-75" : "card-hover cursor-pointer"}`}
			data-testid={`card-dataset-${id}`}
		>
			{isCreating && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl z-10">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Creating...</span>
					</div>
				</div>
			)}
			<CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
				<div className="flex items-start gap-3 min-w-0">
					<div className="rounded-lg bg-muted p-2.5 shrink-0">
						<Database className="h-4 w-4 text-shadow-muted-foreground" />
					</div>
					<div className="space-y-1 min-w-0">
						<CardTitle className="card-title text-base truncate">{name}</CardTitle>
						<p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
							{description || "No description"}
						</p>
					</div>
				</div>
				{!isCreating && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
							<Button size="icon" variant="ghost" data-testid={`button-dataset-actions-${id}`}>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={(e) => {
									e.preventDefault()
									onEdit?.(id)
								}}
							>
								<Edit className="mr-2 h-4 w-4" />
								Edit Details
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={(e) => {
									e.preventDefault()
									onDelete?.(id)
								}}
								className="text-destructive"
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</CardHeader>
			<CardContent className="pt-0">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-1.5">
							<Files className="h-3.5 w-3.5 text-muted-foreground" />
							<span className="text-sm font-medium">{fileCount}</span>
							<span className="text-xs text-muted-foreground">
								{fileCount === 1 ? "file" : "files"}
							</span>
						</div>
						{totalItems > 0 && (
							<>
								<span className="text-border">|</span>
								<div className="flex items-center gap-1.5">
									<Layers className="h-3.5 w-3.5 text-muted-foreground" />
									<span className="text-sm font-medium">{totalItems.toLocaleString()}</span>
									<span className="text-xs text-muted-foreground">items</span>
								</div>
							</>
						)}
					</div>
					<span className="text-xs text-muted-foreground">Updated {updatedAt}</span>
				</div>
			</CardContent>
		</Card>
	)

	if (isCreating) {
		return <div className="block h-full">{cardContent}</div>
	}

	return (
		<Link to="/datasets/$datasetId" params={{ datasetId: id }}>
			{cardContent}
		</Link>
	)
}
