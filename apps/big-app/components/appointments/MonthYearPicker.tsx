"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MONTH_SHORT = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export function MonthYearPicker({
	value,
	onSelect,
}: {
	value: Date;
	onSelect: (d: Date) => void;
}) {
	const [year, setYear] = useState(value.getFullYear());
	const selectedMonth = value.getMonth();
	const selectedYear = value.getFullYear();
	const now = new Date();
	const thisMonth = now.getMonth();
	const thisYear = now.getFullYear();

	return (
		<div className="w-64 p-3">
			<div className="mb-3 flex items-center justify-between">
				<button
					type="button"
					onClick={() => setYear((y) => y - 1)}
					aria-label="Previous year"
					className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
				>
					<ChevronLeft className="size-4" />
				</button>
				<span className="font-semibold text-sm tabular-nums">{year}</span>
				<button
					type="button"
					onClick={() => setYear((y) => y + 1)}
					aria-label="Next year"
					className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
				>
					<ChevronRight className="size-4" />
				</button>
			</div>
			<div className="grid grid-cols-3 gap-1.5">
				{MONTH_SHORT.map((label, idx) => {
					const isSelected = idx === selectedMonth && year === selectedYear;
					const isCurrent = idx === thisMonth && year === thisYear;
					return (
						<button
							key={label}
							type="button"
							onClick={() => onSelect(new Date(year, idx, 1))}
							className={cn(
								"rounded-md py-1.5 text-xs font-medium transition",
								isSelected
									? "bg-primary text-primary-foreground"
									: isCurrent
										? "bg-muted text-foreground ring-1 ring-primary/40"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							{label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
