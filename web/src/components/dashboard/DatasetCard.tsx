import { Database, Download, Edit, MoreHorizontal, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
	itemCount: number
	format: string
	updatedAt: string
	onEdit?: (id: string) => void
	onDownload?: (id: string) => void
	onDelete?: (id: string) => void
	onClick?: (id: string) => void
}

export function DatasetCard({
	id,
	name,
	description,
	itemCount,
	format,
	updatedAt,
	onEdit,
	onDownload,
	onDelete,
	onClick,
}: DatasetCardProps) {
	return (
		<Card
			className="hover-elevate cursor-pointer"
			onClick={() => onClick?.(id)}
			data-testid={`card-dataset-${id}`}
		>
			<CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
				<div className="flex items-start gap-3 min-w-0">
					<div className="rounded-md bg-muted p-2 shrink-0">
						<Database className="h-4 w-4 text-muted-foreground" />
					</div>
					<div className="space-y-1 min-w-0">
						<CardTitle className="text-base truncate">{name}</CardTitle>
						<p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
					</div>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
						<Button size="icon" variant="ghost" data-testid={`button-dataset-actions-${id}`}>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onEdit?.(id)}>
							<Edit className="mr-2 h-4 w-4" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onDownload?.(id)}>
							<Download className="mr-2 h-4 w-4" />
							Download
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => onDelete?.(id)} className="text-destructive">
							<Trash2 className="mr-2 h-4 w-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="text-xs">
							{format}
						</Badge>
						<span className="text-xs text-muted-foreground">
							{itemCount.toLocaleString()} items
						</span>
					</div>
					<span className="text-xs text-muted-foreground">Updated {updatedAt}</span>
				</div>
			</CardContent>
		</Card>
	)
}
