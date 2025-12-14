import type { Meta, StoryObj } from "@storybook/react"
import { Skeleton } from "@/components/ui/skeleton"

const meta: Meta<typeof Skeleton> = {
	title: "UI/Skeleton",
	component: Skeleton,
	tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const Default: Story = {
	render: () => <Skeleton className="h-4 w-[250px]" />,
}

export const Circle: Story = {
	render: () => <Skeleton className="h-12 w-12 rounded-full" />,
}

export const Card: Story = {
	render: () => (
		<div className="flex items-center space-x-4">
			<Skeleton className="h-12 w-12 rounded-full" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-[250px]" />
				<Skeleton className="h-4 w-[200px]" />
			</div>
		</div>
	),
}

export const CardFull: Story = {
	render: () => (
		<div className="flex flex-col space-y-3">
			<Skeleton className="h-[125px] w-[250px] rounded-xl" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-[250px]" />
				<Skeleton className="h-4 w-[200px]" />
			</div>
		</div>
	),
}

export const TextLines: Story = {
	render: () => (
		<div className="space-y-2">
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-3/4" />
		</div>
	),
}

export const TableRow: Story = {
	render: () => (
		<div className="flex items-center space-x-4 p-4">
			<Skeleton className="h-4 w-[50px]" />
			<Skeleton className="h-4 w-[150px]" />
			<Skeleton className="h-4 w-[100px]" />
			<Skeleton className="h-4 w-[80px]" />
		</div>
	),
}

export const Avatar: Story = {
	render: () => (
		<div className="flex items-center space-x-4">
			<Skeleton className="h-10 w-10 rounded-full" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-[120px]" />
				<Skeleton className="h-3 w-[180px]" />
			</div>
		</div>
	),
}

export const DashboardCard: Story = {
	render: () => (
		<div className="border rounded-lg p-6 space-y-4 w-[350px]">
			<div className="flex items-center justify-between">
				<Skeleton className="h-5 w-[100px]" />
				<Skeleton className="h-8 w-8 rounded" />
			</div>
			<Skeleton className="h-8 w-[80px]" />
			<div className="flex items-center gap-2">
				<Skeleton className="h-4 w-[60px]" />
				<Skeleton className="h-4 w-[100px]" />
			</div>
		</div>
	),
}
