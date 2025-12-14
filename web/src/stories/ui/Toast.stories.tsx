import type { Meta, StoryObj } from "@storybook/react"
import {
	Toast,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from "@/components/ui/toast"

const meta: Meta<typeof Toast> = {
	title: "UI/Toast",
	component: Toast,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<ToastProvider>
				<Story />
				<ToastViewport />
			</ToastProvider>
		),
	],
}

export default meta
type Story = StoryObj<typeof Toast>

export const Default: Story = {
	render: () => (
		<Toast open>
			<div className="grid gap-1">
				<ToastTitle>Notification</ToastTitle>
				<ToastDescription>This is a toast notification.</ToastDescription>
			</div>
			<ToastClose />
		</Toast>
	),
}

export const Destructive: Story = {
	render: () => (
		<Toast open variant="destructive">
			<div className="grid gap-1">
				<ToastTitle>Error</ToastTitle>
				<ToastDescription>Something went wrong. Please try again.</ToastDescription>
			</div>
			<ToastClose />
		</Toast>
	),
}

export const WithAction: Story = {
	render: () => (
		<Toast open>
			<div className="grid gap-1">
				<ToastTitle>Scheduled</ToastTitle>
				<ToastDescription>Your meeting has been scheduled.</ToastDescription>
			</div>
			<ToastAction altText="Undo">Undo</ToastAction>
			<ToastClose />
		</Toast>
	),
}

export const Success: Story = {
	render: () => (
		<Toast open className="border-green-500/50 bg-green-500/10">
			<div className="grid gap-1">
				<ToastTitle className="text-green-600">Success</ToastTitle>
				<ToastDescription>Your changes have been saved successfully.</ToastDescription>
			</div>
			<ToastClose />
		</Toast>
	),
}

export const SimpleMessage: Story = {
	render: () => (
		<Toast open>
			<ToastDescription>File uploaded successfully.</ToastDescription>
			<ToastClose />
		</Toast>
	),
}

export const AllVariants: Story = {
	render: () => (
		<div className="grid gap-4">
			<Toast open>
				<div className="grid gap-1">
					<ToastTitle>Default</ToastTitle>
					<ToastDescription>This is a default toast.</ToastDescription>
				</div>
				<ToastClose />
			</Toast>
			<Toast open variant="destructive">
				<div className="grid gap-1">
					<ToastTitle>Destructive</ToastTitle>
					<ToastDescription>This is an error toast.</ToastDescription>
				</div>
				<ToastClose />
			</Toast>
		</div>
	),
}
