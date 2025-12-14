import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { AlertCircle, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { EvalsTable } from "@/components/dashboard/EvalsTable"
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
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/_authenticated/evals/")({
	component: Evals,
})

interface EditingEval {
	id: string
	name: string
}

function Evals() {
	const navigate = useNavigate()
	const [runDialogOpen, setRunDialogOpen] = useState(false)
	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [editingEval, setEditingEval] = useState<EditingEval | null>(null)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [deletingEvalId, setDeletingEvalId] = useState<string | null>(null)
	const [evalName, setEvalName] = useState("")
	const [editEvalName, setEditEvalName] = useState("")
	const [selectedProject, setSelectedProject] = useState("")
	const [selectedDataset, setSelectedDataset] = useState("")
	const { toast } = useToast()
	const utils = trpc.useUtils()

	const { data: evalsData, isLoading: evalsLoading } = trpc.evals.list.useQuery()

	const { data: projects } = trpc.projects.list.useQuery()

	const { data: datasetsData } = trpc.datasets.list.useQuery(
		selectedProject ? { projectId: selectedProject } : undefined,
		{ enabled: !!selectedProject }
	)

	// Reset form when dialogs close
	useEffect(() => {
		if (!runDialogOpen) {
			setEvalName("")
			setSelectedProject("")
			setSelectedDataset("")
		}
	}, [runDialogOpen])

	useEffect(() => {
		if (!editDialogOpen) {
			setEditingEval(null)
			setEditEvalName("")
		}
	}, [editDialogOpen])

	const createEval = trpc.evals.create.useMutation({
		onMutate: async (newEval) => {
			await utils.evals.list.cancel()
			const previousData = utils.evals.list.getData()
			const projectName = projects?.find((p) => p.id === newEval.projectId)?.name ?? "Project"
			const datasetName = datasetsData?.datasets.find((d) => d.id === newEval.datasetId)?.name
			utils.evals.list.setData(undefined, (old) => {
				if (!old) return old
				const optimisticEval = {
					id: `temp-${Date.now()}`,
					name: newEval.name,
					status: "PENDING" as const,
					total: null,
					passed: null,
					failed: null,
					accuracy: null,
					summary: null,
					error: null,
					metadata: {},
					progress: 0,
					startedAt: null,
					completedAt: null,
					durationMs: null,
					totalCost: null,
					createdAt: new Date(),
					updatedAt: new Date(),
					organizationId: "",
					createdById: null,
					projectId: newEval.projectId,
					experimentId: null,
					baselineEvalId: null,
					datasetId: newEval.datasetId ?? null,
					project: { name: projectName },
					dataset: datasetName ? { name: datasetName } : null,
				}
				return { ...old, evals: [optimisticEval, ...old.evals], total: old.total + 1 }
			})
			return { previousData }
		},
		onSuccess: (_data, variables) => {
			toast({
				title: "Evaluation created",
				description: `${variables.name} has been created successfully.`,
			})
		},
		onError: (error, _newEval, context) => {
			if (context?.previousData) {
				utils.evals.list.setData(undefined, context.previousData)
			}
			toast({
				title: "Failed to create evaluation",
				description: error.message,
				variant: "destructive",
			})
		},
		onSettled: () => {
			utils.evals.list.invalidate()
		},
	})

	const updateEval = trpc.evals.update.useMutation({
		onMutate: async (updatedEval) => {
			await utils.evals.list.cancel()
			const previousData = utils.evals.list.getData()
			utils.evals.list.setData(undefined, (old) => {
				if (!old) return old
				return {
					...old,
					evals: old.evals.map((e) =>
						e.id === updatedEval.id ? { ...e, name: updatedEval.name ?? e.name } : e
					),
				}
			})
			return { previousData }
		},
		onSuccess: () => {
			toast({
				title: "Evaluation updated",
				description: "The evaluation has been updated successfully.",
			})
		},
		onError: (error, _updatedEval, context) => {
			if (context?.previousData) {
				utils.evals.list.setData(undefined, context.previousData)
			}
			toast({
				title: "Failed to update evaluation",
				description: error.message,
				variant: "destructive",
			})
		},
		onSettled: () => {
			utils.evals.list.invalidate()
		},
	})

	const deleteEval = trpc.evals.delete.useMutation({
		onMutate: async (deletedEval) => {
			await utils.evals.list.cancel()
			const previousData = utils.evals.list.getData()
			utils.evals.list.setData(undefined, (old) => {
				if (!old) return old
				return {
					...old,
					evals: old.evals.filter((e) => e.id !== deletedEval.id),
					total: old.total - 1,
				}
			})
			return { previousData }
		},
		onSuccess: () => {
			toast({
				title: "Evaluation deleted",
				description: "The evaluation has been deleted.",
			})
		},
		onError: (error, _deletedEval, context) => {
			if (context?.previousData) {
				utils.evals.list.setData(undefined, context.previousData)
			}
			toast({
				title: "Failed to delete evaluation",
				description: error.message,
				variant: "destructive",
			})
		},
		onSettled: () => {
			utils.evals.list.invalidate()
		},
	})

	const handleRunEval = () => {
		if (evalName && selectedProject && selectedDataset) {
			// Fire and forget - close dialog immediately
			createEval.mutate({
				name: evalName,
				projectId: selectedProject,
				datasetId: selectedDataset,
			})
			setRunDialogOpen(false)
		}
	}

	const handleEdit = (id: string) => {
		const evalItem = evalsData?.evals.find((e) => e.id === id)
		if (evalItem) {
			setEditingEval({ id: evalItem.id, name: evalItem.name })
			setEditEvalName(evalItem.name)
			setEditDialogOpen(true)
		}
	}

	const handleEditSubmit = () => {
		if (editingEval && editEvalName) {
			// Fire and forget - close dialog immediately
			updateEval.mutate({ id: editingEval.id, name: editEvalName })
			setEditDialogOpen(false)
		}
	}

	const handleDelete = (id: string) => {
		setDeletingEvalId(id)
		setDeleteDialogOpen(true)
	}

	const handleDeleteConfirm = () => {
		if (deletingEvalId) {
			// Fire and forget - close dialog immediately
			deleteEval.mutate({ id: deletingEvalId })
			setDeleteDialogOpen(false)
			setDeletingEvalId(null)
		}
	}

	const tableData =
		evalsData?.evals.map((evalItem) => ({
			id: evalItem.id,
			name: evalItem.name,
			project: evalItem.project?.name || "Unknown",
			dataset: evalItem.dataset?.name || "-",
			status: evalItem.status.toLowerCase() as "pending" | "running" | "passed" | "failed",
			total: evalItem.total ?? null,
			passed: evalItem.passed ?? null,
			failed: evalItem.failed ?? null,
			accuracy: evalItem.accuracy ?? null,
			timestamp: formatDistanceToNow(new Date(evalItem.createdAt), { addSuffix: true }),
		})) || []

	if (evalsLoading) {
		return (
			<div className="space-y-6">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-semibold">Evaluations</h1>
						<p className="text-muted-foreground mt-1">View and manage all evaluation runs</p>
					</div>
					<Skeleton className="h-10 w-28" />
				</div>
				<div className="rounded-lg border">
					<div className="p-4 border-b">
						<div className="flex gap-4">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-5 w-20" />
						</div>
					</div>
					{["a", "b", "c", "d", "e"].map((id) => (
						<div key={id} className="p-4 border-b last:border-b-0">
							<div className="flex items-center gap-4">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-5 w-24" />
								<Skeleton className="h-5 w-20 rounded-full" />
								<Skeleton className="h-5 w-16" />
								<Skeleton className="h-5 w-24" />
								<Skeleton className="h-8 w-8 ml-auto rounded-md" />
							</div>
						</div>
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-semibold">Evaluations</h1>
					<p className="text-muted-foreground mt-1">View and manage all evaluation runs</p>
				</div>
				<Button onClick={() => setRunDialogOpen(true)} data-testid="button-run-eval">
					<Plus className="h-4 w-4 mr-2" />
					Run Eval
				</Button>
			</div>

			{tableData.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
					<AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
					<h3 className="text-lg font-medium mb-2">No evaluations yet</h3>
					<p className="text-muted-foreground mb-4">Run your first evaluation to get started</p>
					<Button onClick={() => setRunDialogOpen(true)} variant="outline">
						<Plus className="h-4 w-4 mr-2" />
						Run Eval
					</Button>
				</div>
			) : (
				<EvalsTable
					data={tableData}
					onViewDetails={(id) => navigate({ to: "/evals/$evalId", params: { evalId: id } })}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onRerun={(id) => {
						toast({
							title: "Re-running evaluation",
							description: `Eval ${id} has been queued for re-run.`,
						})
					}}
				/>
			)}

			<Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Run New Evaluation</DialogTitle>
						<DialogDescription>
							Select a project and dataset to run an evaluation.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="space-y-2">
							<Label>Evaluation Name</Label>
							<Input
								placeholder="My Evaluation"
								value={evalName}
								onChange={(e) => setEvalName(e.target.value)}
								data-testid="input-eval-name"
							/>
						</div>
						<div className="space-y-2">
							<Label>Project</Label>
							<Select
								value={selectedProject}
								onValueChange={(value) => {
									setSelectedProject(value)
									setSelectedDataset("")
								}}
							>
								<SelectTrigger data-testid="select-eval-project">
									<SelectValue placeholder="Select project" />
								</SelectTrigger>
								<SelectContent>
									{projects?.map((project) => (
										<SelectItem key={project.id} value={project.id}>
											{project.name}
										</SelectItem>
									))}
									{(!projects || projects.length === 0) && (
										<SelectItem value="__none__" disabled>
											No projects available
										</SelectItem>
									)}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Dataset</Label>
							<Select
								value={selectedDataset}
								onValueChange={setSelectedDataset}
								disabled={!selectedProject}
							>
								<SelectTrigger data-testid="select-eval-dataset">
									<SelectValue
										placeholder={selectedProject ? "Select dataset" : "Select a project first"}
									/>
								</SelectTrigger>
								<SelectContent>
									{datasetsData?.datasets.map((dataset) => (
										<SelectItem key={dataset.id} value={dataset.id}>
											{dataset.name}
										</SelectItem>
									))}
									{(!datasetsData?.datasets || datasetsData.datasets.length === 0) && (
										<SelectItem value="__none__" disabled>
											No datasets in this project
										</SelectItem>
									)}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setRunDialogOpen(false)}
							data-testid="button-cancel-run"
						>
							Cancel
						</Button>
						<Button
							onClick={handleRunEval}
							disabled={!evalName || !selectedProject || !selectedDataset}
							data-testid="button-start-eval"
						>
							Start Evaluation
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Edit Evaluation</DialogTitle>
						<DialogDescription>Update the evaluation name.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="space-y-2">
							<Label>Evaluation Name</Label>
							<Input
								placeholder="My Evaluation"
								value={editEvalName}
								onChange={(e) => setEditEvalName(e.target.value)}
								data-testid="input-edit-eval-name"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setEditDialogOpen(false)}
							data-testid="button-cancel-edit"
						>
							Cancel
						</Button>
						<Button
							onClick={handleEditSubmit}
							disabled={!editEvalName || editEvalName === editingEval?.name}
							data-testid="button-save-edit"
						>
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Evaluation</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this evaluation? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
