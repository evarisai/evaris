import type { Meta, StoryObj } from "@storybook/react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const meta: Meta<typeof Checkbox> = {
	title: "UI/Checkbox",
	component: Checkbox,
	tags: ["autodocs"],
	argTypes: {
		checked: {
			control: "boolean",
		},
		disabled: {
			control: "boolean",
		},
	},
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Default: Story = {
	args: {},
}

export const Checked: Story = {
	args: {
		defaultChecked: true,
	},
}

export const Disabled: Story = {
	args: {
		disabled: true,
	},
}

export const DisabledChecked: Story = {
	args: {
		disabled: true,
		defaultChecked: true,
	},
}

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms" />
			<Label htmlFor="terms">Accept terms and conditions</Label>
		</div>
	),
}

export const WithDescription: Story = {
	render: () => (
		<div className="items-top flex space-x-2">
			<Checkbox id="terms2" />
			<div className="grid gap-1.5 leading-none">
				<Label htmlFor="terms2">Accept terms and conditions</Label>
				<p className="text-sm text-muted-foreground">
					You agree to our Terms of Service and Privacy Policy.
				</p>
			</div>
		</div>
	),
}

export const MultipleOptions: Story = {
	render: () => (
		<div className="grid gap-4">
			<div className="flex items-center space-x-2">
				<Checkbox id="option1" defaultChecked />
				<Label htmlFor="option1">Email notifications</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox id="option2" />
				<Label htmlFor="option2">Push notifications</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox id="option3" disabled />
				<Label htmlFor="option3">SMS notifications (coming soon)</Label>
			</div>
		</div>
	),
}
