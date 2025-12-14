import type { Meta, StoryObj } from "@storybook/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const meta: Meta<typeof Popover> = {
	title: "UI/Popover",
	component: Popover,
	tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Popover>

export const Default: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Open Popover</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none">Dimensions</h4>
						<p className="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
					</div>
					<div className="grid gap-2">
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="width">Width</Label>
							<Input id="width" defaultValue="100%" className="col-span-2 h-8" />
						</div>
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="height">Height</Label>
							<Input id="height" defaultValue="25px" className="col-span-2 h-8" />
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
}

export const WithForm: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button>Update Settings</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none">Settings</h4>
						<p className="text-sm text-muted-foreground">Configure your preferences.</p>
					</div>
					<div className="grid gap-2">
						<div className="grid gap-1">
							<Label htmlFor="name">Name</Label>
							<Input id="name" placeholder="Enter name" />
						</div>
						<div className="grid gap-1">
							<Label htmlFor="email">Email</Label>
							<Input id="email" type="email" placeholder="Enter email" />
						</div>
						<Button className="mt-2">Save</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
}

export const SimpleContent: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Info</Button>
			</PopoverTrigger>
			<PopoverContent>
				<p className="text-sm">This is some informational content in a popover.</p>
			</PopoverContent>
		</Popover>
	),
}
