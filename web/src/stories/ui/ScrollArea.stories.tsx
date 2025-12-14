import type { Meta, StoryObj } from "@storybook/react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const meta: Meta<typeof ScrollArea> = {
	title: "UI/ScrollArea",
	component: ScrollArea,
	tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof ScrollArea>

const tags = Array.from({ length: 50 }).map((_, i, a) => `v1.2.0-beta.${a.length - i}`)

export const Default: Story = {
	render: () => (
		<ScrollArea className="h-72 w-48 rounded-md border">
			<div className="p-4">
				<h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
				{tags.map((tag) => (
					<div key={tag}>
						<div className="text-sm">{tag}</div>
						<Separator className="my-2" />
					</div>
				))}
			</div>
		</ScrollArea>
	),
}

export const Horizontal: Story = {
	render: () => (
		<ScrollArea className="w-96 whitespace-nowrap rounded-md border">
			<div className="flex w-max space-x-4 p-4">
				{Array.from({ length: 20 }).map((_, i) => (
					<div
						key={`horizontal-item-${i + 1}`}
						className="shrink-0 w-32 h-32 rounded-md border bg-muted flex items-center justify-center"
					>
						Item {i + 1}
					</div>
				))}
			</div>
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	),
}

export const LongContent: Story = {
	render: () => (
		<ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
			<p className="text-sm">
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
				labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
				laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
				voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
				cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
			</p>
			<p className="text-sm mt-4">
				Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
				laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
				architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit
				aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione
				voluptatem sequi nesciunt.
			</p>
			<p className="text-sm mt-4">
				Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci
				velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam
				quaerat voluptatem.
			</p>
		</ScrollArea>
	),
}

export const CardList: Story = {
	render: () => (
		<ScrollArea className="h-72 w-64 rounded-md border">
			<div className="p-4 space-y-4">
				{Array.from({ length: 10 }).map((_, i) => (
					<div key={`card-${i + 1}`} className="rounded-lg border p-3 space-y-1">
						<p className="text-sm font-medium">Card {i + 1}</p>
						<p className="text-xs text-muted-foreground">This is card description text.</p>
					</div>
				))}
			</div>
		</ScrollArea>
	),
}
