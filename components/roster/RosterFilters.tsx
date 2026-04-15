"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	addDays,
	fmtDate,
	fmtWeekRange,
	getWeekStart,
	parseDate,
} from "@/lib/roster/week";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
	"h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function RosterFilters({
	outlets,
	outletId,
	weekStart,
}: {
	outlets: OutletWithRoomCount[];
	outletId: string;
	weekStart: string;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [pending, startTransition] = useTransition();

	const weekStartDate = parseDate(weekStart);
	const todayWeek = fmtDate(getWeekStart(new Date()));
	const isCurrentWeek = weekStart === todayWeek;

	const navigate = (next: { outlet?: string; week?: string }) => {
		const params = new URLSearchParams(searchParams.toString());
		if (next.outlet) params.set("outlet", next.outlet);
		if (next.week) params.set("week", next.week);
		startTransition(() => router.push(`/roster?${params.toString()}`));
	};

	const shiftWeek = (delta: number) => {
		navigate({ week: fmtDate(addDays(weekStartDate, delta)) });
	};

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3",
				pending && "opacity-70",
			)}
		>
			<select
				value={outletId}
				onChange={(e) => navigate({ outlet: e.target.value })}
				className={SELECT_CLASS}
			>
				{outlets.map((o) => (
					<option key={o.id} value={o.id}>
						{o.name}
					</option>
				))}
			</select>

			<div className="flex items-center gap-2">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => shiftWeek(-7)}
							aria-label="Previous week"
						>
							<ChevronLeft className="size-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Previous week</TooltipContent>
				</Tooltip>
				<Button
					type="button"
					variant={isCurrentWeek ? "default" : "outline"}
					size="sm"
					onClick={() => navigate({ week: todayWeek })}
				>
					Today
				</Button>
				<span className="min-w-44 text-center font-medium text-sm">
					{fmtWeekRange(weekStartDate)}
				</span>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => shiftWeek(7)}
							aria-label="Next week"
						>
							<ChevronRight className="size-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Next week</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
