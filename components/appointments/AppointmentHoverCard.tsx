"use client";

import { Clock, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	APPOINTMENT_STATUS_CONFIG,
	APPOINTMENT_TAG_CONFIG,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import type { AppointmentWithRelations } from "@/lib/services/appointments";

const POPUP_WIDTH = 300;
const POPUP_EST_HEIGHT = 360;
const PAD = 8;

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
	const phone = a.customer?.phone ?? a.lead_phone ?? null;
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
	const tagCfg = firstTag ? APPOINTMENT_TAG_CONFIG[firstTag] : null;
	const subtitle = isBlock ? null : isLead ? "Walk-in Lead" : "Appointment";

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
				<div className="text-[11px] opacity-90">—</div>
			</div>

			{/* Header section */}
			{!isBlock && (
				<div className="px-3 pt-3 pb-2 text-center">
					{a.booking_ref && (
						<div className="font-bold text-[15px] text-slate-900 tabular-nums">
							{a.booking_ref}
						</div>
					)}
					{subtitle && (
						<div className="text-[11px] text-slate-500">({subtitle})</div>
					)}
					{customerName && (
						<div className="mt-2 font-bold text-[20px] text-sky-600">
							{customerName}
						</div>
					)}
					{phone && (
						<div className="mt-1 flex items-center justify-center gap-1.5 font-bold text-[15px] text-slate-900">
							<Phone className="size-4 shrink-0" />
							<span className="tabular-nums">{phone}</span>
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
