import type { Meta, StoryObj } from "@storybook/react"
import { Badge } from "@/components/ui/badge"

const meta: Meta<typeof Badge> = {
	title: "UI/Badge",
	component: Badge,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "secondary", "destructive", "outline", "success"],
		},
	},
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {
	args: {
		children: "Badge",
	},
}

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Secondary",
	},
}

export const Destructive: Story = {
	args: {
		variant: "destructive",
		children: "Destructive",
	},
}

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Outline",
	},
}

export const Success: Story = {
	args: {
		variant: "success",
		children: "Success",
	},
}

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="default">Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="outline">Outline</Badge>
			<Badge variant="success">Success</Badge>
		</div>
	),
}

export const UseCases: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="default">New</Badge>
			<Badge variant="secondary">Draft</Badge>
			<Badge variant="success">Passed</Badge>
			<Badge variant="destructive">Failed</Badge>
			<Badge variant="outline">v1.0.0</Badge>
		</div>
	),
}
