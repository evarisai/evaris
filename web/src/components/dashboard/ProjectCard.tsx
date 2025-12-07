import { MoreHorizontal, Pencil, Play, Settings, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProjectCardProps {
	id: string
	name: string
	description: string
	lastRun?: string
	evalCount: number
	tags?: string[]
	onRun?: (id: string) => void
	onEdit?: (id: string) => void
	onSettings?: (id: string) => void
	onDelete?: (id: string) => void
	onClick?: (id: string) => void
}

export function ProjectCard({
	id,
	name,
	description,
	lastRun,
	evalCount,
	tags = [],
	onRun,
	onEdit,
	onSettings,
	onDelete,
	onClick,
}: ProjectCardProps) {
	return (
		<Card
			className="group cursor-pointer border-card-border transition-all duration-300 hover:shadow-md hover:border-border"
			onClick={() => onClick?.(id)}
			data-testid={`card-project-${id}`}
		>
			<CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
				<div className="space-y-1.5 min-w-0">
					<CardTitle className="text-base font-semibold truncate group-hover:text-accent-color transition-colors">
						{name}
					</CardTitle>
					<p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
						{description}
					</p>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
						<Button
							size="icon"
							variant="ghost"
							className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
							data-testid={`button-project-actions-${id}`}
						>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-40 p-1">
						<DropdownMenuItem onClick={() => onRun?.(id)} className="rounded-md cursor-pointer">
							<Play className="mr-2 h-4 w-4" />
							Run Eval
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onEdit?.(id)} className="rounded-md cursor-pointer">
							<Pencil className="mr-2 h-4 w-4" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onSettings?.(id)}
							className="rounded-md cursor-pointer"
						>
							<Settings className="mr-2 h-4 w-4" />
							Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator className="my-1" />
						<DropdownMenuItem
							onClick={() => onDelete?.(id)}
							className="text-destructive focus:text-destructive rounded-md cursor-pointer"
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</CardHeader>
			<CardContent className="pt-0">
				{tags.length > 0 && (
					<div className="flex flex-wrap items-center gap-1.5 mb-4">
						{tags.map((tag) => (
							<span
								key={tag}
								className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted/70 text-muted-foreground border border-border/50"
							>
								{tag}
							</span>
						))}
					</div>
				)}
				<div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
					<span className="font-medium">{evalCount} evals</span>
					{lastRun && <span>Last run: {lastRun}</span>}
				</div>
			</CardContent>
		</Card>
	)
}
