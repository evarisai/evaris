import type { Meta, StoryObj } from "@storybook/react"
import { RecentActivity } from "@/components/dashboard/RecentActivity"

const meta: Meta<typeof RecentActivity> = {
	title: "Dashboard/RecentActivity",
	component: RecentActivity,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
	},
}

export default meta
type Story = StoryObj<typeof RecentActivity>

export const Default: Story = {
	args: {
		activities: [
			{
				id: "1",
				type: "eval_passed",
				message: "Evaluation completed successfully with 98% accuracy",
				project: "Customer Support Bot",
				timestamp: "2 minutes ago",
			},
			{
				id: "2",
				type: "eval_failed",
				message: "3 test cases failed validation checks",
				project: "Code Review Assistant",
				timestamp: "15 minutes ago",
			},
			{
				id: "3",
				type: "eval_started",
				message: "Started evaluation run with 500 test cases",
				project: "Content Moderation",
				timestamp: "1 hour ago",
			},
			{
				id: "4",
				type: "eval_pending",
				message: "Evaluation queued for processing",
				project: "Translation Quality",
				timestamp: "2 hours ago",
			},
		],
	},
}

export const Empty: Story = {
	args: {
		activities: [],
	},
}

export const AllPassed: Story = {
	args: {
		activities: [
			{
				id: "1",
				type: "eval_passed",
				message: "All 100 test cases passed",
				project: "Project A",
				timestamp: "5 minutes ago",
			},
			{
				id: "2",
				type: "eval_passed",
				message: "Evaluation completed with 99.5% accuracy",
				project: "Project B",
				timestamp: "30 minutes ago",
			},
			{
				id: "3",
				type: "eval_passed",
				message: "All assertions validated successfully",
				project: "Project C",
				timestamp: "1 hour ago",
			},
		],
	},
}

export const AllFailed: Story = {
	args: {
		activities: [
			{
				id: "1",
				type: "eval_failed",
				message: "Timeout exceeded for 5 test cases",
				project: "Slow Service",
				timestamp: "2 minutes ago",
			},
			{
				id: "2",
				type: "eval_failed",
				message: "Response validation failed",
				project: "API Tests",
				timestamp: "10 minutes ago",
			},
		],
	},
}

export const MixedActivity: Story = {
	args: {
		activities: [
			{
				id: "1",
				type: "eval_started",
				message: "Beginning comprehensive evaluation",
				project: "New Feature",
				timestamp: "just now",
			},
			{
				id: "2",
				type: "eval_pending",
				message: "Waiting for resources",
				project: "Heavy Load Test",
				timestamp: "1 minute ago",
			},
			{
				id: "3",
				type: "eval_passed",
				message: "Unit tests completed",
				project: "Core Module",
				timestamp: "5 minutes ago",
			},
			{
				id: "4",
				type: "eval_failed",
				message: "Integration test failed",
				project: "API Gateway",
				timestamp: "10 minutes ago",
			},
			{
				id: "5",
				type: "eval_passed",
				message: "Performance benchmarks met",
				project: "Database Layer",
				timestamp: "30 minutes ago",
			},
		],
	},
}
