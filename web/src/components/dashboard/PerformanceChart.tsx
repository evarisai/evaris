import { useEffect, useState } from "react"
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DataPoint {
	date: string
	score: number
	accuracy?: number
}

interface PerformanceChartProps {
	title: string
	data: DataPoint[]
	showAccuracy?: boolean
}

// Chart component that only renders on client
function ChartContent({ data, showAccuracy }: { data: DataPoint[]; showAccuracy?: boolean }) {
	const [isMounted, setIsMounted] = useState(false)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	if (!isMounted) {
		return (
			<div className="h-full flex items-center justify-center text-muted-foreground">
				Loading chart...
			</div>
		)
	}

	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
				<defs>
					<linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
						<stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
					</linearGradient>
					<linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
						<stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
				<XAxis
					dataKey="date"
					axisLine={false}
					tickLine={false}
					tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
					dy={10}
				/>
				<YAxis
					axisLine={false}
					tickLine={false}
					tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
					dx={-10}
					domain={[0, 100]}
				/>
				<Tooltip
					contentStyle={{
						backgroundColor: "hsl(var(--popover))",
						border: "1px solid hsl(var(--border))",
						borderRadius: "8px",
						fontSize: "12px",
					}}
					labelStyle={{ color: "hsl(var(--foreground))" }}
				/>
				<Area
					type="monotone"
					dataKey="score"
					stroke="hsl(var(--chart-1))"
					strokeWidth={2}
					fill="url(#scoreGradient)"
					name="Score"
				/>
				{showAccuracy && (
					<Area
						type="monotone"
						dataKey="accuracy"
						stroke="hsl(var(--chart-4))"
						strokeWidth={2}
						fill="url(#accuracyGradient)"
						name="Accuracy"
					/>
				)}
			</AreaChart>
		</ResponsiveContainer>
	)
}

export function PerformanceChart({ title, data, showAccuracy }: PerformanceChartProps) {
	return (
		<Card className="border-card-border">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-semibold">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-80">
					<ChartContent data={data} showAccuracy={showAccuracy} />
				</div>
				{/* Legend */}
				<div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/50">
					<div className="flex items-center gap-2">
						<span className="w-3 h-3 rounded-full bg-chart-1" />
						<span className="text-xs text-muted-foreground font-medium">Score</span>
					</div>
					{showAccuracy && (
						<div className="flex items-center gap-2">
							<span className="w-3 h-3 rounded-full bg-chart-4" />
							<span className="text-xs text-muted-foreground font-medium">Accuracy</span>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
