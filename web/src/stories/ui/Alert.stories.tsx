import type { Meta, StoryObj } from "@storybook/react"
import { AlertCircle, Terminal, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const meta: Meta<typeof Alert> = {
	title: "UI/Alert",
	component: Alert,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "destructive"],
		},
	},
}

export default meta
type Story = StoryObj<typeof Alert>

export const Default: Story = {
	render: () => (
		<Alert>
			<Terminal className="h-4 w-4" />
			<AlertTitle>Heads up!</AlertTitle>
			<AlertDescription>You can add components to your app using the CLI.</AlertDescription>
		</Alert>
	),
}

export const Destructive: Story = {
	render: () => (
		<Alert variant="destructive">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>Your session has expired. Please log in again.</AlertDescription>
		</Alert>
	),
}

export const WithoutIcon: Story = {
	render: () => (
		<Alert>
			<AlertTitle>Note</AlertTitle>
			<AlertDescription>This is an alert without an icon.</AlertDescription>
		</Alert>
	),
}

export const TitleOnly: Story = {
	render: () => (
		<Alert>
			<Info className="h-4 w-4" />
			<AlertTitle>This alert only has a title</AlertTitle>
		</Alert>
	),
}

export const AllVariants: Story = {
	render: () => (
		<div className="grid gap-4">
			<Alert>
				<Info className="h-4 w-4" />
				<AlertTitle>Info</AlertTitle>
				<AlertDescription>This is an informational alert.</AlertDescription>
			</Alert>
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertTitle>Error</AlertTitle>
				<AlertDescription>This is an error alert.</AlertDescription>
			</Alert>
		</div>
	),
}
