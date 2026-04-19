"use client";

import { Phone, StickyNote, User } from "lucide-react";
import { useEffect, useState } from "react";
import { AppointmentHoverCard } from "@/components/appointments/AppointmentHoverCard";
import {
	APPOINTMENT_STATUS_CONFIG,
	APPOINTMENT_TAG_CONFIG,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import type { AppointmentWithRelations } from "@/lib/services/appointments";

type Props = {
	appointment: AppointmentWithRelations;
	onClick: () => void;
	onContextMenu?: (e: React.MouseEvent, a: AppointmentWithRelations) => void;
	style?: React.CSSProperties;
	draggable?: boolean;
};

export const APPOINTMENT_DRAG_MIME = "application/x-appointment-id";

export function AppointmentCard({
	appointment: a,
	onClick,
	onContextMenu,
	style,
	draggable = true,
}: Props) {
	const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		if (!isDragging) return;
		return () => {
			document.body.classList.remove("dragging-appt");
		};
	}, [isDragging]);

	const isBlock = a.is_time_block;
	const isLead = !isBlock && !a.customer_id && !!a.lead_name;
	const statusKey = (a.status as AppointmentStatus) ?? "pending";
	const sc =
		APPOINTMENT_STATUS_CONFIG[statusKey] ?? APPOINTMENT_STATUS_CONFIG.pending;

	const firstTag = a.tags?.[0];
	const tagCfg = firstTag ? APPOINTMENT_TAG_CONFIG[firstTag] : null;

	const bg = isBlock ? "#cbd5e1" : tagCfg ? tagCfg.bg : "#ffffff";
	const borderColor = isBlock ? "#475569" : sc.solidHex;

	const title = isBlock
		? a.block_title || "Blocked"
		: a.customer
			? `${a.customer.first_name} ${a.customer.last_name ?? ""}`.trim()
			: (a.lead_name ?? "Walk-in");

	const idLine = isBlock
		? null
		: [a.booking_ref, a.customer?.code ?? (isLead ? "LEAD" : null)]
				.filter(Boolean)
				.join(" | ");

	const remarks = !isBlock ? a.notes?.trim() : null;

	const employeeName = a.employee
		? `${a.employee.first_name} ${a.employee.last_name}`
		: null;
	const phone = a.customer?.phone ?? a.lead_phone ?? null;

	return (
		<>
			<button
				type="button"
				data-appt-card
				data-dragging={isDragging ? "true" : undefined}
				data-shake={!isBlock && statusKey === "billing" ? "true" : undefined}
				draggable={draggable}
				onDragStart={(e) => {
					e.stopPropagation();
					e.dataTransfer.setData(APPOINTMENT_DRAG_MIME, a.id);
					e.dataTransfer.effectAllowed = "move";
					setHoverAnchor(null);
					setIsDragging(true);
					document.body.classList.add("dragging-appt");
					const cleanup = () => {
						document.body.classList.remove("dragging-appt");
						document.removeEventListener("dragend", cleanup, true);
						document.removeEventListener("drop", cleanup, true);
					};
					document.addEventListener("dragend", cleanup, true);
					document.addEventListener("drop", cleanup, true);
				}}
				onDragEnd={() => {
					setIsDragging(false);
					document.body.classList.remove("dragging-appt");
				}}
				onClick={(e) => {
					e.stopPropagation();
					setHoverAnchor(null);
					onClick();
				}}
				onContextMenu={(e) => {
					if (!onContextMenu) return;
					e.preventDefault();
					e.stopPropagation();
					setHoverAnchor(null);
					onContextMenu(e, a);
				}}
				onMouseEnter={(e) =>
					setHoverAnchor(e.currentTarget.getBoundingClientRect())
				}
				onMouseLeave={() => setHoverAnchor(null)}
				style={{
					...style,
					backgroundColor: bg,
					borderColor,
					borderStyle: "solid",
					borderWidth: 1,
					borderLeftWidth: 5,
					opacity: isDragging ? 0.5 : 1,
					cursor: draggable ? "grab" : "pointer",
				}}
				className="relative flex flex-col items-start overflow-hidden rounded-sm px-2 py-1.5 text-left text-slate-900 shadow-sm transition hover:shadow-md"
			>
				{!isBlock && (
					<sc.Icon
						aria-label={sc.label}
						className="absolute top-1 right-1 size-[14px] shrink-0"
						strokeWidth={2.5}
						style={{ color: sc.solidHex }}
					>
						<title>{sc.label}</title>
					</sc.Icon>
				)}
				<div className="w-full shrink-0 truncate pr-4 font-bold text-[12px] leading-tight">
					{title}
				</div>
				{idLine && (
					<div className="w-full shrink-0 truncate text-[10px] font-semibold leading-tight tabular-nums text-slate-500">
						{idLine}
					</div>
				)}
				{remarks && (
					<div className="mt-0.5 flex w-full shrink-0 items-start gap-1 text-[10px] leading-tight text-slate-700">
						<StickyNote className="mt-px size-[11px] shrink-0 opacity-70" />
						<span className="min-w-0 truncate italic">{remarks}</span>
					</div>
				)}
				{employeeName && (
					<div className="mt-0.5 flex w-full shrink-0 items-center gap-1 text-[10px] leading-tight text-slate-700">
						<User className="size-[11px] shrink-0 opacity-70" />
						<span className="min-w-0 truncate">{employeeName}</span>
					</div>
				)}
				{phone && (
					<div className="mt-0.5 flex w-full shrink-0 items-center gap-1 text-[10px] leading-tight text-slate-700">
						<Phone className="size-[11px] shrink-0 opacity-70" />
						<span className="min-w-0 truncate tabular-nums">{phone}</span>
					</div>
				)}
				{firstTag && tagCfg && (
					<div
						className="mt-1 inline-flex shrink-0 rounded-sm px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-white"
						style={{ backgroundColor: tagCfg.dot }}
					>
						{tagCfg.label}
					</div>
				)}
			</button>
			{hoverAnchor && (
				<AppointmentHoverCard appointment={a} anchor={hoverAnchor} />
			)}
		</>
	);
}
