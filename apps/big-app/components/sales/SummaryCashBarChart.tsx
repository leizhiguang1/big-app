"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

export type CashBars = {
	cashMovement: number;
	paymentCollected: number;
	outstanding: number;
};

function fmtMyr(n: number) {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function fmtAxis(n: number) {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
	return String(n);
}

const CONFIG: ChartConfig = {
	value: { label: "Amount" },
	cashMovement: { label: "Cash Movement", color: "var(--chart-1)" },
	paymentCollected: { label: "Payment Collected", color: "var(--chart-2)" },
	outstanding: { label: "Outstanding", color: "var(--chart-4)" },
};

export function SummaryCashBarChart({ data }: { data: CashBars }) {
	const rows = [
		{
			key: "cashMovement",
			label: "Cash Movement",
			value: data.cashMovement,
			fill: "var(--color-cashMovement)",
		},
		{
			key: "paymentCollected",
			label: "Payment Collected",
			value: data.paymentCollected,
			fill: "var(--color-paymentCollected)",
		},
		{
			key: "outstanding",
			label: "Outstanding",
			value: data.outstanding,
			fill: "var(--color-outstanding)",
		},
	];

	return (
		<ChartContainer
			config={CONFIG}
			className="aspect-[4/3] w-full max-h-[320px]"
		>
			<BarChart data={rows} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}>
				<CartesianGrid vertical={false} strokeDasharray="3 3" />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tickFormatter={fmtAxis}
					width={48}
				/>
				<ChartTooltip
					cursor={{ fill: "var(--muted)", opacity: 0.4 }}
					content={
						<ChartTooltipContent
							hideLabel
							formatter={(value, _name, item) => (
								<div className="flex w-full items-center justify-between gap-4">
									<span className="text-muted-foreground">
										{String(item.payload?.label ?? "")}
									</span>
									<span className="font-medium font-mono tabular-nums">
										MYR {fmtMyr(Number(value))}
									</span>
								</div>
							)}
						/>
					}
				/>
				<Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64} />
			</BarChart>
		</ChartContainer>
	);
}
