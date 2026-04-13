"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
	APPOINTMENT_STATUS_CONFIG,
	APPOINTMENT_TAG_CONFIG,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import { fmtDate } from "@/lib/roster/week";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	appointments: AppointmentWithRelations[];
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

function fmt12h(iso: string): string {
	const d = new Date(iso);
	let h = d.getHours();
	const m = String(d.getMinutes()).padStart(2, "0");
	const ampm = h < 12 ? "am" : "pm";
	h = h % 12 || 12;
	return `${h}:${m} ${ampm}`;
}

export function ListView({
	appointments,
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
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/20 text-left text-[11px] text-muted-foreground uppercase tracking-wide">
										<th className="px-3 py-2">No.</th>
										<th className="px-3 py-2">Customer / block</th>
										<th className="px-3 py-2">Booking ref</th>
										<th className="px-3 py-2">Employee</th>
										<th className="px-3 py-2">Room</th>
										<th className="px-3 py-2">Time</th>
										<th className="px-3 py-2">Status</th>
										<th className="px-3 py-2">Payment</th>
									</tr>
								</thead>
								<tbody>
									{list.map((a, idx) => {
										const sk = (a.status as AppointmentStatus) ?? "pending";
										const sc =
											APPOINTMENT_STATUS_CONFIG[sk] ??
											APPOINTMENT_STATUS_CONFIG.pending;
										const isBlock = a.is_time_block;
										const isLead = !isBlock && !a.customer_id && !!a.lead_name;
										const primary = isBlock
											? a.block_title || "Time block"
											: a.customer
												? `${a.customer.first_name} ${a.customer.last_name ?? ""}`.trim()
												: (a.lead_name ?? "Walk-in");
										const phone = a.customer?.phone ?? a.lead_phone ?? null;
										const refSuffix = a.customer?.code
											? ` | ${a.customer.code}`
											: isLead
												? " | LEAD"
												: "";
										return (
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
												<td className="px-3 py-2">
													<div className="flex items-center gap-1.5 font-semibold text-[13px]">
														{isLead && (
															<span className="rounded bg-amber-200 px-1 py-px font-bold text-[9px] text-amber-900 uppercase">
																Lead
															</span>
														)}
														{isBlock && (
															<span className="rounded bg-slate-600 px-1 py-px font-bold text-[9px] text-white uppercase">
																Block
															</span>
														)}
														<span>{primary}</span>
													</div>
													{phone && (
														<div className="text-[11px] text-muted-foreground">
															{phone}
														</div>
													)}
													{(a.tags?.length ?? 0) > 0 && (
														<div className="mt-1 flex flex-wrap gap-1">
															{a.tags.map((t) => {
																const tc = APPOINTMENT_TAG_CONFIG[t];
																return (
																	<span
																		key={t}
																		className="rounded px-1 py-px font-semibold text-[9px] text-white"
																		style={{
																			backgroundColor: tc?.dot ?? "#94a3b8",
																		}}
																	>
																		{tc?.label ?? t}
																	</span>
																);
															})}
														</div>
													)}
												</td>
												<td className="px-3 py-2 font-medium text-sky-600 text-xs tabular-nums">
													{a.booking_ref}
													{refSuffix}
												</td>
												<td className="px-3 py-2 text-xs">
													{a.employee
														? `${a.employee.first_name} ${a.employee.last_name}`
														: "—"}
												</td>
												<td className="px-3 py-2 text-xs">
													{a.room?.name ?? "—"}
												</td>
												<td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">
													{fmt12h(a.start_at)} – {fmt12h(a.end_at)}
												</td>
												<td className="px-3 py-2">
													{isBlock ? (
														<span className="text-muted-foreground text-xs">
															—
														</span>
													) : (
														<span
															className={cn(
																"inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold text-[10px]",
																sc.badge,
															)}
														>
															<sc.Icon className="size-3" />
															{sc.label}
														</span>
													)}
												</td>
												<td className="px-3 py-2">
													{isBlock ? (
														<span className="text-muted-foreground text-xs">
															—
														</span>
													) : (
														<span
															className={cn(
																"inline-flex rounded px-2 py-0.5 font-semibold text-[10px] uppercase",
																a.payment_status === "paid"
																	? "bg-emerald-100 text-emerald-700"
																	: a.payment_status === "partial"
																		? "bg-yellow-100 text-yellow-700"
																		: "bg-red-100 text-red-700",
															)}
														>
															{a.payment_status ?? "unpaid"}
														</span>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
				);
			})}
		</div>
	);
}
