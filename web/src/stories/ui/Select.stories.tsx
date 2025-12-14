import type { Meta, StoryObj } from "@storybook/react"
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
	SelectSeparator,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const meta: Meta<typeof Select> = {
	title: "UI/Select",
	component: Select,
	tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Select>

export const Default: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="orange">Orange</SelectItem>
				<SelectItem value="grape">Grape</SelectItem>
			</SelectContent>
		</Select>
	),
}

export const WithGroups: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-[280px]">
				<SelectValue placeholder="Select a timezone" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>North America</SelectLabel>
					<SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
					<SelectItem value="cst">Central Standard Time (CST)</SelectItem>
					<SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Europe</SelectLabel>
					<SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
					<SelectItem value="cet">Central European Time (CET)</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
}

export const WithLabel: Story = {
	render: () => (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<Label htmlFor="framework">Framework</Label>
			<Select>
				<SelectTrigger id="framework">
					<SelectValue placeholder="Select a framework" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="react">React</SelectItem>
					<SelectItem value="vue">Vue</SelectItem>
					<SelectItem value="angular">Angular</SelectItem>
					<SelectItem value="svelte">Svelte</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
}

export const Disabled: Story = {
	render: () => (
		<Select disabled>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Select option" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="1">Option 1</SelectItem>
				<SelectItem value="2">Option 2</SelectItem>
			</SelectContent>
		</Select>
	),
}

export const WithDisabledItem: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Select status" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="active">Active</SelectItem>
				<SelectItem value="inactive">Inactive</SelectItem>
				<SelectItem value="deprecated" disabled>
					Deprecated
				</SelectItem>
			</SelectContent>
		</Select>
	),
}
