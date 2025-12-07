import tailwindcssTypography from "@tailwindcss/typography"
import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

export default {
	darkMode: ["class"],
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			borderRadius: {
				lg: ".625rem" /* 10px */,
				md: ".5rem" /* 8px */,
				sm: ".25rem" /* 4px */,
			},
			colors: {
				// Flat / base colors (regular buttons)
				background: "hsl(var(--background) / <alpha-value>)",
				foreground: "hsl(var(--foreground) / <alpha-value>)",
				border: "hsl(var(--border) / <alpha-value>)",
				input: "hsl(var(--input) / <alpha-value>)",
				card: {
					DEFAULT: "hsl(var(--card) / <alpha-value>)",
					foreground: "hsl(var(--card-foreground) / <alpha-value>)",
					border: "hsl(var(--card-border) / <alpha-value>)",
				},
				popover: {
					DEFAULT: "hsl(var(--popover) / <alpha-value>)",
					foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
					border: "hsl(var(--popover-border) / <alpha-value>)",
				},
				primary: {
					DEFAULT: "hsl(var(--primary) / <alpha-value>)",
					foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
					border: "var(--primary-border)",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
					foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
					border: "var(--secondary-border)",
				},
				muted: {
					DEFAULT: "hsl(var(--muted) / <alpha-value>)",
					foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
					border: "var(--muted-border)",
				},
				accent: {
					DEFAULT: "hsl(var(--accent) / <alpha-value>)",
					foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
					border: "var(--accent-border)",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
					foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
					border: "var(--destructive-border)",
				},
				ring: "hsl(var(--ring) / <alpha-value>)",
				// Emerald accent color for highlights
				"accent-color": {
					DEFAULT: "hsl(var(--accent-color) / <alpha-value>)",
					foreground: "hsl(var(--accent-color-foreground) / <alpha-value>)",
					muted: "hsl(var(--accent-color-muted) / <alpha-value>)",
				},
				success: {
					DEFAULT: "hsl(var(--success) / <alpha-value>)",
					foreground: "hsl(var(--success-foreground) / <alpha-value>)",
				},
				chart: {
					"1": "hsl(var(--chart-1) / <alpha-value>)",
					"2": "hsl(var(--chart-2) / <alpha-value>)",
					"3": "hsl(var(--chart-3) / <alpha-value>)",
					"4": "hsl(var(--chart-4) / <alpha-value>)",
					"5": "hsl(var(--chart-5) / <alpha-value>)",
				},
				sidebar: {
					ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
					DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
					foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
					border: "hsl(var(--sidebar-border) / <alpha-value>)",
				},
				"sidebar-primary": {
					DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
					foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
					border: "var(--sidebar-primary-border)",
				},
				"sidebar-accent": {
					DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
					foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
					border: "var(--sidebar-accent-border)",
				},
				status: {
					online: "rgb(34 197 94)",
					away: "rgb(245 158 11)",
					busy: "rgb(239 68 68)",
					offline: "rgb(156 163 175)",
				},
			},
			fontFamily: {
				sans: ["var(--font-sans)"],
				serif: ["var(--font-serif)"],
				mono: ["var(--font-mono)"],
			},
			letterSpacing: {
				tighter: "-0.04em",
				tight: "-0.02em",
				normal: "-0.011em",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				"fade-in": {
					from: { opacity: "0" },
					to: { opacity: "1" },
				},
				"fade-in-up": {
					from: { opacity: "0", transform: "translateY(10px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
				"fade-in-down": {
					from: { opacity: "0", transform: "translateY(-10px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
				"scale-in": {
					from: { opacity: "0", transform: "scale(0.95)" },
					to: { opacity: "1", transform: "scale(1)" },
				},
				"slide-in-right": {
					from: { opacity: "0", transform: "translateX(10px)" },
					to: { opacity: "1", transform: "translateX(0)" },
				},
				"pulse-soft": {
					"0%, 100%": { opacity: "1" },
					"50%": { opacity: "0.6" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"fade-in": "fade-in 0.3s ease-out",
				"fade-in-up": "fade-in-up 0.4s ease-out",
				"fade-in-down": "fade-in-down 0.4s ease-out",
				"scale-in": "scale-in 0.2s ease-out",
				"slide-in-right": "slide-in-right 0.3s ease-out",
				"pulse-soft": "pulse-soft 2s ease-in-out infinite",
			},
			transitionTimingFunction: {
				"out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
			},
		},
	},
	plugins: [tailwindcssAnimate, tailwindcssTypography],
} satisfies Config
