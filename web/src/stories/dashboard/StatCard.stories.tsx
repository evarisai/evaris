import type { Meta, StoryObj } from "@storybook/react"
import { BarChart3, TrendingUp, Users, Zap } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"

const meta: Meta<typeof StatCard> = {
	title: "Dashboard/StatCard",
	component: StatCard,
	tags: ["autodocs"],
	argTypes: {
		trend: {
			control: { type: "number", min: -100, max: 100 },
		},
	},
}

export default meta
type Story = StoryObj<typeof StatCard>

export const Default: Story = {
	args: {
		title: "Total Evaluations",
		value: "1,234",
	},
}

export const WithPositiveTrend: Story = {
	args: {
		title: "Pass Rate",
		value: "94.2%",
		trend: 12,
		trendLabel: "vs last month",
	},
}

export const WithNegativeTrend: Story = {
	args: {
		title: "Failed Tests",
		value: "23",
		trend: -8,
		trendLabel: "vs last week",
	},
}

export const WithNeutralTrend: Story = {
	args: {
		title: "Active Projects",
		value: "12",
		trend: 0,
		trendLabel: "no change",
	},
}

export const WithIcon: Story = {
	args: {
		title: "Total Evaluations",
		value: "1,234",
		trend: 15,
		trendLabel: "vs last month",
		icon: BarChart3,
	},
}

export const AllVariants: Story = {
	render: () => (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<StatCard
				title="Total Evaluations"
				value="1,234"
				trend={12}
				trendLabel="vs last month"
				icon={BarChart3}
			/>
			<StatCard
				title="Pass Rate"
				value="94.2%"
				trend={5}
				trendLabel="vs last week"
				icon={TrendingUp}
			/>
			<StatCard title="Active Users" value="48" trend={-3} trendLabel="vs yesterday" icon={Users} />
			<StatCard title="Avg Response Time" value="1.2s" trend={0} trendLabel="stable" icon={Zap} />
		</div>
	),
}

export const WithoutTrend: Story = {
	args: {
		title: "API Calls",
		value: "45,678",
		icon: Zap,
	},
}

export const LargeNumber: Story = {
	args: {
		title: "Total Requests",
		value: "1,234,567",
		trend: 23,
		trendLabel: "this month",
		icon: BarChart3,
	},
}
