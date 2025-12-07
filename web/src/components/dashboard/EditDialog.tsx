import { useEffect, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"

interface EditDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	onSubmit: (data: { name: string; description: string }) => void
	initialName?: string
	initialDescription?: string
	namePlaceholder?: string
	descriptionPlaceholder?: string
	isLoading?: boolean
}

export function EditDialog({
	open,
	onOpenChange,
	title,
	description,
	onSubmit,
	initialName = "",
	initialDescription = "",
	namePlaceholder = "Enter name",
	descriptionPlaceholder = "Enter description",
	isLoading = false,
}: EditDialogProps) {
	const [name, setName] = useState(initialName)
	const [desc, setDesc] = useState(initialDescription)

	// Reset form when dialog opens with new initial values
	useEffect(() => {
		if (open) {
			setName(initialName)
			setDesc(initialDescription)
		}
	}, [open, initialName, initialDescription])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (name.trim()) {
			onSubmit({ name: name.trim(), description: desc.trim() })
		}
	}

	const hasChanges = name !== initialName || desc !== initialDescription

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="edit-name">Name</Label>
							<Input
								id="edit-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={namePlaceholder}
								data-testid="input-edit-name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-description">Description</Label>
							<Textarea
								id="edit-description"
								value={desc}
								onChange={(e) => setDesc(e.target.value)}
								placeholder={descriptionPlaceholder}
								rows={3}
								data-testid="input-edit-description"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							data-testid="button-cancel-edit"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!name.trim() || !hasChanges || isLoading}
							data-testid="button-submit-edit"
						>
							{isLoading ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
