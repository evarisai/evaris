import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "@storybook/test"
import { ProjectCard } from "@/components/dashboard/ProjectCard"

const meta: Meta<typeof ProjectCard> = {
	title: "Dashboard/ProjectCard",
	component: ProjectCard,
	tags: ["autodocs"],
	args: {
		onRun: fn(),
		onEdit: fn(),
		onSettings: fn(),
		onDelete: fn(),
	},
	parameters: {
		layout: "padded",
	},
}

export default meta
type Story = StoryObj<typeof ProjectCard>

export const Default: Story = {
	args: {
		id: "proj-1",
		name: "Customer Support Bot",
		description: "Evaluates customer support chatbot responses for helpfulness and accuracy",
		evalCount: 156,
		lastRun: "2 hours ago",
		tags: ["production", "chatbot"],
	},
}

export const WithoutTags: Story = {
	args: {
		id: "proj-2",
		name: "Code Review Assistant",
		description: "Tests code review suggestions for accuracy and relevance",
		evalCount: 42,
		lastRun: "1 day ago",
	},
}

export const WithoutLastRun: Story = {
	args: {
		id: "proj-3",
		name: "New Project",
		description: "A newly created project that hasnt been run yet",
		evalCount: 0,
		tags: ["draft"],
	},
}

export const LongDescription: Story = {
	args: {
		id: "proj-4",
		name: "Content Moderation System",
		description:
			"Comprehensive evaluation suite for testing content moderation capabilities including toxicity detection, spam filtering, and inappropriate content identification across multiple languages and contexts",
		evalCount: 892,
		lastRun: "30 minutes ago",
		tags: ["production", "safety", "ml"],
	},
}

export const ManyTags: Story = {
	args: {
		id: "proj-5",
		name: "Multi-domain Evaluator",
		description: "Cross-domain evaluation testing",
		evalCount: 234,
		lastRun: "5 hours ago",
		tags: ["production", "staging", "dev", "ml", "nlp"],
	},
}

export const Grid: Story = {
	render: () => (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ProjectCard
				id="proj-1"
				name="Customer Support Bot"
				description="Evaluates customer support chatbot responses"
				evalCount={156}
				lastRun="2 hours ago"
				tags={["production"]}
			/>
			<ProjectCard
				id="proj-2"
				name="Code Review Assistant"
				description="Tests code review suggestions"
				evalCount={42}
				lastRun="1 day ago"
				tags={["staging"]}
			/>
			<ProjectCard
				id="proj-3"
				name="Content Moderation"
				description="Content safety evaluation"
				evalCount={892}
				lastRun="30 min ago"
				tags={["production", "safety"]}
			/>
		</div>
	),
	parameters: {
		layout: "fullscreen",
	},
}
