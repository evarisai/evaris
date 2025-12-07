import { createFileRoute } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { AlertCircle, Plus, Search, Upload } from "lucide-react"
import { useState } from "react"
import { DatasetCard } from "@/components/dashboard/DatasetCard"
import { EditDialog } from "@/components/dashboard/EditDialog"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/_authenticated/datasets")({
	component: Datasets,
})

interface EditingDataset {
	id: string
	name: string
	description: string
}

function Datasets() {
	const [search, setSearch] = useState("")
	const [createOpen, setCreateOpen] = useState(false)
	const [editingDataset, setEditingDataset] = useState<EditingDataset | null>(null)
	const [datasetName, setDatasetName] = useState("")
	const [datasetDescription, setDatasetDescription] = useState("")
	const [selectedProject, setSelectedProject] = useState("")
	const { toast } = useToast()

	// Fetch datasets from the API
	const { data: datasetsData, isLoading, refetch } = trpc.datasets.list.useQuery()

	// Fetch projects for the create dialog
	const { data: projects } = trpc.projects.list.useQuery()

	// Create dataset mutation
	const createDataset = trpc.datasets.create.useMutation({
		onSuccess: () => {
			toast({
				title: "Dataset created",
				description: `${datasetName} has been created successfully.`,
			})
			setCreateOpen(false)
			setDatasetName("")
			setDatasetDescription("")
			setSelectedProject("")
			refetch()
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	// Update dataset mutation
	const updateDataset = trpc.datasets.update.useMutation({
		onSuccess: () => {
			refetch()
		},
	})

	// Delete dataset mutation
	const deleteDataset = trpc.datasets.delete.useMutation({
		onSuccess: () => {
			toast({
				title: "Dataset deleted",
				description: "The dataset has been removed.",
			})
			refetch()
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const handleCreate = () => {
		if (datasetName && selectedProject) {
			createDataset.mutate({
				name: datasetName,
				description: datasetDescription || undefined,
				projectId: selectedProject,
			})
		}
	}

	const handleDelete = (id: string) => {
		deleteDataset.mutate({ id })
	}

	const handleEdit = (id: string) => {
		const dataset = datasets.find((d) => d.id === id)
		if (dataset) {
			setEditingDataset({
				id: dataset.id,
				name: dataset.name,
				description: dataset.description ?? "",
			})
		}
	}

	const handleEditSubmit = (data: { name: string; description: string }) => {
		if (!editingDataset) return
		updateDataset.mutate(
			{ id: editingDataset.id, ...data },
			{
				onSuccess: () => {
					toast({
						title: "Dataset updated",
						description: `${data.name} has been updated successfully.`,
					})
					setEditingDataset(null)
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

	// Transform and filter datasets
	const datasets = datasetsData?.datasets || []
	const filteredDatasets = datasets.filter(
		(d) =>
			d.name.toLowerCase().includes(search.toLowerCase()) ||
			(d.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
	)

	if (isLoading) {
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
					<h1 className="text-3xl font-semibold">Datasets</h1>
					<p className="text-muted-foreground mt-1">Manage your test datasets</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" data-testid="button-upload-dataset">
						<Upload className="h-4 w-4 mr-2" />
						Upload
					</Button>
					<Button onClick={() => setCreateOpen(true)} data-testid="button-create-dataset">
						<Plus className="h-4 w-4 mr-2" />
						New Dataset
					</Button>
				</div>
			</div>

			<div className="relative max-w-md">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search datasets..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9"
					data-testid="input-search-datasets"
				/>
			</div>

			{datasets.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
					<AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
					<h3 className="text-lg font-medium mb-2">No datasets yet</h3>
					<p className="text-muted-foreground mb-4">Create your first dataset to get started</p>
					<Button onClick={() => setCreateOpen(true)} variant="outline">
						<Plus className="h-4 w-4 mr-2" />
						Create your first dataset
					</Button>
				</div>
			) : filteredDatasets.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<p className="text-muted-foreground mb-4">No datasets match your search</p>
					<Button onClick={() => setSearch("")} variant="outline">
						Clear search
					</Button>
				</div>
			) : (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{filteredDatasets.map((dataset) => (
						<DatasetCard
							key={dataset.id}
							id={dataset.id}
							name={dataset.name}
							description={dataset.description || "No description"}
							itemCount={dataset.itemCount}
							format="JSONL"
							updatedAt={formatDistanceToNow(new Date(dataset.updatedAt), { addSuffix: true })}
							onEdit={handleEdit}
							onDownload={(id) => console.log("Download:", id)}
							onDelete={handleDelete}
							onClick={(id) => console.log("Click:", id)}
						/>
					))}
				</div>
			)}

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Create New Dataset</DialogTitle>
						<DialogDescription>Add a new dataset for your evaluations.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="space-y-2">
							<Label>Dataset Name</Label>
							<Input
								placeholder="My Dataset"
								value={datasetName}
								onChange={(e) => setDatasetName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Description</Label>
							<Textarea
								placeholder="Describe your dataset..."
								value={datasetDescription}
								onChange={(e) => setDatasetDescription(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Project</Label>
							<Select value={selectedProject} onValueChange={setSelectedProject}>
								<SelectTrigger>
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
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={!datasetName || !selectedProject || createDataset.isPending}
						>
							{createDataset.isPending ? "Creating..." : "Create Dataset"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<EditDialog
				open={!!editingDataset}
				onOpenChange={(open) => !open && setEditingDataset(null)}
				title="Edit Dataset"
				description="Update your dataset details."
				onSubmit={handleEditSubmit}
				initialName={editingDataset?.name ?? ""}
				initialDescription={editingDataset?.description ?? ""}
				namePlaceholder="My Dataset"
				descriptionPlaceholder="Describe your dataset..."
				isLoading={updateDataset.isPending}
			/>
		</div>
	)
}
