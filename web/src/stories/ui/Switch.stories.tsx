import type { Meta, StoryObj } from "@storybook/react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const meta: Meta<typeof Switch> = {
	title: "UI/Switch",
	component: Switch,
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
type Story = StoryObj<typeof Switch>

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
			<Switch id="airplane-mode" />
			<Label htmlFor="airplane-mode">Airplane Mode</Label>
		</div>
	),
}

export const SettingsExample: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label htmlFor="marketing">Marketing emails</Label>
					<p className="text-sm text-muted-foreground">
						Receive emails about new products and features.
					</p>
				</div>
				<Switch id="marketing" defaultChecked />
			</div>
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label htmlFor="security">Security emails</Label>
					<p className="text-sm text-muted-foreground">
						Receive emails about your account security.
					</p>
				</div>
				<Switch id="security" defaultChecked disabled />
			</div>
		</div>
	),
}
