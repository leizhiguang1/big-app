"use client";

import { Coffee, Moon, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	fmtDate,
	fmtDayHeader,
	fmtTime,
	getWeekDays,
	parseDate,
	shiftCoversDate,
} from "@/lib/roster/week";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { cn } from "@/lib/utils";
import { ShiftDialog } from "./ShiftDialog";

type Props = {
	outletId: string;
	weekStart: string;
	employees: RosterEmployee[];
	shifts: EmployeeShift[];
};

type DialogState = {
	employee: RosterEmployee;
	shiftDate: string;
	shift: EmployeeShift | null;
};

export function RosterGrid({ outletId, weekStart, employees, shifts }: Props) {
	const [dialog, setDialog] = useState<DialogState | null>(null);

	const weekDays = useMemo(
		() => getWeekDays(parseDate(weekStart)),
		[weekStart],
	);
	const today = fmtDate(new Date());

	const shiftsByEmployee = useMemo(() => {
		const map = new Map<string, EmployeeShift[]>();
		for (const s of shifts) {
			const list = map.get(s.employee_id);
			if (list) list.push(s);
			else map.set(s.employee_id, [s]);
		}
		return map;
	}, [shifts]);

	const findShift = (employeeId: string, dateStr: string) => {
		const list = shiftsByEmployee.get(employeeId);
		if (!list) return null;
		return list.find((s) => shiftCoversDate(s, dateStr)) ?? null;
	};

	if (employees.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-8 text-center text-muted-foreground text-sm">
				No bookable employees assigned to this outlet.
			</div>
		);
	}

	return (
		<>
			<div className="overflow-x-auto rounded-md border bg-card">
				<table className="w-full border-collapse text-sm">
					<thead>
						<tr className="border-b bg-muted/40">
							<th className="sticky left-0 z-10 min-w-44 border-r bg-muted px-3 py-2.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
								Employee
							</th>
							{weekDays.map((d) => {
								const dateStr = fmtDate(d);
								const isToday = dateStr === today;
								return (
									<th
										key={dateStr}
										className={cn(
											"min-w-32 px-1.5 py-2.5 text-center font-semibold text-muted-foreground text-[11px] uppercase tracking-wide",
											isToday && "border-primary border-b-2 text-primary",
										)}
									>
										{fmtDayHeader(d)}
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{employees.map((emp) => (
							<tr key={emp.id} className="border-b last:border-b-0">
								<td className="sticky left-0 z-10 min-w-44 border-r bg-card px-3 py-2 align-middle">
									<div className="flex items-center gap-2.5">
										<Avatar>
											{emp.profile_image_path && (
												<AvatarImage
													src={mediaPublicUrl(emp.profile_image_path) ?? ""}
													alt=""
												/>
											)}
											<AvatarFallback className="text-[11px]">
												{(emp.first_name[0] ?? "?").toUpperCase()}
												{(emp.last_name[0] ?? "").toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="flex min-w-0 flex-col">
											<span className="truncate font-medium text-[13px] leading-tight">
												{emp.first_name} {emp.last_name}
											</span>
											<span className="truncate text-[11px] text-muted-foreground leading-tight">
												{emp.position?.name ?? "—"}
											</span>
										</div>
									</div>
								</td>
								{weekDays.map((d) => {
									const dateStr = fmtDate(d);
									const shift = findShift(emp.id, dateStr);
									return (
										<td
											key={dateStr}
											className="border-l px-1.5 py-1.5 align-middle"
										>
											<ShiftCell
												shift={shift}
												onClick={() =>
													setDialog({
														employee: emp,
														shiftDate: dateStr,
														shift,
													})
												}
											/>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{dialog && (
				<ShiftDialog
					open={true}
					onClose={() => setDialog(null)}
					employee={dialog.employee}
					outletId={outletId}
					shiftDate={dialog.shiftDate}
					shift={dialog.shift}
				/>
			)}
		</>
	);
}

function ShiftCell({
	shift,
	onClick,
}: {
	shift: EmployeeShift | null;
	onClick: () => void;
}) {
	if (!shift) {
		return (
			<button
				type="button"
				onClick={onClick}
				className="flex h-9 w-full items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground text-xs transition hover:border-primary/40 hover:bg-muted hover:text-foreground"
			>
				<Plus className="size-3.5" />
				Add
			</button>
		);
	}
	const breakCount = Array.isArray(shift.breaks) ? shift.breaks.length : 0;
	return (
		<div className="flex h-9 items-center gap-1 rounded-md bg-sky-100 px-1.5 text-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
			<button
				type="button"
				onClick={onClick}
				className="flex min-w-0 flex-1 items-center gap-1 text-left font-semibold text-[11px] tabular-nums"
			>
				<span className="truncate">
					{fmtTime(shift.start_time)}–{fmtTime(shift.end_time)}
				</span>
				{shift.is_overnight && (
					<Moon
						className="size-3 shrink-0 text-sky-700 dark:text-sky-300"
						aria-label="Overnight"
					/>
				)}
				{breakCount > 0 && (
					<span
						className="flex shrink-0 items-center gap-0.5 text-[10px] text-sky-700 dark:text-sky-300"
						title={`${breakCount} break${breakCount === 1 ? "" : "s"}`}
					>
						<Coffee className="size-3" />
						{breakCount}
					</span>
				)}
			</button>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				disabled
				aria-label="Open in appointments (coming soon)"
				title="Coming soon"
				className="h-6 px-1.5 font-bold text-[10px] tracking-wide"
			>
				GO
			</Button>
		</div>
	);
}
