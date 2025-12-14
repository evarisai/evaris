import type { Meta, StoryObj } from "@storybook/react"
import { Mail, Loader2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const meta: Meta<typeof Button> = {
	title: "UI/Button",
	component: Button,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
		},
		size: {
			control: "select",
			options: ["default", "sm", "lg", "icon"],
		},
		disabled: {
			control: "boolean",
		},
	},
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
	args: {
		children: "Button",
	},
}

export const Destructive: Story = {
	args: {
		variant: "destructive",
		children: "Delete",
	},
}

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Outline",
	},
}

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Secondary",
	},
}

export const Ghost: Story = {
	args: {
		variant: "ghost",
		children: "Ghost",
	},
}

export const Link: Story = {
	args: {
		variant: "link",
		children: "Link",
	},
}

export const Small: Story = {
	args: {
		size: "sm",
		children: "Small",
	},
}

export const Large: Story = {
	args: {
		size: "lg",
		children: "Large",
	},
}

export const Icon: Story = {
	args: {
		size: "icon",
		children: <Mail className="h-4 w-4" />,
	},
}

export const WithIcon: Story = {
	args: {
		children: (
			<>
				<Mail className="h-4 w-4" />
				Login with Email
			</>
		),
	},
}

export const Loading: Story = {
	args: {
		disabled: true,
		children: (
			<>
				<Loader2 className="h-4 w-4 animate-spin" />
				Please wait
			</>
		),
	},
}

export const Disabled: Story = {
	args: {
		disabled: true,
		children: "Disabled",
	},
}

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-4">
			<Button variant="default">Default</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	),
}

export const AllSizes: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-4">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon">
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	),
}
