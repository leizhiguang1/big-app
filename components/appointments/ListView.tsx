"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { COLUMN_RENDERERS } from "@/components/appointments/column-registry";
import {
	COLUMN_LABELS,
	COLUMN_WIDTHS,
	type ColumnKey,
} from "@/lib/appointments/columns";
import { fmtDate } from "@/lib/roster/week";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	appointments: AppointmentWithRelations[];
	columnOrder: ColumnKey[];
	visibleColumns: ColumnKey[];
	onAppointmentClick: (a: AppointmentWithRelations) => void;
	onAppointmentContextMenu?: (
		e: React.MouseEvent,
		a: AppointmentWithRelations,
	) => void;
};

const WEEKDAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

function fmtDayHeader(d: Date): string {
	return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function ListView({
	appointments,
	columnOrder,
	visibleColumns,
	onAppointmentClick,
	onAppointmentContextMenu,
}: Props) {
	const today = fmtDate(new Date());
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

	const grouped = useMemo(() => {
		const map = new Map<string, AppointmentWithRelations[]>();
		for (const a of [...appointments].sort((a, b) =>
			a.start_at.localeCompare(b.start_at),
		)) {
			const key = fmtDate(new Date(a.start_at));
			const list = map.get(key);
			if (list) list.push(a);
			else map.set(key, [a]);
		}
		return Array.from(map.entries());
	}, [appointments]);

	const displayKeys = useMemo(() => {
		const visibleSet = new Set(visibleColumns);
		return columnOrder.filter((k) => visibleSet.has(k));
	}, [columnOrder, visibleColumns]);

	const totalMinWidth = useMemo(() => {
		let total = 48;
		for (const k of displayKeys) {
			const w = COLUMN_WIDTHS[k];
			if (w) {
				const n = Number.parseInt(w, 10);
				if (!Number.isNaN(n)) total += n;
			} else {
				total += 180;
			}
		}
		return total;
	}, [displayKeys]);

	if (appointments.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				No appointments found
			</div>
		);
	}

	return (
		<div
			className="overflow-auto rounded-md border bg-card"
			style={{ maxHeight: "calc(100vh - 14rem)" }}
		>
			{grouped.map(([dateKey, list]) => {
				const isCollapsed = collapsed[dateKey];
				const isTodayKey = dateKey === today;
				return (
					<div key={dateKey}>
						<button
							type="button"
							onClick={() =>
								setCollapsed((p) => ({ ...p, [dateKey]: !p[dateKey] }))
							}
							className="flex w-full items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-left"
						>
							<div className="flex items-center gap-2.5">
								<span
									className={cn(
										"font-semibold text-sm",
										isTodayKey && "text-amber-700",
									)}
								>
									{isTodayKey && "⭐ Today — "}
									{fmtDayHeader(new Date(dateKey))}
								</span>
								<span className="rounded-full bg-primary px-2 py-px font-semibold text-[11px] text-primary-foreground">
									{list.length}
								</span>
							</div>
							{isCollapsed ? (
								<ChevronDown className="size-4 text-muted-foreground" />
							) : (
								<ChevronUp className="size-4 text-muted-foreground" />
							)}
						</button>
						{!isCollapsed && (
							<table
								className="table-fixed text-sm"
								style={{ width: "100%", minWidth: `${totalMinWidth}px` }}
							>
								<colgroup>
									<col className="w-12" />
									{displayKeys.map((k) => {
										const width = COLUMN_WIDTHS[k];
										return (
											<col key={k} style={width ? { width } : undefined} />
										);
									})}
								</colgroup>
								<thead>
									<tr className="border-b bg-muted/20 text-left text-[11px] text-muted-foreground uppercase tracking-wide">
										<th className="px-3 py-2">No.</th>
										{displayKeys.map((k) => (
											<th key={k} className="px-3 py-2">
												{COLUMN_LABELS[k]}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{list.map((a, idx) => (
										<tr
											key={a.id}
											onClick={() => onAppointmentClick(a)}
											onContextMenu={(e) => {
												if (!onAppointmentContextMenu) return;
												e.preventDefault();
												onAppointmentContextMenu(e, a);
											}}
											className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40"
										>
											<td className="px-3 py-2 text-muted-foreground text-xs">
												{idx + 1}
											</td>
											{displayKeys.map((k) => (
												<td key={k} className="px-3 py-2 align-top">
													{COLUMN_RENDERERS[k](a)}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				);
			})}
		</div>
	);
}
