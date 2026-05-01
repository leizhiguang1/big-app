"use client";

import { Cell, Label, Pie, PieChart } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

export type DonutSlice = { key: string; label: string; value: number };

const PALETTE = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--muted-foreground)",
];

function fmtMyr(n: number) {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function SummaryDonutChart({ slices }: { slices: DonutSlice[] }) {
	const total = slices.reduce((s, v) => s + v.value, 0);

	const config: ChartConfig = {
		value: { label: "Sales" },
		...Object.fromEntries(
			slices.map((s, i) => [
				s.key,
				{ label: s.label, color: PALETTE[i % PALETTE.length] },
			]),
		),
	};

	if (total === 0) {
		return (
			<div className="flex aspect-square w-full max-w-[280px] items-center justify-center text-muted-foreground text-sm">
				No sales yet
			</div>
		);
	}

	return (
		<ChartContainer
			config={config}
			className="mx-auto aspect-square w-full max-w-[280px]"
		>
			<PieChart>
				<ChartTooltip
					cursor={false}
					content={
						<ChartTooltipContent
							hideLabel
							formatter={(value, name) => (
								<div className="flex w-full items-center justify-between gap-4">
									<span className="text-muted-foreground">
										{config[name as string]?.label ?? name}
									</span>
									<span className="font-medium font-mono tabular-nums">
										MYR {fmtMyr(Number(value))}
									</span>
								</div>
							)}
						/>
					}
				/>
				<Pie
					data={slices.map((s) => ({ ...s, fill: `var(--color-${s.key})` }))}
					dataKey="value"
					nameKey="key"
					innerRadius={70}
					outerRadius={105}
					strokeWidth={2}
					stroke="var(--background)"
				>
					{slices.map((s) => (
						<Cell key={s.key} fill={`var(--color-${s.key})`} />
					))}
					<Label
						content={({ viewBox }) => {
							if (
								viewBox &&
								"cx" in viewBox &&
								"cy" in viewBox &&
								typeof viewBox.cx === "number" &&
								typeof viewBox.cy === "number"
							) {
								return (
									<text
										x={viewBox.cx}
										y={viewBox.cy}
										textAnchor="middle"
										dominantBaseline="middle"
									>
										<tspan
											x={viewBox.cx}
											y={viewBox.cy - 8}
											className="fill-muted-foreground text-[11px]"
										>
											Total
										</tspan>
										<tspan
											x={viewBox.cx}
											y={viewBox.cy + 12}
											className="fill-foreground font-semibold text-lg"
										>
											MYR {fmtMyr(total)}
										</tspan>
									</text>
								);
							}
							return null;
						}}
					/>
				</Pie>
				<ChartLegend
					content={<ChartLegendContent nameKey="key" />}
					verticalAlign="bottom"
				/>
			</PieChart>
		</ChartContainer>
	);
}
