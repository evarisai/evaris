import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "@storybook/test"
import { DatasetCard } from "@/components/dashboard/DatasetCard"

const meta: Meta<typeof DatasetCard> = {
	title: "Dashboard/DatasetCard",
	component: DatasetCard,
	tags: ["autodocs"],
	args: {
		onEdit: fn(),
		onDelete: fn(),
	},
	parameters: {
		layout: "padded",
	},
}

export default meta
type Story = StoryObj<typeof DatasetCard>

export const Default: Story = {
	args: {
		id: "ds-1",
		name: "Customer Queries",
		description: "Collection of customer support queries for testing",
		fileCount: 5,
		totalItems: 1250,
		updatedAt: "2 hours ago",
	},
}

export const SingleFile: Story = {
	args: {
		id: "ds-2",
		name: "Test Cases",
		description: "Single file test dataset",
		fileCount: 1,
		totalItems: 100,
		updatedAt: "yesterday",
	},
}

export const NoItems: Story = {
	args: {
		id: "ds-3",
		name: "Empty Dataset",
		description: "Newly created dataset with no data yet",
		fileCount: 0,
		totalItems: 0,
		updatedAt: "just now",
	},
}

export const NoDescription: Story = {
	args: {
		id: "ds-4",
		name: "Untitled Dataset",
		description: "",
		fileCount: 3,
		totalItems: 450,
		updatedAt: "3 days ago",
	},
}

export const LargeDataset: Story = {
	args: {
		id: "ds-5",
		name: "Production Training Data",
		description: "Large-scale production dataset for model evaluation",
		fileCount: 42,
		totalItems: 125000,
		updatedAt: "1 week ago",
	},
}

export const Grid: Story = {
	render: () => (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<DatasetCard
				id="ds-1"
				name="Customer Queries"
				description="Customer support queries collection"
				fileCount={5}
				totalItems={1250}
				updatedAt="2 hours ago"
			/>
			<DatasetCard
				id="ds-2"
				name="Code Samples"
				description="Programming code samples for evaluation"
				fileCount={12}
				totalItems={3400}
				updatedAt="yesterday"
			/>
			<DatasetCard
				id="ds-3"
				name="Chat Conversations"
				description="Multi-turn chat conversation examples"
				fileCount={8}
				totalItems={890}
				updatedAt="3 days ago"
			/>
		</div>
	),
	parameters: {
		layout: "fullscreen",
	},
}
