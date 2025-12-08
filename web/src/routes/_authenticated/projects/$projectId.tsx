import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import {
	ArrowLeft,
	BarChart3,
	Check,
	Copy,
	Database,
	Loader2,
	MoreHorizontal,
	Pencil,
	Play,
	Settings,
	Trash2,
} from "lucide-react"
import { useState } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditDialog } from "@/components/dashboard/EditDialog"
import { useToast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
	component: ProjectDetail,
})

function ProjectDetail() {
	const { projectId } = Route.useParams()
	const navigate = useNavigate()
	const { toast } = useToast()

	const [copied, setCopied] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)

	const { data: project, isLoading, refetch } = trpc.projects.getById.useQuery({ id: projectId })

	const updateProjectMutation = trpc.projects.update.useMutation({
		onSuccess: () => {
			refetch()
			setEditOpen(false)
			toast({
				title: "Project updated",
				description: "Your changes have been saved.",
			})
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const deleteProjectMutation = trpc.projects.delete.useMutation({
		onSuccess: () => {
			toast({
				title: "Project deleted",
				description: "The project has been removed.",
			})
			navigate({ to: "/projects" })
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const copyProjectId = () => {
		navigator.clipboard.writeText(projectId)
		setCopied(true)
		toast({
			title: "Copied",
			description: "Project ID copied to clipboard.",
		})
		setTimeout(() => setCopied(false), 2000)
	}

	const handleEdit = (data: { name: string; description: string }) => {
		updateProjectMutation.mutate({ id: projectId, ...data })
	}

	const handleDelete = () => {
		deleteProjectMutation.mutate({ id: projectId })
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	if (!project) {
		return (
			<div className="space-y-6 animate-fade-in">
				<Link
					to="/projects"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Projects
				</Link>
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
						<Database className="h-8 w-8 text-muted-foreground/50" />
					</div>
					<h2 className="text-xl font-semibold mb-2">Project not found</h2>
					<p className="text-muted-foreground mb-4">
						This project may have been deleted or you don't have access.
					</p>
					<Button asChild variant="outline">
						<Link to="/projects">View all projects</Link>
					</Button>
				</div>
			</div>
		)
	}

	const evalCount = project.evals?.length || 0
	const datasetCount = project.datasets?.length || 0

	return (
		<div className="space-y-8">
			<div className="animate-fade-in">
				<Link
					to="/projects"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Projects
				</Link>
			</div>

			<div
				className="flex flex-wrap items-start justify-between gap-4 animate-fade-in-up"
				style={{ animationDelay: "50ms" }}
			>
				<div className="space-y-2">
					<h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
					{project.description && (
						<p className="text-muted-foreground max-w-2xl">{project.description}</p>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => setEditOpen(true)}>
						<Pencil className="h-4 w-4 mr-2" />
						Edit
					</Button>
					<Button>
						<Play className="h-4 w-4 mr-2" />
						Run Eval
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size="icon" variant="ghost">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-40">
							<DropdownMenuItem onClick={() => setEditOpen(true)}>
								<Settings className="mr-2 h-4 w-4" />
								Settings
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => setDeleteOpen(true)}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<Card
				className="border-card-border animate-fade-in-up overflow-hidden"
				style={{ animationDelay: "100ms" }}
			>
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-medium">Project ID</CardTitle>
					<CardDescription>
						Use this ID in your SDK to run evaluations for this project
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-3">
						<div className="flex-1 relative group">
							<div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border/50 font-mono text-sm">
								<code className="flex-1 select-all break-all">{projectId}</code>
								<Button
									size="icon"
									variant="ghost"
									onClick={copyProjectId}
									className="h-8 w-8 shrink-0 transition-all"
									data-testid="button-copy-project-id"
								>
									{copied ? (
										<Check className="h-4 w-4 text-accent-color" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>
					</div>
					<div className="mt-4 p-3 bg-muted/30 rounded-lg border border-dashed border-border/50">
						<p className="text-xs text-muted-foreground font-mono">
							<span className="text-foreground/70">EVARIS_PROJECT_ID</span>="{projectId}"
						</p>
					</div>
				</CardContent>
			</Card>

			<div
				className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in-up"
				style={{ animationDelay: "150ms" }}
			>
				<Card className="border-card-border">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Evaluations</p>
								<p className="text-2xl font-semibold mt-1">{evalCount}</p>
							</div>
							<div className="h-10 w-10 rounded-lg bg-accent-color/10 flex items-center justify-center">
								<BarChart3 className="h-5 w-5 text-accent-color" />
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-card-border">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Datasets</p>
								<p className="text-2xl font-semibold mt-1">{datasetCount}</p>
							</div>
							<div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
								<Database className="h-5 w-5 text-chart-2" />
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-card-border">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Created</p>
								<p className="text-sm font-medium mt-1">
									{project.createdAt
										? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })
										: "Unknown"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-card-border">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Last Updated</p>
								<p className="text-sm font-medium mt-1">
									{project.updatedAt
										? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })
										: "Never"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="border-card-border animate-fade-in-up" style={{ animationDelay: "200ms" }}>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base">Recent Evaluations</CardTitle>
							<CardDescription>Latest evaluation runs for this project</CardDescription>
						</div>
						{evalCount > 0 && (
							<Button variant="outline" size="sm" asChild>
								<Link to="/evals">View All</Link>
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{!project.evals || project.evals.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
								<BarChart3 className="h-6 w-6 text-muted-foreground/50" />
							</div>
							<p className="text-sm text-muted-foreground mb-3">No evaluations yet</p>
							<Button size="sm">
								<Play className="h-4 w-4 mr-2" />
								Run your first eval
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							{project.evals.slice(0, 5).map((evalItem) => (
								<div
									key={evalItem.id}
									className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
								>
									<div className="flex items-center gap-3">
										<div>
											<p className="text-sm font-medium">{evalItem.name}</p>
											<p className="text-xs text-muted-foreground">
												{evalItem.createdAt
													? formatDistanceToNow(new Date(evalItem.createdAt), {
															addSuffix: true,
														})
													: "Unknown"}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge
											variant={evalItem.status === "PASSED" ? "default" : "secondary"}
											className={
												evalItem.status === "PASSED"
													? "bg-accent-color/10 text-accent-color border-accent-color/20"
													: ""
											}
										>
											{evalItem.status}
										</Badge>
										{evalItem.accuracy !== null && (
											<span className="text-sm font-mono text-muted-foreground">
												{(evalItem.accuracy * 100).toFixed(0)}%
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="border-card-border animate-fade-in-up" style={{ animationDelay: "250ms" }}>
				<CardHeader>
					<CardTitle className="text-base">Quick Start</CardTitle>
					<CardDescription>Use this project in your code</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto border border-border/50">
						<pre className="text-muted-foreground">
							<code>
								<span className="text-foreground/70">from</span> evaris_client{" "}
								<span className="text-foreground/70">import</span> EvarisClient, TestCase
								{"\n\n"}
								client = EvarisClient(
								{"\n"}
								{"    "}api_key=<span className="text-accent-color">"ev_..."</span>,{"\n"}
								{"    "}project_id=<span className="text-accent-color">"{projectId}"</span>
								{"\n"}){"\n\n"}
								result = <span className="text-foreground/70">await</span> client.assess(
								{"\n"}
								{"    "}name=<span className="text-accent-color">"my-eval"</span>,{"\n"}
								{"    "}test_cases=[...],{"\n"}
								{"    "}metrics=[<span className="text-accent-color">"faithfulness"</span>,{" "}
								<span className="text-accent-color">"answer_relevancy"</span>]{"\n"})
							</code>
						</pre>
					</div>
				</CardContent>
			</Card>

			<EditDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				title="Edit Project"
				description="Update your project details."
				onSubmit={handleEdit}
				initialName={project.name}
				initialDescription={project.description ?? ""}
				namePlaceholder="My Project"
				descriptionPlaceholder="Describe your project..."
				isLoading={updateProjectMutation.isPending}
			/>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Project</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{project.name}"? This will permanently remove the
							project and all associated evaluations. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
