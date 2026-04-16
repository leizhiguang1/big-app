"use client";

import { useMemo } from "react";
import {
	APPOINTMENT_STATUS_CONFIG,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import { addDays, fmtDate, getWeekStart, parseDate } from "@/lib/roster/week";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	dateStr: string;
	appointments: AppointmentWithRelations[];
	onDayClick: (dateStr: string) => void;
	onAppointmentClick: (a: AppointmentWithRelations) => void;
};

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({
	dateStr,
	appointments,
	onDayClick,
	onAppointmentClick,
}: Props) {
	const anchor = parseDate(dateStr);
	const today = fmtDate(new Date());
	const monthIndex = anchor.getMonth();

	const cells = useMemo(() => {
		const firstOfMonth = new Date(anchor.getFullYear(), monthIndex, 1);
		const gridStart = getWeekStart(firstOfMonth);
		return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
	}, [anchor, monthIndex]);

	const aptsByDay = useMemo(() => {
		const map = new Map<string, AppointmentWithRelations[]>();
		for (const a of appointments) {
			const key = fmtDate(new Date(a.start_at));
			const list = map.get(key);
			if (list) list.push(a);
			else map.set(key, [a]);
		}
		return map;
	}, [appointments]);

	return (
		<div className="overflow-hidden rounded-md border bg-card">
			<div className="grid grid-cols-7 border-b bg-muted/40">
				{WEEK_LABELS.map((d) => (
					<div
						key={d}
						className="px-2 py-2 text-center font-semibold text-[11px] text-muted-foreground uppercase tracking-wide"
					>
						{d}
					</div>
				))}
			</div>
			<div className="grid grid-cols-7">
				{cells.map((d) => {
					const ds = fmtDate(d);
					const inMonth = d.getMonth() === monthIndex;
					const isToday = ds === today;
					const list = aptsByDay.get(ds) ?? [];
					return (
						<div
							key={ds}
							role="button"
							tabIndex={0}
							onClick={() => onDayClick(ds)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onDayClick(ds);
								}
							}}
							className={cn(
								"flex min-h-28 cursor-pointer flex-col gap-1 border-r border-b p-1.5 text-left transition hover:bg-muted/40",
								!inMonth && "bg-muted/20 text-muted-foreground/60",
							)}
						>
							<span
								className={cn(
									"font-semibold text-xs",
									isToday &&
										"flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
								)}
							>
								{d.getDate()}
							</span>
							<div className="flex flex-col gap-0.5">
								{list.slice(0, 3).map((a) => {
									const sk = (a.status as AppointmentStatus) ?? "pending";
									const sc =
										APPOINTMENT_STATUS_CONFIG[sk] ??
										APPOINTMENT_STATUS_CONFIG.pending;
									const title = a.is_time_block
										? a.block_title || "Time block"
										: a.customer
											? `${a.customer.first_name} ${a.customer.last_name ?? ""}`.trim()
											: (a.lead_name ?? "Walk-in");
									return (
										<button
											key={a.id}
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onAppointmentClick(a);
											}}
											className={cn(
												"flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium",
												sc.badge,
											)}
										>
											<span
												className={cn("size-1.5 shrink-0 rounded-full", sc.dot)}
											/>
											<span className="truncate">{title}</span>
										</button>
									);
								})}
								{list.length > 3 && (
									<span className="text-[10px] text-muted-foreground">
										+{list.length - 3} more
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
