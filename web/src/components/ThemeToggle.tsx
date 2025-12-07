import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
	const [isDark, setIsDark] = useState(true)

	useEffect(() => {
		const root = document.documentElement
		if (isDark) {
			root.classList.add("dark")
		} else {
			root.classList.remove("dark")
		}
	}, [isDark])

	return (
		<Button
			size="icon"
			variant="ghost"
			onClick={() => setIsDark(!isDark)}
			data-testid="button-theme-toggle"
			className="relative h-9 w-9 rounded-lg hover:bg-muted/80 transition-all duration-200"
		>
			<Sun
				className={`h-4 w-4 absolute transition-all duration-300 ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`}
			/>
			<Moon
				className={`h-4 w-4 absolute transition-all duration-300 ${isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
			/>
			<span className="sr-only">Toggle theme</span>
		</Button>
	)
}
