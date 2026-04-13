"use client";

import { useMemo } from "react";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { addDays, fmtDate, parseDate } from "@/lib/roster/week";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	scope: "day" | "week";
	dateStr: string;
	weekStart: string;
	appointments: AppointmentWithRelations[];
	onAppointmentClick: (a: AppointmentWithRelations) => void;
	onAppointmentContextMenu?: (
		e: React.MouseEvent,
		a: AppointmentWithRelations,
	) => void;
	onDayClick?: (dateStr: string) => void;
};

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function GridView({
	scope,
	dateStr,
	weekStart,
	appointments,
	onAppointmentClick,
	onAppointmentContextMenu,
	onDayClick,
}: Props) {
	const today = fmtDate(new Date());

	const days = useMemo(() => {
		if (scope === "day") {
			return [parseDate(dateStr)];
		}
		const start = parseDate(weekStart);
		return Array.from({ length: 7 }, (_, i) => addDays(start, i));
	}, [scope, dateStr, weekStart]);

	const aptsByDay = useMemo(() => {
		const map = new Map<string, AppointmentWithRelations[]>();
		for (const a of appointments) {
			const key = fmtDate(new Date(a.start_at));
			const list = map.get(key);
			if (list) list.push(a);
			else map.set(key, [a]);
		}
		for (const list of map.values()) {
			list.sort((x, y) => x.start_at.localeCompare(y.start_at));
		}
		return map;
	}, [appointments]);

	return (
		<div
			className="overflow-auto rounded-md border bg-card"
			style={{ maxHeight: "calc(100vh - 14rem)" }}
		>
			<div
				className="grid"
				style={{
					gridTemplateColumns: `repeat(${days.length}, minmax(180px, 1fr))`,
				}}
			>
				{days.map((d) => {
					const ds = fmtDate(d);
					const isTodayCol = ds === today;
					const dayApts = aptsByDay.get(ds) ?? [];
					const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
					return (
						<div
							key={ds}
							className="flex min-h-[400px] flex-col border-r last:border-r-0"
						>
							<button
								type="button"
								onClick={() => onDayClick?.(ds)}
								className={cn(
									"border-b px-2.5 py-2 text-center transition hover:bg-muted/40",
									isTodayCol && "bg-amber-50 dark:bg-amber-900/20",
								)}
							>
								<div className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
									{WEEKDAY_SHORT[dayIdx]}
								</div>
								<div
									className={cn(
										"mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full font-bold text-lg",
										isTodayCol
											? "bg-amber-200 text-amber-900"
											: "text-foreground",
									)}
								>
									{d.getDate()}
								</div>
							</button>
							<div className="flex flex-col gap-1.5 p-2">
								{dayApts.length === 0 ? (
									<div className="pt-4 text-center text-[11px] text-muted-foreground/60">
										—
									</div>
								) : (
									dayApts.map((a) => (
										<AppointmentCard
											key={a.id}
											appointment={a}
											onClick={() => onAppointmentClick(a)}
											onContextMenu={onAppointmentContextMenu}
											style={{ position: "relative" }}
										/>
									))
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
