import type { Preview, ReactRenderer } from "@storybook/react-vite"
import type { DecoratorFunction } from "@storybook/types"
import { withThemeByClassName } from "@storybook/addon-themes"
import {
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRouter,
} from "@tanstack/react-router"
import "../src/styles.css"

const routerDecorator: DecoratorFunction<ReactRenderer> = (Story) => {
	const rootRoute = createRootRoute({
		component: () => <Story />,
	})
	const memoryHistory = createMemoryHistory({
		initialEntries: ["/"],
	})
	const router = createRouter({
		routeTree: rootRoute,
		history: memoryHistory,
	})
	return <RouterProvider router={router} />
}

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		backgrounds: {
			disable: true,
		},
		layout: "centered",
	},
	decorators: [
		routerDecorator,
		withThemeByClassName({
			themes: {
				light: "",
				dark: "dark",
			},
			defaultTheme: "light",
		}),
	],
}

export default preview
