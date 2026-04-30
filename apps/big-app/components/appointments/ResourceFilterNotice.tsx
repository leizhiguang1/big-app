"use client";

import { CalendarOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
	employeeName: string;
	scopeLabel: "day" | "week" | "month";
	nextRosteredDate: string | null;
	onClearFilter: () => void;
	onJumpToDate: (dateStr: string) => void;
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function formatShortDate(dateStr: string): string {
	const [y, m, d] = dateStr.split("-").map(Number);
	const date = new Date(y, m - 1, d);
	return `${WEEKDAY_SHORT[date.getDay()]}, ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

export function ResourceFilterNotice({
	employeeName,
	scopeLabel,
	nextRosteredDate,
	onClearFilter,
	onJumpToDate,
}: Props) {
	return (
		<div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900/60 dark:bg-amber-900/15">
			<CalendarOff
				className="size-4 shrink-0 text-amber-700 dark:text-amber-400"
				aria-hidden
			/>
			<span className="text-amber-900 dark:text-amber-100">
				<span className="font-medium">{employeeName}</span> isn&apos;t rostered
				for this {scopeLabel}.
			</span>
			<div className="ml-auto flex flex-wrap items-center gap-1.5">
				{nextRosteredDate && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-xs"
						onClick={() => onJumpToDate(nextRosteredDate)}
					>
						Jump to {formatShortDate(nextRosteredDate)}
					</Button>
				)}
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-7 px-2 text-xs"
					onClick={onClearFilter}
				>
					<X className="mr-1 size-3" aria-hidden />
					Clear filter
				</Button>
			</div>
		</div>
	);
}
