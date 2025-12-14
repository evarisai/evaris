import type { Meta, StoryObj } from "@storybook/react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const meta: Meta<typeof Input> = {
	title: "UI/Input",
	component: Input,
	tags: ["autodocs"],
	argTypes: {
		type: {
			control: "select",
			options: ["text", "email", "password", "number", "search", "tel", "url"],
		},
		disabled: {
			control: "boolean",
		},
	},
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
	args: {
		type: "text",
		placeholder: "Enter text...",
	},
}

export const Email: Story = {
	args: {
		type: "email",
		placeholder: "Email address",
	},
}

export const Password: Story = {
	args: {
		type: "password",
		placeholder: "Password",
	},
}

export const NumberInput: Story = {
	args: {
		type: "number",
		placeholder: "0",
	},
}

export const Search: Story = {
	args: {
		type: "search",
		placeholder: "Search...",
	},
}

export const Disabled: Story = {
	args: {
		disabled: true,
		placeholder: "Disabled input",
	},
}

export const WithValue: Story = {
	args: {
		defaultValue: "Pre-filled value",
	},
}

export const WithLabel: Story = {
	render: () => (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<Label htmlFor="email">Email</Label>
			<Input type="email" id="email" placeholder="Email" />
		</div>
	),
}

export const File: Story = {
	render: () => (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<Label htmlFor="picture">Picture</Label>
			<Input id="picture" type="file" />
		</div>
	),
}
