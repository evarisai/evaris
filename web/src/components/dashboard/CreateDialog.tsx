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

interface CreateDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	onSubmit: (data: { name: string; description: string }) => void
	namePlaceholder?: string
	descriptionPlaceholder?: string
}

export function CreateDialog({
	open,
	onOpenChange,
	title,
	description,
	onSubmit,
	namePlaceholder = "Enter name",
	descriptionPlaceholder = "Enter description",
}: CreateDialogProps) {
	const [name, setName] = useState("")
	const [desc, setDesc] = useState("")

	// Reset form when dialog closes
	useEffect(() => {
		if (!open) {
			setName("")
			setDesc("")
		}
	}, [open])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (name.trim()) {
			// Fire and forget: close immediately, let parent handle mutation
			onSubmit({ name: name.trim(), description: desc.trim() })
			onOpenChange(false)
		}
	}

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
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={namePlaceholder}
								data-testid="input-create-name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={desc}
								onChange={(e) => setDesc(e.target.value)}
								placeholder={descriptionPlaceholder}
								rows={3}
								data-testid="input-create-description"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							data-testid="button-cancel-create"
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim()} data-testid="button-submit-create">
							Create
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
