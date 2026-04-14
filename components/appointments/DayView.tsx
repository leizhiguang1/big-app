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
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { RosterEmployee } from "@/lib/services/employee-shifts";
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
	onCellClick,
	onAppointmentClick,
	onAppointmentContextMenu,
	onReschedule,
}: Props) {
	const [dragOverKey, setDragOverKey] = useState<string | null>(null);

	const columns: Column[] = useMemo(() => {
		if (resourceMode === "room") {
			return [
				...rooms.map((r) => ({ id: r.id, label: r.name })),
				{ id: null, label: "Unassigned" },
			];
		}
		return [
			...employees.map((e) => ({
				id: e.id,
				label: `${e.first_name} ${e.last_name}`,
			})),
			{ id: null, label: "Unassigned" },
		];
	}, [resourceMode, employees, rooms]);

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
					className="grid"
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
						return (
							<div
								key={c.id ?? "_unassigned"}
								className="relative border-r"
								style={{ height: TOTAL_GRID_HEIGHT_PX }}
							>
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
													employeeId: resourceMode === "employee" ? c.id : null,
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
													employeeId: resourceMode === "employee" ? c.id : null,
													roomId: resourceMode === "room" ? c.id : null,
												});
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
														: // quarter marks (:15, top of hour handled by prev hour's :45)
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
				</div>
			</div>
		</div>
	);
}
