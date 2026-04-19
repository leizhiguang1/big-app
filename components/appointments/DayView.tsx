"use client";

import { useEffect, useMemo, useState } from "react";
import {
	APPOINTMENT_DRAG_MIME,
	AppointmentCard,
} from "@/components/appointments/AppointmentCard";
import {
	cardStyle,
	dayStartIso,
	durationToHeight,
	FIRST_HOUR,
	formatHourLabel,
	HOUR_HEIGHT_PX,
	HOURS,
	LAST_HOUR,
	layoutOverlaps,
	minutesToY,
	QUARTER_HEIGHT_PX,
	TOTAL_GRID_HEIGHT_PX,
	timeToY,
} from "@/lib/calendar/layout";
import {
	fmtDate,
	getNonRosteredBands,
	getRosteredRangesOnDate,
	type MinuteRange,
	shiftCoversDate,
} from "@/lib/roster/week";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { Room } from "@/lib/services/outlets";
import { cn } from "@/lib/utils";

type ResourceMode = "employee" | "room";

type Props = {
	dateStr: string;
	resourceMode: ResourceMode;
	appointments: AppointmentWithRelations[];
	employees: RosterEmployee[];
	rooms: Room[];
	onCellClick: (args: {
		dateStr: string;
		hour: number;
		minute: number;
		employeeId: string | null;
		roomId: string | null;
	}) => void;
	onAppointmentClick: (a: AppointmentWithRelations) => void;
	onAppointmentContextMenu?: (
		e: React.MouseEvent,
		a: AppointmentWithRelations,
	) => void;
	shifts: EmployeeShift[];
	onReschedule?: (
		id: string,
		args: {
			dateStr: string;
			hour: number;
			minute: number;
			employeeId: string | null;
			roomId: string | null;
		},
	) => void;
};

type Column = {
	id: string | null; // null = unassigned
	label: string;
};

// 15-minute subdivisions within each hour
const QUARTERS = [0, 15, 30, 45] as const;

