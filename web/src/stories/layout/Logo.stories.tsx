import type { Meta, StoryObj } from "@storybook/react"
import { EvarisSymbol, EvarisName, EvarisLogo, EvarisLogoFull } from "@/components/Logo"

const meta: Meta = {
	title: "Layout/Logo",
	tags: ["autodocs"],
}

export default meta

export const IconOnly: StoryObj<typeof EvarisSymbol> = {
	render: () => <EvarisSymbol />,
}

export const SymbolSizes: StoryObj<typeof EvarisSymbol> = {
	render: () => (
		<div className="flex items-end gap-4">
			<EvarisSymbol className="h-4 w-4" />
			<EvarisSymbol className="h-6 w-6" />
			<EvarisSymbol className="h-8 w-8" />
			<EvarisSymbol className="h-12 w-12" />
			<EvarisSymbol className="h-16 w-16" />
		</div>
	),
}

export const Name: StoryObj<typeof EvarisName> = {
	render: () => <EvarisName />,
}

export const NameSizes: StoryObj<typeof EvarisName> = {
	render: () => (
		<div className="flex flex-col gap-4">
			<EvarisName className="h-4" />
			<EvarisName className="h-6" />
			<EvarisName className="h-8" />
		</div>
	),
}

export const Logo: StoryObj<typeof EvarisLogo> = {
	render: () => <EvarisLogo />,
}

export const LogoFull: StoryObj<typeof EvarisLogoFull> = {
	render: () => <EvarisLogoFull />,
}

export const AllVariants: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-8">
			<div>
				<p className="text-sm text-muted-foreground mb-2">Symbol Only</p>
				<EvarisSymbol className="h-10 w-10" />
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Name Only</p>
				<EvarisName className="h-6" />
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Combined Logo</p>
				<EvarisLogo />
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Full Logo with Text</p>
				<EvarisLogoFull />
			</div>
		</div>
	),
}

export const OnDarkBackground: StoryObj = {
	render: () => (
		<div className="bg-slate-900 p-8 rounded-lg">
			<div className="flex flex-col gap-6 text-white">
				<EvarisSymbol className="h-10 w-10" />
				<EvarisName className="h-6" />
				<EvarisLogo />
				<EvarisLogoFull />
			</div>
		</div>
	),
}

export const ColorVariations: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-4">
			<EvarisSymbol className="h-10 w-10 text-primary" />
			<EvarisSymbol className="h-10 w-10 text-destructive" />
			<EvarisSymbol className="h-10 w-10 text-muted-foreground" />
			<EvarisSymbol className="h-10 w-10 text-blue-500" />
		</div>
	),
}
