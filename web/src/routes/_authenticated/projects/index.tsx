import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus, Search } from "lucide-react"
import { useState } from "react"
import { CreateDialog } from "@/components/dashboard/CreateDialog"
import { EditDialog } from "@/components/dashboard/EditDialog"
import { ProjectCard } from "@/components/dashboard/ProjectCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/_authenticated/projects/")({
	component: Projects,
})

interface EditingProject {
	id: string
	name: string
	description: string
}

function Projects() {
	const [search, setSearch] = useState("")
	const [createOpen, setCreateOpen] = useState(false)
	const [editingProject, setEditingProject] = useState<EditingProject | null>(null)
	const { toast } = useToast()
	const navigate = useNavigate()
	const utils = trpc.useUtils()

	const { data: projectsData, isLoading } = trpc.projects.list.useQuery()

	const createProjectMutation = trpc.projects.create.useMutation({
		onMutate: async (newProject) => {
			// Cancel outgoing refetches
			await utils.projects.list.cancel()
			// Snapshot the previous value
			const previousProjects = utils.projects.list.getData()
			// Optimistically add new project
			utils.projects.list.setData(undefined, (old) => {
				if (!old) return old
				const optimisticProject = {
					id: `temp-${Date.now()}`,
					name: newProject.name,
					description: newProject.description ?? null,
					organizationId: "",
					createdById: null,
					modes: ["EVALS" as const],
					settings: {},
					createdAt: new Date(),
					updatedAt: new Date(),
					_count: { evals: 0, datasets: 0 },
				}
				return [optimisticProject, ...old]
			})
			return { previousProjects }
		},
		onSuccess: (createdProject) => {
			// Replace the temp item with the real one immediately
			utils.projects.list.setData(undefined, (old) => {
				if (!old) return old
				return old.map((p) =>
					p.id.startsWith("temp-") ? { ...createdProject, _count: { evals: 0, datasets: 0 } } : p
				)
			})
		},
		onError: (_err, _newProject, context) => {
			// Roll back on error
			if (context?.previousProjects) {
				utils.projects.list.setData(undefined, context.previousProjects)
			}
		},
		onSettled: () => {
			// Refetch to sync with server (in background)
			utils.projects.list.invalidate()
		},
	})

	const updateProjectMutation = trpc.projects.update.useMutation({
		onMutate: async (updatedProject) => {
			await utils.projects.list.cancel()
			const previousProjects = utils.projects.list.getData()
			utils.projects.list.setData(undefined, (old) => {
				if (!old) return old
				return old.map((p) =>
					p.id === updatedProject.id
						? {
								...p,
								name: updatedProject.name ?? p.name,
								description: updatedProject.description ?? p.description,
							}
						: p
				)
			})
			return { previousProjects }
		},
		onError: (_err, _updatedProject, context) => {
			if (context?.previousProjects) {
				utils.projects.list.setData(undefined, context.previousProjects)
			}
		},
		onSettled: () => {
			utils.projects.list.invalidate()
		},
	})

	const deleteProjectMutation = trpc.projects.delete.useMutation({
		onMutate: async (deletedProject) => {
			await utils.projects.list.cancel()
			const previousProjects = utils.projects.list.getData()
			utils.projects.list.setData(undefined, (old) => {
				if (!old) return old
				return old.filter((p) => p.id !== deletedProject.id)
			})
			return { previousProjects }
		},
		onError: (_err, _deletedProject, context) => {
			if (context?.previousProjects) {
				utils.projects.list.setData(undefined, context.previousProjects)
			}
		},
		onSettled: () => {
			utils.projects.list.invalidate()
		},
	})

	const projects = projectsData || []

	const filteredProjects = projects.filter(
		(p) =>
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			(p.description?.toLowerCase() || "").includes(search.toLowerCase())
	)

	const handleCreate = (data: { name: string; description: string }) => {
		// Fire and forget - dialog closes immediately via CreateDialog
		// Toast notifications provide feedback
		createProjectMutation.mutate(data, {
			onSuccess: () => {
				toast({
					title: "Project created",
					description: `${data.name} has been created successfully.`,
				})
			},
			onError: (error) => {
				toast({
					title: "Failed to create project",
					description: error.message,
					variant: "destructive",
				})
			},
		})
	}

	const handleDelete = (id: string) => {
		deleteProjectMutation.mutate(
			{ id },
			{
				onSuccess: () => {
					toast({
						title: "Project deleted",
						description: "The project has been removed.",
					})
				},
				onError: (error) => {
					toast({
						title: "Error",
						description: error.message,
						variant: "destructive",
					})
				},
			}
		)
	}

	const handleEdit = (id: string) => {
		const project = projects.find((p) => p.id === id)
		if (project) {
			setEditingProject({
				id: project.id,
				name: project.name,
				description: project.description ?? "",
			})
		}
	}

	const handleEditSubmit = (data: { name: string; description: string }) => {
		if (!editingProject) return
		const projectId = editingProject.id
		// Fire and forget - dialog closes immediately via EditDialog
		updateProjectMutation.mutate(
			{ id: projectId, ...data },
			{
				onSuccess: () => {
					toast({
						title: "Project updated",
						description: `${data.name} has been updated successfully.`,
					})
				},
				onError: (error) => {
					toast({
						title: "Failed to update project",
						description: error.message,
						variant: "destructive",
					})
				},
			}
		)
	}

	return (
		<div className="space-y-8">
			<div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in-up">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
					<p className="text-muted-foreground mt-1.5">Manage your evaluation projects</p>
				</div>
				<Button
					onClick={() => setCreateOpen(true)}
					data-testid="button-create-project"
					className="h-10"
				>
					<Plus className="h-4 w-4 mr-2" />
					New Project
				</Button>
			</div>

			<div className="relative max-w-md animate-fade-in-up" style={{ animationDelay: "50ms" }}>
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search projects..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9 h-10 bg-card border-card-border"
					data-testid="input-search-projects"
				/>
			</div>

			{isLoading ? (
				<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
					{["a", "b", "c", "d", "e", "f"].map((id) => (
						<div key={id} className="rounded-xl border bg-card p-5 space-y-4">
							<div className="flex items-start justify-between">
								<div className="space-y-2 flex-1">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-4 w-48" />
								</div>
								<Skeleton className="h-8 w-8 rounded-md" />
							</div>
							<div className="flex gap-4">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-24" />
							</div>
						</div>
					))}
				</div>
			) : filteredProjects.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
					<div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
						<Search className="h-8 w-8 text-muted-foreground/50" />
					</div>
					<p className="text-muted-foreground mb-4">No projects found</p>
					<Button onClick={() => setCreateOpen(true)} variant="outline" className="h-10">
						<Plus className="h-4 w-4 mr-2" />
						Create your first project
					</Button>
				</div>
			) : (
				<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
					{filteredProjects.map((project, index) => (
						<div
							key={project.id}
							className="animate-fade-in-up"
							style={{ animationDelay: `${100 + index * 50}ms` }}
						>
							<ProjectCard
								id={project.id}
								name={project.name}
								description={project.description ?? ""}
								lastRun={
									project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "Never"
								}
								evalCount={project._count?.evals || 0}
								tags={[]}
								isCreating={project.id.startsWith("temp-")}
								onRun={(id) => navigate({ to: "/projects/$projectId", params: { projectId: id } })}
								onEdit={handleEdit}
								onSettings={(id) =>
									navigate({ to: "/projects/$projectId", params: { projectId: id } })
								}
								onDelete={handleDelete}
							/>
						</div>
					))}
				</div>
			)}

			<CreateDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				title="Create New Project"
				description="Add a new project to organize your evaluation runs."
				onSubmit={handleCreate}
				namePlaceholder="My Project"
				descriptionPlaceholder="Describe your project..."
			/>

			<EditDialog
				open={!!editingProject}
				onOpenChange={(open) => !open && setEditingProject(null)}
				title="Edit Project"
				description="Update your project details."
				onSubmit={handleEditSubmit}
				initialName={editingProject?.name ?? ""}
				initialDescription={editingProject?.description ?? ""}
				namePlaceholder="My Project"
				descriptionPlaceholder="Describe your project..."
			/>
		</div>
	)
}
