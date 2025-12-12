import { createFileRoute, Link } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import {
	ArrowLeft,
	Loader2,
	Upload,
	File,
	FileJson,
	FileSpreadsheet,
	Trash2,
	Download,
	Edit3,
	MoreHorizontal,
	Database,
	Clock,
	User,
	HardDrive,
	Layers,
	Save,
} from "lucide-react"
import { useState, useRef } from "react"
import Editor from "@monaco-editor/react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/datasets/$datasetId")({
	component: DatasetDetailPage,
})

interface DatasetFile {
	id: string
	name: string
	format: string
	itemCount: number
	filePath: string
	fileSize: number
	mimeType: string | null
	createdAt: Date
	updatedAt: Date
	uploadedBy: {
		id: string
		name: string
		email: string
		image: string | null
	} | null
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B"
	const k = 1024
	const sizes = ["B", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function getFileIcon(format: string) {
	switch (format) {
		case "JSON":
		case "JSONL":
			return <FileJson className="h-4 w-4" />
		case "CSV":
			return <FileSpreadsheet className="h-4 w-4" />
		default:
			return <File className="h-4 w-4" />
	}
}

function DatasetDetailPage() {
	const { datasetId } = Route.useParams()
	const { toast } = useToast()
	const [uploadOpen, setUploadOpen] = useState(false)
	const [editorOpen, setEditorOpen] = useState(false)
	const [selectedFile, setSelectedFile] = useState<DatasetFile | null>(null)
	const [fileContent, setFileContent] = useState<string>("")
	const [loadingContent, setLoadingContent] = useState(false)
	const [isDragging, setIsDragging] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [uploadFile, setUploadFile] = useState<File | null>(null)
	const [editedContent, setEditedContent] = useState<string>("")
	const [hasChanges, setHasChanges] = useState(false)
	const [saving, setSaving] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const { data, isLoading, error, refetch } = trpc.datasets.getById.useQuery({
		id: datasetId,
	})

	const deleteFile = trpc.datasets.deleteFile.useMutation({
		onSuccess: () => {
			toast({ title: "File deleted", description: "The file has been removed." })
			refetch()
		},
		onError: (err) => {
			toast({ title: "Error", description: err.message, variant: "destructive" })
		},
	})

	const validateAndSetFile = (file: File) => {
		const validTypes = [".json", ".jsonl", ".csv", ".ndjson"]
		const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
		if (!validTypes.includes(ext)) {
			toast({
				title: "Invalid file type",
				description: "Please select a JSON, JSONL, CSV, or NDJSON file.",
				variant: "destructive",
			})
			return false
		}
		if (file.size > 100 * 1024 * 1024) {
			toast({
				title: "File too large",
				description: "Maximum file size is 100MB.",
				variant: "destructive",
			})
			return false
		}
		setUploadFile(file)
		return true
	}

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
	}

	const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		if (e.currentTarget.contains(e.relatedTarget as Node)) return
		setIsDragging(false)
	}

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)
		const file = e.dataTransfer.files?.[0]
		if (file) validateAndSetFile(file)
	}

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) validateAndSetFile(file)
	}

	const handleUpload = async () => {
		if (!uploadFile) return

		setUploading(true)
		setUploadProgress(10)

		try {
			const formData = new FormData()
			formData.append("file", uploadFile)

			setUploadProgress(30)

			const response = await fetch(`/api/datasets/upload?datasetId=${datasetId}`, {
				method: "POST",
				body: formData,
			})

			setUploadProgress(80)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || "Upload failed")
			}

			setUploadProgress(100)

			toast({
				title: "File uploaded",
				description: `${result.itemCount} items loaded from ${uploadFile.name}`,
			})

			setUploadOpen(false)
			setUploadFile(null)
			refetch()
		} catch (err) {
			toast({
				title: "Upload failed",
				description: err instanceof Error ? err.message : "Unknown error",
				variant: "destructive",
			})
		} finally {
			setUploading(false)
			setUploadProgress(0)
		}
	}

	const handleOpenEditor = async (file: DatasetFile) => {
		setSelectedFile(file)
		setEditorOpen(true)
		setLoadingContent(true)
		setHasChanges(false)

		try {
			const response = await fetch(`/api/datasets/files/${file.id}/content`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || "Failed to load file")
			}

			setFileContent(result.content)
			setEditedContent(result.content)
		} catch (err) {
			toast({
				title: "Error",
				description: err instanceof Error ? err.message : "Failed to load file content",
				variant: "destructive",
			})
			setEditorOpen(false)
		} finally {
			setLoadingContent(false)
		}
	}

	const handleEditorChange = (value: string | undefined) => {
		if (value !== undefined) {
			setEditedContent(value)
			setHasChanges(value !== fileContent)
		}
	}

	const handleSaveFile = async () => {
		if (!selectedFile || !hasChanges) return

		setSaving(true)
		try {
			const response = await fetch(`/api/datasets/files/${selectedFile.id}/content`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: editedContent }),
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || "Failed to save file")
			}

			setFileContent(editedContent)
			setHasChanges(false)
			toast({
				title: "File saved",
				description: `${selectedFile.name} has been updated.`,
			})
			refetch()
		} catch (err) {
			toast({
				title: "Save failed",
				description: err instanceof Error ? err.message : "Unknown error",
				variant: "destructive",
			})
		} finally {
			setSaving(false)
		}
	}

	const handleDownload = async (file: DatasetFile) => {
		try {
			const response = await fetch(`/api/datasets/files/${file.id}/download`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || "Download failed")
			}

			window.open(result.downloadUrl, "_blank")
		} catch (err) {
			toast({
				title: "Download failed",
				description: err instanceof Error ? err.message : "Unknown error",
				variant: "destructive",
			})
		}
	}

	const handleDeleteFile = (file: DatasetFile) => {
		deleteFile.mutate({ fileId: file.id })
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-muted-foreground">Loading dataset...</p>
				</div>
			</div>
		)
	}

	if (error || !data) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Card className="max-w-md">
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-4 text-center">
							<Database className="h-12 w-12 text-destructive" />
							<div>
								<h2 className="text-lg font-semibold">Dataset Not Found</h2>
								<p className="text-muted-foreground mt-1">
									{error?.message || "The requested dataset could not be found."}
								</p>
							</div>
							<Link to="/datasets">
								<Button variant="outline">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Datasets
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	const files = (data.files || []) as DatasetFile[]

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Back Navigation */}
			<Link
				to="/datasets"
				className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Datasets
			</Link>

			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
							<Database className="h-5 w-5 text-violet-600" />
						</div>
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
							{data.description && (
								<p className="text-muted-foreground text-sm">{data.description}</p>
							)}
						</div>
					</div>
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<span>{data.project?.name}</span>
						<span className="text-border">|</span>
						<span>
							Created {formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
						</span>
					</div>
				</div>

				<Button onClick={() => setUploadOpen(true)} className="shrink-0">
					<Upload className="h-4 w-4 mr-2" />
					Upload File
				</Button>
			</div>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-3">
				<Card className="bg-gradient-to-br from-violet-500/5 to-transparent border-violet-500/20">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Total Files</p>
								<p className="text-2xl font-semibold">{data.fileCount}</p>
							</div>
							<div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center">
								<Layers className="h-5 w-5 text-violet-600" />
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Total Items</p>
								<p className="text-2xl font-semibold">{data.totalItems.toLocaleString()}</p>
							</div>
							<div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
								<Database className="h-5 w-5 text-emerald-600" />
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Total Size</p>
								<p className="text-2xl font-semibold">
									{formatBytes(files.reduce((sum, f) => sum + f.fileSize, 0))}
								</p>
							</div>
							<div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
								<HardDrive className="h-5 w-5 text-amber-600" />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Files Table */}
			<Card>
				<CardHeader className="pb-4">
					<CardTitle className="text-lg">Files</CardTitle>
				</CardHeader>
				<CardContent>
					{files.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
								<Upload className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="font-medium mb-1">No files uploaded</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Upload your first file to get started with evaluations
							</p>
							<Button onClick={() => setUploadOpen(true)} variant="outline">
								<Upload className="h-4 w-4 mr-2" />
								Upload File
							</Button>
						</div>
					) : (
						<div className="rounded-lg border overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="font-semibold">Name</TableHead>
										<TableHead className="font-semibold">Format</TableHead>
										<TableHead className="font-semibold text-right">Items</TableHead>
										<TableHead className="font-semibold text-right">Size</TableHead>
										<TableHead className="font-semibold">Uploaded By</TableHead>
										<TableHead className="font-semibold">Uploaded</TableHead>
										<TableHead className="font-semibold">Storage Path</TableHead>
										<TableHead className="w-[50px]"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{files.map((file) => (
										<TableRow
											key={file.id}
											className="cursor-pointer hover:bg-muted/30 transition-colors"
											onClick={() => handleOpenEditor(file)}
										>
											<TableCell>
												<div className="flex items-center gap-2">
													<div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
														{getFileIcon(file.format)}
													</div>
													<span className="font-medium truncate max-w-[200px]">{file.name}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="text-xs">
													{file.format}
												</Badge>
											</TableCell>
											<TableCell className="text-right font-mono text-sm">
												{file.itemCount.toLocaleString()}
											</TableCell>
											<TableCell className="text-right font-mono text-sm text-muted-foreground">
												{formatBytes(file.fileSize)}
											</TableCell>
											<TableCell>
												{file.uploadedBy ? (
													<div className="flex items-center gap-2">
														<div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
															<User className="h-3 w-3 text-primary" />
														</div>
														<span className="text-sm truncate max-w-[120px]">
															{file.uploadedBy.name || file.uploadedBy.email}
														</span>
													</div>
												) : (
													<span className="text-muted-foreground text-sm">-</span>
												)}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1 text-sm text-muted-foreground">
													<Clock className="h-3 w-3" />
													{formatDistanceToNow(new Date(file.createdAt), {
														addSuffix: true,
													})}
												</div>
											</TableCell>
											<TableCell>
												<code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[180px] block">
													{file.filePath}
												</code>
											</TableCell>
											<TableCell onClick={(e) => e.stopPropagation()}>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button size="icon" variant="ghost">
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => handleOpenEditor(file)}>
															<Edit3 className="mr-2 h-4 w-4" />
															View / Edit
														</DropdownMenuItem>
														<DropdownMenuItem onClick={() => handleDownload(file)}>
															<Download className="mr-2 h-4 w-4" />
															Download
														</DropdownMenuItem>
														<DropdownMenuSeparator />
														<DropdownMenuItem
															onClick={() => handleDeleteFile(file)}
															className="text-destructive"
														>
															<Trash2 className="mr-2 h-4 w-4" />
															Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Upload Dialog */}
			<Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Upload Dataset File</DialogTitle>
						<DialogDescription>
							Upload a JSONL, JSON, or CSV file containing your test cases.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="space-y-2">
							<Label>File</Label>
							<div
								className={cn(
									"relative rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200",
									isDragging
										? "border-primary bg-primary/10 scale-[1.02]"
										: uploadFile
											? "border-primary/50 bg-primary/5"
											: "border-border bg-muted/30 hover:border-muted-foreground/30"
								)}
								onClick={() => fileInputRef.current?.click()}
								onDragOver={handleDragOver}
								onDragEnter={handleDragEnter}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							>
								<input
									ref={fileInputRef}
									type="file"
									accept=".json,.jsonl,.csv,.ndjson"
									onChange={handleFileSelect}
									className="hidden"
								/>
								{uploadFile ? (
									<div className="space-y-2">
										<div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
											<File className="h-6 w-6 text-primary" />
										</div>
										<p className="font-medium">{uploadFile.name}</p>
										<p className="text-sm text-muted-foreground">{formatBytes(uploadFile.size)}</p>
									</div>
								) : isDragging ? (
									<div className="space-y-2">
										<div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
											<Upload className="h-6 w-6 text-primary" />
										</div>
										<p className="font-medium text-primary">Drop file here</p>
									</div>
								) : (
									<div className="space-y-2">
										<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
											<Upload className="h-6 w-6 text-muted-foreground" />
										</div>
										<p className="text-muted-foreground">Drag and drop or click to select</p>
										<p className="text-xs text-muted-foreground">
											JSONL, JSON, CSV, or NDJSON (max 100MB)
										</p>
									</div>
								)}
							</div>
						</div>

						{uploading && (
							<div className="space-y-2">
								<Progress value={uploadProgress} />
								<p className="text-sm text-center text-muted-foreground">
									Uploading... {uploadProgress}%
								</p>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setUploadOpen(false)}
							disabled={uploading}
						>
							Cancel
						</Button>
						<Button onClick={handleUpload} disabled={!uploadFile || uploading}>
							{uploading ? "Uploading..." : "Upload File"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* File Editor Dialog */}
			<Dialog open={editorOpen} onOpenChange={setEditorOpen}>
				<DialogContent className="max-w-[90vw] h-[85vh] flex flex-col">
					<DialogHeader className="shrink-0">
						<div className="flex items-center justify-between pr-8">
							<div className="flex items-center gap-3">
								<div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
									{selectedFile && getFileIcon(selectedFile.format)}
								</div>
								<div>
									<DialogTitle className="text-base">{selectedFile?.name}</DialogTitle>
									<DialogDescription className="text-xs">
										{selectedFile && (
											<>
												{selectedFile.itemCount.toLocaleString()} items
												<span className="mx-2">|</span>
												{formatBytes(selectedFile.fileSize)}
												<span className="mx-2">|</span>
												<code className="bg-muted px-1 rounded">{selectedFile.filePath}</code>
											</>
										)}
									</DialogDescription>
								</div>
							</div>
							{selectedFile && (
								<div className="flex items-center gap-2">
									<Button
										size="sm"
										variant={hasChanges ? "default" : "outline"}
										onClick={handleSaveFile}
										disabled={!hasChanges || saving}
									>
										{saving ? (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										) : (
											<Save className="h-4 w-4 mr-2" />
										)}
										{saving ? "Saving..." : "Save"}
									</Button>
									<Button size="sm" variant="outline" onClick={() => handleDownload(selectedFile)}>
										<Download className="h-4 w-4 mr-2" />
										Download
									</Button>
								</div>
							)}
						</div>
					</DialogHeader>
					<div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-[#1e1e1e]">
						{loadingContent ? (
							<div className="flex items-center justify-center h-full">
								<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
							</div>
						) : (
							<Editor
								height="100%"
								defaultLanguage="json"
								value={editedContent}
								onChange={handleEditorChange}
								theme="vs-dark"
								options={{
									readOnly: false,
									minimap: { enabled: true },
									fontSize: 13,
									lineNumbers: "on",
									wordWrap: "on",
									scrollBeyondLastLine: false,
									automaticLayout: true,
									padding: { top: 16, bottom: 16 },
								}}
							/>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