export function DayView({
	dateStr,
	resourceMode,
	appointments,
	employees,
	rooms,
	shifts,
	onCellClick,
	onAppointmentClick,
	onAppointmentContextMenu,
	onReschedule,
}: Props) {
	const [dragOverKey, setDragOverKey] = useState<string | null>(null);

	// In employee mode, only show employees who are rostered on this date
	// OR already have an appointment on this date.
	const rosteredEmployees = useMemo(() => {
		if (resourceMode !== "employee") return employees;
		const employeeIdsWithShift = new Set(
			shifts
				.filter((s) => shiftCoversDate(s, dateStr))
				.map((s) => s.employee_id),
		);
		const employeeIdsWithAppt = new Set(
			appointments
				.filter(
					(a) => a.employee_id && fmtDate(new Date(a.start_at)) === dateStr,
				)
				.map((a) => a.employee_id),
		);
		return employees.filter(
			(e) => employeeIdsWithShift.has(e.id) || employeeIdsWithAppt.has(e.id),
		);
	}, [resourceMode, employees, shifts, appointments, dateStr]);

	const hasUnassigned = useMemo(() => {
		if (resourceMode === "room") {
			return appointments.some((a) => !a.room_id);
		}
		return appointments.some((a) => !a.employee_id);
	}, [appointments, resourceMode]);

	const columns: Column[] = useMemo(() => {
		const cols: Column[] =
			resourceMode === "room"
				? rooms.map((r) => ({ id: r.id, label: r.name }))
				: rosteredEmployees.map((e) => ({
						id: e.id,
						label: `${e.first_name} ${e.last_name}`,
					}));
		if (hasUnassigned) cols.push({ id: null, label: "Unassigned" });
		return cols;
	}, [resourceMode, rosteredEmployees, rooms, hasUnassigned]);

	const aptsByColumn = useMemo(() => {
		const map = new Map<string, AppointmentWithRelations[]>();
		for (const a of appointments) {
			const key =
				resourceMode === "room" ? (a.room_id ?? "_") : (a.employee_id ?? "_");
			const list = map.get(key);
			if (list) list.push(a);
			else map.set(key, [a]);
		}
		return map;
	}, [appointments, resourceMode]);

	const dayStart = dayStartIso(dateStr);

	// Per-employee non-rostered bands (employee mode only). Used to grey out
	// time outside the employee's roster on this date.
	const nonRosteredBandsByEmployee = useMemo(() => {
		const map = new Map<string, MinuteRange[]>();
		if (resourceMode !== "employee") return map;
		const windowStart = FIRST_HOUR * 60;
		const windowEnd = (LAST_HOUR + 1) * 60;
		for (const e of rosteredEmployees) {
			const empShifts = shifts.filter((s) => s.employee_id === e.id);
			const ranges = getRosteredRangesOnDate(empShifts, dateStr);
			map.set(e.id, getNonRosteredBands(ranges, windowStart, windowEnd));
		}
		return map;
	}, [resourceMode, rosteredEmployees, shifts, dateStr]);

	// Live "now" tick for the current-time line. Initialised after mount to
	// avoid SSR/CSR hydration drift across a minute boundary.
	const [now, setNow] = useState<Date | null>(null);
	useEffect(() => {
		setNow(new Date());
		const id = setInterval(() => setNow(new Date()), 60_000);
		return () => clearInterval(id);
	}, []);
	const isToday = now !== null && fmtDate(now) === dateStr;
	const nowY = isToday && now ? timeToY(now.toISOString(), dayStart) : 0;
	const showNowLine = isToday && nowY >= 0 && nowY <= TOTAL_GRID_HEIGHT_PX;

	return (
		<div className="h-[calc(100vh-11rem)] min-h-[450px] overflow-auto rounded-md border bg-card">
			<div style={{ minWidth: Math.max(900, columns.length * 160 + 64) }}>
				{/* Header row — frozen at top */}
				<div
					className="sticky top-0 z-20 grid border-b bg-card"
					style={{
						gridTemplateColumns: `64px repeat(${columns.length}, minmax(140px, 1fr))`,
					}}
				>
					{/* Corner cell — frozen at top-left */}
					<div className="sticky left-0 z-30 border-r bg-muted/40" />
					{columns.map((c) => (
						<div
							key={c.id ?? "_unassigned"}
							className={cn(
								"truncate border-r px-2 py-2.5 text-center font-semibold text-[11px] text-muted-foreground uppercase tracking-wide",
							)}
						>
							{c.label}
						</div>
					))}
				</div>

				{/* Body */}
				<div
					className="relative grid"
					style={{
						gridTemplateColumns: `64px repeat(${columns.length}, minmax(140px, 1fr))`,
					}}
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

					{columns.map((c) => {
						const colKey = c.id ?? "_";
						const colApts = aptsByColumn.get(colKey) ?? [];
						const layout = layoutOverlaps(colApts);
						const greyBands = c.id
							? (nonRosteredBandsByEmployee.get(c.id) ?? [])
							: [];
						return (
							<div
								key={c.id ?? "_unassigned"}
								className="relative border-r"
								style={{ height: TOTAL_GRID_HEIGHT_PX }}
							>
								{/* Non-rostered greyout — pointer-events-none so cells stay clickable */}
								{greyBands.map((b) => {
									const top = minutesToY(b.startMin);
									const bottom = minutesToY(b.endMin);
									return (
										<div
											key={`grey-${b.startMin}-${b.endMin}`}
											className="pointer-events-none absolute right-0 left-0 z-0 bg-muted/60"
											style={{ top, height: Math.max(0, bottom - top) }}
											aria-hidden
										/>
									);
								})}

								{/* 15-minute grid cells */}
								{HOURS.flatMap((h, hIdx) =>
									QUARTERS.map((min, qIdx) => {
										const cellKey = `${colKey}|${h}|${min}`;
										const isDragOver = dragOverKey === cellKey;
										return (
											<button
												key={`${h}-${min}`}
												type="button"
												onClick={() =>
													onCellClick({
														dateStr,
														hour: h,
														minute: min,
														employeeId:
															resourceMode === "employee" ? c.id : null,
														roomId: resourceMode === "room" ? c.id : null,
													})
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
													onReschedule(id, {
														dateStr,
														hour: h,
														minute: min,
														employeeId:
															resourceMode === "employee" ? c.id : null,
														roomId: resourceMode === "room" ? c.id : null,
													});
												}}
												className={cn(
													"absolute left-0 right-0 hover:bg-primary/5",
													isDragOver &&
														"bg-primary/20 ring-2 ring-inset ring-primary/60",
													// hour boundary (bottom of :45 quarter)
													qIdx === 3
														? "border-b border-border"
														: // half-hour mark (:30)
															qIdx === 1
															? "border-b border-dashed border-border/70"
															: // quarter marks (:15, top of hour handled by prev hour's :45)
																"border-b border-dashed border-border/40",
												)}
												style={{
													top: hIdx * HOUR_HEIGHT_PX + qIdx * QUARTER_HEIGHT_PX,
													height: QUARTER_HEIGHT_PX,
												}}
											/>
										);
									}),
								)}

								{colApts.map((a) => {
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

					{/* Current-time line — single span across all columns. z-9 keeps
					    it above appointment cards (max ~z-5) but below the sticky
					    time gutter (z-10), so the gutter masks the portion that
					    scrolls under it during horizontal scroll. */}
					{showNowLine && (
						<div
							className="pointer-events-none absolute right-0 z-[9] h-px bg-red-500"
							style={{ top: nowY, left: 64 }}
							aria-hidden
						>
							<div className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-0 h-2.5 w-2.5 rounded-full bg-red-500" />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
