"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { cn } from "@/lib/utils";

export function RosterFilters({ weekStart }: { weekStart: string }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [pending, startTransition] = useTransition();

	const weekStartDate = parseDate(weekStart);
	const todayWeek = fmtDate(getWeekStart(new Date()));
	const isCurrentWeek = weekStart === todayWeek;

	const navigate = (next: { week?: string }) => {
		const params = new URLSearchParams(searchParams.toString());
		if (next.week) params.set("week", next.week);
		const qs = params.toString();
		startTransition(() =>
			router.push(qs ? `${pathname}?${qs}` : pathname),
		);
	};

	const shiftWeek = (delta: number) => {
		navigate({ week: fmtDate(addDays(weekStartDate, delta)) });
	};

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-end gap-3 rounded-md border bg-card px-4 py-3",
				pending && "opacity-70",
			)}
		>
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
