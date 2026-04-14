"use client";

import { useMemo, useState } from "react";
import {
	APPOINTMENT_DRAG_MIME,
	AppointmentCard,
} from "@/components/appointments/AppointmentCard";
import {
	cardStyle,
	dayStartIso,
	durationToHeight,
	formatHourLabel,
	HOUR_HEIGHT_PX,
	HOURS,
	layoutOverlaps,
	QUARTER_HEIGHT_PX,
	TOTAL_GRID_HEIGHT_PX,
	timeToY,
} from "@/lib/calendar/layout";
import { DAY_LABELS, fmtDate, getWeekDays, parseDate } from "@/lib/roster/week";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	weekStart: string;
	appointments: AppointmentWithRelations[];
	onCellClick: (args: {
		dateStr: string;
		hour: number;
		minute: number;
	}) => void;
	onAppointmentClick: (a: AppointmentWithRelations) => void;
	onAppointmentContextMenu?: (
		e: React.MouseEvent,
		a: AppointmentWithRelations,
	) => void;
	onReschedule?: (
		id: string,
		args: { dateStr: string; hour: number; minute: number },
	) => void;
};

// 15-minute subdivisions within each hour
const QUARTERS = [0, 15, 30, 45] as const;

const MONTHS_SHORT = [
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

function fmtDayHeaderComma(d: Date): string {
	const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
	return `${DAY_LABELS[dayIdx]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function WeekView({
	weekStart,
	appointments,
	onCellClick,
	onAppointmentClick,
	onAppointmentContextMenu,
	onReschedule,
}: Props) {
	const weekDays = useMemo(
		() => getWeekDays(parseDate(weekStart)),
		[weekStart],
	);
	const today = fmtDate(new Date());
	const [dragOverKey, setDragOverKey] = useState<string | null>(null);

	const aptsByDay = useMemo(() => {
		const map = new Map<string, AppointmentWithRelations[]>();
		for (const a of appointments) {
			const dateStr = fmtDate(new Date(a.start_at));
			const list = map.get(dateStr);
			if (list) list.push(a);
			else map.set(dateStr, [a]);
		}
		return map;
	}, [appointments]);

	return (
		<div className="h-[calc(100vh-11rem)] min-h-[450px] overflow-auto rounded-md border bg-card">
			<div className="min-w-[900px]">
				{/* Header row — frozen at top */}
				<div
					className="sticky top-0 z-20 grid border-b bg-card"
					style={{ gridTemplateColumns: `64px repeat(7, 1fr)` }}
				>
					{/* Corner cell — frozen at top-left */}
					<div className="sticky left-0 z-30 border-r bg-muted/40" />
					{weekDays.map((d) => {
						const dateStr = fmtDate(d);
						const isToday = dateStr === today;
						return (
							<div
								key={dateStr}
								className={cn(
									"border-r px-2 py-2.5 text-center font-semibold text-xs",
									isToday
										? "bg-amber-50/60 text-primary dark:bg-amber-900/10"
										: "text-muted-foreground",
								)}
							>
								{fmtDayHeaderComma(d)}
							</div>
						);
					})}
				</div>

				{/* Body: time gutter + 7 day columns */}
				<div
					className="grid"
					style={{ gridTemplateColumns: `64px repeat(7, 1fr)` }}
				>
					{/* Time gutter — frozen at left */}
					<div
						className="sticky left-0 z-10 border-r bg-card"
						style={{ height: TOTAL_GRID_HEIGHT_PX }}
					>
						<div className="relative h-full bg-muted/20">
							{HOURS.map((h, i) => (
								<div
									key={h}
									className="absolute right-1 rounded border bg-card px-1 py-px text-[10px] font-semibold text-muted-foreground tabular-nums leading-none shadow-sm"
									style={{ top: i * HOUR_HEIGHT_PX + 3 }}
								>
									{formatHourLabel(h)}
								</div>
							))}
						</div>
					</div>

					{weekDays.map((d) => {
						const dateStr = fmtDate(d);
						const isToday = dateStr === today;
						const dayApts = aptsByDay.get(dateStr) ?? [];
						const layout = layoutOverlaps(dayApts);
						const dayStart = dayStartIso(dateStr);
						return (
							<div
								key={dateStr}
								className={cn(
									"relative border-r",
									isToday && "bg-amber-50/60 dark:bg-amber-900/10",
								)}
								style={{ height: TOTAL_GRID_HEIGHT_PX }}
							>
								{/* 15-minute grid cells */}
								{HOURS.flatMap((h, hIdx) =>
									QUARTERS.map((min, qIdx) => {
										const cellKey = `${dateStr}|${h}|${min}`;
										const isDragOver = dragOverKey === cellKey;
										return (
											<button
												key={`${h}-${min}`}
												type="button"
												onClick={() =>
													onCellClick({ dateStr, hour: h, minute: min })
												}
												onDragOver={(e) => {
													if (!onReschedule) return;
													e.preventDefault();
													e.dataTransfer.dropEffect = "move";
													if (dragOverKey !== cellKey) setDragOverKey(cellKey);
												}}
												onDragLeave={() => {
													if (dragOverKey === cellKey) setDragOverKey(null);
												}}
												onDrop={(e) => {
													if (!onReschedule) return;
													const id = e.dataTransfer.getData(
														APPOINTMENT_DRAG_MIME,
													);
													setDragOverKey(null);
													if (!id) return;
													e.preventDefault();
													onReschedule(id, { dateStr, hour: h, minute: min });
												}}
												className={cn(
													"absolute left-0 right-0 hover:bg-primary/5",
													isDragOver &&
														"bg-primary/20 ring-2 ring-inset ring-primary/60",
													// hour boundary (bottom of :45 quarter)
													qIdx === 3
														? "border-b border-border/30"
														: // half-hour mark (:30)
															qIdx === 1
															? "border-b border-dashed border-muted/70"
															: // quarter marks (:15, :00 top handled by prev :45)
																"border-b border-dashed border-muted/40",
												)}
												style={{
													top: hIdx * HOUR_HEIGHT_PX + qIdx * QUARTER_HEIGHT_PX,
													height: QUARTER_HEIGHT_PX,
												}}
											/>
										);
									}),
								)}

								{dayApts.map((a) => {
									const top = timeToY(a.start_at, dayStart);
									const height = durationToHeight(a.start_at, a.end_at);
									const slot = layout.get(a.id);
									return (
										<AppointmentCard
											key={a.id}
											appointment={a}
											style={cardStyle(slot, top, height)}
											onClick={() => onAppointmentClick(a)}
											onContextMenu={onAppointmentContextMenu}
										/>
									);
								})}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
