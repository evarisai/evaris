import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"

const meta: Meta<typeof Progress> = {
	title: "UI/Progress",
	component: Progress,
	tags: ["autodocs"],
	argTypes: {
		value: {
			control: { type: "range", min: 0, max: 100 },
		},
	},
}

export default meta
type Story = StoryObj<typeof Progress>

export const Default: Story = {
	args: {
		value: 60,
	},
}

export const Empty: Story = {
	args: {
		value: 0,
	},
}

export const Half: Story = {
	args: {
		value: 50,
	},
}

export const Complete: Story = {
	args: {
		value: 100,
	},
}

export const Animated: Story = {
	render: function Render() {
		const [progress, setProgress] = useState(13)

		useEffect(() => {
			const timer = setTimeout(() => setProgress(66), 500)
			return () => clearTimeout(timer)
		}, [])

		return <Progress value={progress} className="w-[60%]" />
	},
}

export const AllValues: Story = {
	render: () => (
		<div className="grid gap-4 w-[300px]">
			<div className="space-y-1">
				<p className="text-sm text-muted-foreground">0%</p>
				<Progress value={0} />
			</div>
			<div className="space-y-1">
				<p className="text-sm text-muted-foreground">25%</p>
				<Progress value={25} />
			</div>
			<div className="space-y-1">
				<p className="text-sm text-muted-foreground">50%</p>
				<Progress value={50} />
			</div>
			<div className="space-y-1">
				<p className="text-sm text-muted-foreground">75%</p>
				<Progress value={75} />
			</div>
			<div className="space-y-1">
				<p className="text-sm text-muted-foreground">100%</p>
				<Progress value={100} />
			</div>
		</div>
	),
}

export const WithLabel: Story = {
	render: () => (
		<div className="w-[300px] space-y-2">
			<div className="flex justify-between text-sm">
				<span>Progress</span>
				<span className="text-muted-foreground">73%</span>
			</div>
			<Progress value={73} />
		</div>
	),
}
