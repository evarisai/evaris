import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { AlertCircle, Plus } from "lucide-react"
import { useState } from "react"
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

	const {
		data: evalsData,
		isLoading: evalsLoading,
		refetch: refetchEvals,
	} = trpc.evals.list.useQuery()

	const { data: projects } = trpc.projects.list.useQuery()

	const { data: datasetsData } = trpc.datasets.list.useQuery(
		selectedProject ? { projectId: selectedProject } : undefined,
		{ enabled: !!selectedProject }
	)

	const createEval = trpc.evals.create.useMutation({
		onSuccess: () => {
			toast({
				title: "Evaluation created",
				description: `${evalName} has been created successfully.`,
			})
			setRunDialogOpen(false)
			setEvalName("")
			setSelectedProject("")
			setSelectedDataset("")
			refetchEvals()
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const updateEval = trpc.evals.update.useMutation({
		onSuccess: () => {
			toast({
				title: "Evaluation updated",
				description: "The evaluation has been updated successfully.",
			})
			setEditDialogOpen(false)
			setEditingEval(null)
			setEditEvalName("")
			refetchEvals()
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const deleteEval = trpc.evals.delete.useMutation({
		onSuccess: () => {
			toast({
				title: "Evaluation deleted",
				description: "The evaluation has been deleted.",
			})
			setDeleteDialogOpen(false)
			setDeletingEvalId(null)
			refetchEvals()
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const handleRunEval = () => {
		if (evalName && selectedProject && selectedDataset) {
			createEval.mutate({
				name: evalName,
				projectId: selectedProject,
				datasetId: selectedDataset,
			})
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
			updateEval.mutate({ id: editingEval.id, name: editEvalName })
		}
	}

	const handleDelete = (id: string) => {
		setDeletingEvalId(id)
		setDeleteDialogOpen(true)
	}

	const handleDeleteConfirm = () => {
		if (deletingEvalId) {
			deleteEval.mutate({ id: deletingEvalId })
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
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
										<SelectItem value="" disabled>
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
										<SelectItem value="" disabled>
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
							disabled={!evalName || !selectedProject || !selectedDataset || createEval.isPending}
							data-testid="button-start-eval"
						>
							{createEval.isPending ? "Creating..." : "Start Evaluation"}
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
							disabled={!editEvalName || editEvalName === editingEval?.name || updateEval.isPending}
							data-testid="button-save-edit"
						>
							{updateEval.isPending ? "Saving..." : "Save Changes"}
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
							{deleteEval.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
