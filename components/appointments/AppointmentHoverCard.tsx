"use client";

import { Clock, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	useAppointmentPilotSettings,
	useAppointmentTag,
} from "@/components/brand-config/AppointmentConfigProvider";
import {
	APPOINTMENT_STATUS_CONFIG,
	type AppointmentStatus,
	PAYMENT_STATUS_CONFIG,
	type PaymentStatus,
} from "@/lib/constants/appointment-status";
import type {
	AppointmentLineItemSummary,
	AppointmentSalesOrderSummary,
	AppointmentWithRelations,
} from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

const POPUP_WIDTH = 320;
const POPUP_EST_HEIGHT = 520;
const PAD = 8;
const MAX_SERVICE_ROWS = 5;

type Props = {
	appointment: AppointmentWithRelations;
	anchor: DOMRect;
};

function fmtClock(iso: string) {
	const d = new Date(iso);
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function durationLabel(start: string, end: string) {
	const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
	if (!Number.isFinite(diff) || diff <= 0) return "";
	const h = Math.floor(diff / 60);
	const m = Math.round(diff % 60);
	return `${String(h).padStart(2, "0")}H:${String(m).padStart(2, "0")}M`;
}

function fmtMoney(n: number): string {
	return `MYR ${n.toFixed(2)}`;
}

function pickActiveSalesOrder(
	sos: AppointmentSalesOrderSummary[],
): AppointmentSalesOrderSummary | null {
	const live = sos.filter((so) => so.status !== "void");
	return live[0] ?? null;
}

function dominantCategoryName(
	items: AppointmentLineItemSummary[],
): string | null {
	if (items.length === 0) return null;
	const totals = new Map<string, number>();
	for (const it of items) {
		const name = it.service?.category?.name;
		if (!name) continue;
		totals.set(name, (totals.get(name) ?? 0) + Number(it.total ?? 0));
	}
	let best: { name: string; total: number } | null = null;
	for (const [name, total] of totals.entries()) {
		if (!best || total > best.total) best = { name, total };
	}
	return best?.name ?? null;
}

export function AppointmentHoverCard({ appointment: a, anchor }: Props) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;

	const isBlock = a.is_time_block;
	const isLead = !isBlock && !a.customer_id && !!a.lead_name;
	const statusKey = (a.status as AppointmentStatus) ?? "pending";
	const sc =
		APPOINTMENT_STATUS_CONFIG[statusKey] ?? APPOINTMENT_STATUS_CONFIG.pending;
	const headerLabel = isBlock ? "Time Block" : sc.label;
	const headerHex = isBlock ? "#64748b" : sc.solidHex;

	let left = anchor.right + PAD;
	let top = anchor.top;
	if (left + POPUP_WIDTH > window.innerWidth - PAD) {
		left = Math.max(PAD, anchor.left - POPUP_WIDTH - PAD);
	}
	if (top + POPUP_EST_HEIGHT > window.innerHeight - PAD) {
		top = Math.max(PAD, window.innerHeight - POPUP_EST_HEIGHT - PAD);
	}
	const onLeftSide = left < anchor.left;

	const customerName = a.customer
		? `${a.customer.first_name} ${a.customer.last_name ?? ""}`.trim()
		: (a.lead_name ?? null);
	const customerCode = a.customer?.code ?? null;
	const phone = a.customer?.phone ?? a.lead_phone ?? null;
	const phone2 = a.customer?.phone2 ?? null;
	const employeeName = a.employee
		? `${a.employee.first_name} ${a.employee.last_name}`
		: null;
	const leadAttendedByName = a.lead_attended_by
		? `${a.lead_attended_by.first_name} ${a.lead_attended_by.last_name}`
		: null;
	const createdByName = a.created_by_employee
		? `${a.created_by_employee.first_name} ${a.created_by_employee.last_name}`
		: null;
	const dur = durationLabel(a.start_at, a.end_at);
	const timeLine = `${fmtClock(a.start_at)} - ${fmtClock(a.end_at)}${dur ? ` (${dur})` : ""}`;
	const firstTag = a.tags?.[0];
	const tagCfg = useAppointmentTag(firstTag);

	const activeItems = (a.line_items ?? []).filter((li) => !li.is_cancelled);
	const activeSO = pickActiveSalesOrder(a.sales_orders ?? []);
	const appointmentValue = activeSO
		? Number(activeSO.total)
		: activeItems.reduce((sum, it) => sum + Number(it.total ?? 0), 0);
	const { hideValueOnHover } = useAppointmentPilotSettings();
	const hasMoney =
		!isBlock &&
		!hideValueOnHover &&
		(activeSO !== null || activeItems.length > 0);
	const outstanding = activeSO ? Number(activeSO.outstanding ?? 0) : null;

	const paymentKey =
		!isBlock && !isLead ? (a.payment_status as PaymentStatus) : null;
	const paymentCfg = paymentKey ? PAYMENT_STATUS_CONFIG[paymentKey] : null;

	const category = dominantCategoryName(activeItems);
	const subtitle = isBlock
		? null
		: category
			? category.toUpperCase()
			: isLead
				? "Walk-in Lead"
				: "Appointment";

	const visibleServices = activeItems.slice(0, MAX_SERVICE_ROWS);
	const hiddenServices = Math.max(0, activeItems.length - MAX_SERVICE_ROWS);
	const soPrefix = activeSO ? `(${activeSO.so_number}) ` : "";

	const node = (
		<div
			style={{
				position: "fixed",
				left,
				top,
				width: POPUP_WIDTH,
				zIndex: 10050,
				pointerEvents: "none",
			}}
			className="overflow-visible rounded-xl border border-border bg-white shadow-2xl"
		>
			<div
				style={{
					position: "absolute",
					top: 18,
					...(onLeftSide ? { right: -5 } : { left: -5 }),
					width: 0,
					height: 0,
					borderTop: "6px solid transparent",
					borderBottom: "6px solid transparent",
					...(onLeftSide
						? { borderLeft: `6px solid ${headerHex}` }
						: { borderRight: `6px solid ${headerHex}` }),
				}}
			/>

			{/* Status banner */}
			<div
				className="rounded-t-xl px-3 py-2.5 text-center text-white"
				style={{ background: headerHex }}
			>
				<div className="font-bold text-[14px] uppercase tracking-wide">
					{headerLabel}
				</div>
				{paymentCfg && (
					<div className="mt-1 flex justify-center">
						<span
							className={cn(
								"inline-flex rounded-full px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide",
								paymentCfg.badge,
							)}
						>
							{paymentCfg.label}
						</span>
					</div>
				)}
			</div>

			{/* Header section */}
			{!isBlock && (
				<div className="px-3 pt-3 pb-2 text-center">
					{a.booking_ref && (
						<div className="font-bold text-[15px] text-slate-900 tabular-nums">
							{a.booking_ref}
							{subtitle && (
								<span className="ml-1 font-semibold text-[11px] text-slate-500">
									({subtitle})
								</span>
							)}
						</div>
					)}
					{customerName && (
						<div className="mt-2 font-bold text-[20px] text-sky-600">
							{customerName}
						</div>
					)}
					{customerCode && (
						<div className="text-[11px] font-semibold tabular-nums text-slate-500">
							{customerCode}
						</div>
					)}
					{phone && (
						<div className="mt-1 flex items-center justify-center gap-1.5 font-bold text-[14px] text-slate-900">
							<Phone className="size-4 shrink-0" />
							<span className="tabular-nums">{phone}</span>
						</div>
					)}
					{phone2 && (
						<div className="mt-0.5 flex items-center justify-center gap-1.5 font-bold text-[14px] text-slate-900">
							<Phone className="size-4 shrink-0" />
							<span className="tabular-nums">{phone2}</span>
						</div>
					)}
				</div>
			)}

			{isBlock && a.block_title?.trim() && (
				<div className="px-3 pt-3 pb-2 text-center">
					<div className="font-bold text-[16px] text-slate-900">
						{a.block_title.trim()}
					</div>
				</div>
			)}

			{/* Details card */}
			<div className="px-3 pb-3">
				<div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-[12px] text-slate-700 shadow-sm">
					<div className="flex items-center gap-1.5">
						<Clock className="size-3.5 shrink-0 opacity-70" />
						<span>{timeLine}</span>
					</div>

					{employeeName && (
						<div className="uppercase text-slate-500">{employeeName}</div>
					)}

					{a.room?.name && <div className="text-slate-500">{a.room.name}</div>}

					{leadAttendedByName && (
						<div>
							<div className="font-bold text-slate-900">Lead Attended By</div>
							<div className="uppercase text-slate-500">
								{leadAttendedByName}
							</div>
						</div>
					)}

					{hasMoney && outstanding !== null && (
						<div>
							<span className="font-bold text-slate-900">Outstanding: </span>
							<span
								className={cn(
									"font-bold tabular-nums",
									outstanding > 0 ? "text-red-600" : "text-emerald-700",
								)}
							>
								{fmtMoney(outstanding)}
							</span>
						</div>
					)}

					{hasMoney && visibleServices.length > 0 && (
						<div>
							<div className="font-bold text-slate-900">Service:</div>
							<ul className="mt-0.5 space-y-0.5 text-slate-600">
								{visibleServices.map((it) => {
									const sku = it.service?.sku;
									const name = it.service?.name ?? it.description;
									const qty = Number(it.quantity);
									return (
										<li key={it.id} className="leading-snug">
											{soPrefix}
											{sku ? `(${sku}) ` : ""}
											{name.toUpperCase()}
											{qty > 1 ? ` × ${qty}` : ""}
										</li>
									);
								})}
								{hiddenServices > 0 && (
									<li className="text-slate-400">+{hiddenServices} more</li>
								)}
							</ul>
						</div>
					)}

					{hasMoney && (
						<div>
							<div className="font-bold text-slate-900">Appointment Value</div>
							<div className="font-bold tabular-nums text-emerald-700">
								{fmtMoney(appointmentValue)}
							</div>
						</div>
					)}

					{!isBlock && a.notes?.trim() && (
						<div>
							<span className="font-bold text-slate-900">Remarks: </span>
							<span className="whitespace-pre-wrap">{a.notes.trim()}</span>
						</div>
					)}

					{firstTag && tagCfg && (
						<div
							className="inline-block rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-900"
							style={{ backgroundColor: tagCfg.bg }}
						>
							{tagCfg.label}
						</div>
					)}

					{createdByName && (
						<div className="pt-1">
							<div className="font-bold text-slate-900">Created By</div>
							<div className="uppercase text-slate-500">{createdByName}</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);

	return createPortal(node, document.body);
}
