import type { Meta, StoryObj } from "@storybook/react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const meta: Meta<typeof Textarea> = {
	title: "UI/Textarea",
	component: Textarea,
	tags: ["autodocs"],
	argTypes: {
		disabled: {
			control: "boolean",
		},
	},
}

export default meta
type Story = StoryObj<typeof Textarea>

export const Default: Story = {
	args: {
		placeholder: "Type your message here.",
	},
}

export const WithValue: Story = {
	args: {
		defaultValue:
			"This is a textarea with some pre-filled content. You can edit this text as needed.",
	},
}

export const Disabled: Story = {
	args: {
		disabled: true,
		placeholder: "This textarea is disabled",
	},
}

export const WithLabel: Story = {
	render: () => (
		<div className="grid w-full gap-1.5">
			<Label htmlFor="message">Your message</Label>
			<Textarea placeholder="Type your message here." id="message" />
		</div>
	),
}

export const WithDescription: Story = {
	render: () => (
		<div className="grid w-full gap-1.5">
			<Label htmlFor="bio">Bio</Label>
			<Textarea placeholder="Tell us about yourself" id="bio" />
			<p className="text-sm text-muted-foreground">
				Your bio will be displayed on your public profile.
			</p>
		</div>
	),
}

export const LongContent: Story = {
	args: {
		defaultValue: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
		className: "min-h-[150px]",
	},
}
