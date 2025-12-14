import type { Meta, StoryObj } from "@storybook/react"
import { PerformanceChart } from "@/components/dashboard/PerformanceChart"

const meta: Meta<typeof PerformanceChart> = {
	title: "Dashboard/PerformanceChart",
	component: PerformanceChart,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
	},
}

export default meta
type Story = StoryObj<typeof PerformanceChart>

const sampleData = [
	{ date: "Jan", score: 65, accuracy: 70 },
	{ date: "Feb", score: 72, accuracy: 75 },
	{ date: "Mar", score: 68, accuracy: 72 },
	{ date: "Apr", score: 78, accuracy: 80 },
	{ date: "May", score: 82, accuracy: 85 },
	{ date: "Jun", score: 85, accuracy: 88 },
	{ date: "Jul", score: 88, accuracy: 90 },
]

export const Default: Story = {
	args: {
		title: "Performance Over Time",
		data: sampleData,
	},
}

export const WithAccuracy: Story = {
	args: {
		title: "Score vs Accuracy",
		data: sampleData,
		showAccuracy: true,
	},
}

export const UpwardTrend: Story = {
	args: {
		title: "Improving Performance",
		data: [
			{ date: "Week 1", score: 45 },
			{ date: "Week 2", score: 52 },
			{ date: "Week 3", score: 58 },
			{ date: "Week 4", score: 67 },
			{ date: "Week 5", score: 75 },
			{ date: "Week 6", score: 82 },
			{ date: "Week 7", score: 89 },
			{ date: "Week 8", score: 94 },
		],
	},
}

export const DownwardTrend: Story = {
	args: {
		title: "Declining Performance",
		data: [
			{ date: "Day 1", score: 95 },
			{ date: "Day 2", score: 92 },
			{ date: "Day 3", score: 88 },
			{ date: "Day 4", score: 82 },
			{ date: "Day 5", score: 75 },
			{ date: "Day 6", score: 70 },
			{ date: "Day 7", score: 65 },
		],
	},
}

export const Volatile: Story = {
	args: {
		title: "Volatile Metrics",
		data: [
			{ date: "Mon", score: 70, accuracy: 75 },
			{ date: "Tue", score: 85, accuracy: 65 },
			{ date: "Wed", score: 60, accuracy: 80 },
			{ date: "Thu", score: 90, accuracy: 70 },
			{ date: "Fri", score: 55, accuracy: 85 },
			{ date: "Sat", score: 80, accuracy: 60 },
			{ date: "Sun", score: 75, accuracy: 78 },
		],
		showAccuracy: true,
	},
}

export const HighPerformance: Story = {
	args: {
		title: "High Performance Metrics",
		data: [
			{ date: "Q1", score: 92, accuracy: 94 },
			{ date: "Q2", score: 94, accuracy: 95 },
			{ date: "Q3", score: 96, accuracy: 97 },
			{ date: "Q4", score: 98, accuracy: 99 },
		],
		showAccuracy: true,
	},
}

export const MinimalData: Story = {
	args: {
		title: "Limited Data Points",
		data: [
			{ date: "Start", score: 50 },
			{ date: "End", score: 80 },
		],
	},
}
