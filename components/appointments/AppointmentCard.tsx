"use client";

import { Phone, StickyNote, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppointmentHoverCard } from "@/components/appointments/AppointmentHoverCard";
import { useAppointmentTag } from "@/components/brand-config/AppointmentConfigProvider";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { LAST_HOUR, QUARTER_HEIGHT_PX } from "@/lib/calendar/layout";
import {
	APPOINTMENT_STATUS_CONFIG,
	type AppointmentStatus,
	PAYMENT_STATUS_CONFIG,
	type PaymentStatus,
} from "@/lib/constants/appointment-status";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	onClick: () => void;
	onContextMenu?: (e: React.MouseEvent, a: AppointmentWithRelations) => void;
	onResize?: (id: string, endIso: string) => void;
	style?: React.CSSProperties;
	draggable?: boolean;
};

export const APPOINTMENT_DRAG_MIME = "application/x-appointment-id";

export function AppointmentCard({
	appointment: a,
	onClick,
	onContextMenu,
	onResize,
	style,
	draggable = true,
}: Props) {
	const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [resizeHeightPx, setResizeHeightPx] = useState<number | null>(null);
	const resizeStateRef = useRef<{
		startY: number;
		startHeight: number;
		startMs: number;
		maxHeight: number;
		lastHeight: number;
	} | null>(null);

	useEffect(() => {
		if (!isDragging) return;
		return () => {
			document.body.classList.remove("dragging-appt");
		};
	}, [isDragging]);

	const styleHeight = style?.height;
	const currentHeightPx =
		typeof styleHeight === "number" ? styleHeight : QUARTER_HEIGHT_PX;

	const onResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!onResize) return;
		e.stopPropagation();
		e.preventDefault();
		(e.target as Element).setPointerCapture?.(e.pointerId);
		const startMs = new Date(a.start_at).getTime();
		const startDate = new Date(startMs);
		const dayEnd = new Date(startDate);
		dayEnd.setHours(LAST_HOUR + 1, 0, 0, 0);
		const maxMs = dayEnd.getTime();
		const maxMins = Math.max(15, (maxMs - startMs) / 60_000);
		const maxHeight = (maxMins / 15) * QUARTER_HEIGHT_PX;
		resizeStateRef.current = {
			startY: e.clientY,
			startHeight: currentHeightPx,
			startMs,
			maxHeight,
			lastHeight: currentHeightPx,
		};
		setResizeHeightPx(currentHeightPx);
		setHoverAnchor(null);
	};

	const onResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const s = resizeStateRef.current;
		if (!s) return;
		const deltaY = e.clientY - s.startY;
		const raw = s.startHeight + deltaY;
		const snapped = Math.max(
			QUARTER_HEIGHT_PX,
			Math.min(
				s.maxHeight,
				Math.round(raw / QUARTER_HEIGHT_PX) * QUARTER_HEIGHT_PX,
			),
		);
		s.lastHeight = snapped;
		setResizeHeightPx(snapped);
	};

	const onResizePointerUp = (_e: React.PointerEvent<HTMLDivElement>) => {
		const s = resizeStateRef.current;
		resizeStateRef.current = null;
		setResizeHeightPx(null);
		if (!s || !onResize) return;
		const mins = (s.lastHeight / QUARTER_HEIGHT_PX) * 15;
		const endIso = new Date(s.startMs + mins * 60_000).toISOString();
		if (endIso !== a.end_at) onResize(a.id, endIso);
	};

	const isBlock = a.is_time_block;
	const isLead = !isBlock && !a.customer_id && !!a.lead_name;
	const statusKey = (a.status as AppointmentStatus) ?? "pending";
	const sc =
		APPOINTMENT_STATUS_CONFIG[statusKey] ?? APPOINTMENT_STATUS_CONFIG.pending;
	const canResize =
		!!onResize && statusKey !== "completed" && statusKey !== "billing";
	const isResizing = resizeHeightPx != null;

	const firstTag = a.tags?.[0];
	const tagCfg = useAppointmentTag(firstTag);

	const showPaymentStatus =
		!isBlock &&
		!isLead &&
		(statusKey === "billing" || statusKey === "completed");
	const paymentKey = showPaymentStatus
		? (a.payment_status as PaymentStatus)
		: null;
	const paymentCfg = paymentKey ? PAYMENT_STATUS_CONFIG[paymentKey] : null;
	const showPaymentLabel =
		typeof styleHeight !== "number" || styleHeight >= 30;

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
					...(isResizing ? { height: resizeHeightPx ?? undefined } : null),
					backgroundColor: bg,
					borderColor,
					borderStyle: "solid",
					borderWidth: 1,
					borderLeftWidth: 5,
					opacity: isDragging ? 0.5 : 1,
					cursor: draggable ? "grab" : "pointer",
					zIndex: isResizing ? 50 : (style?.zIndex as number | undefined),
				}}
				className="relative flex flex-col items-start overflow-hidden rounded-sm px-2 py-1.5 text-left text-slate-900 shadow-sm transition hover:shadow-md"
			>
				{!isBlock && (
					<div className="absolute top-1 right-1 flex items-center gap-1">
						{paymentCfg &&
							(showPaymentLabel ? (
								<span
									aria-label={paymentCfg.label}
									className={cn(
										"rounded-sm px-1 py-[1px] text-[9px] font-bold uppercase leading-none tracking-wide",
										paymentCfg.badge,
									)}
								>
									{paymentCfg.label}
								</span>
							) : (
								<Tooltip>
									<TooltipTrigger asChild>
										<span
											aria-label={paymentCfg.label}
											className={cn("size-1.5 rounded-full", paymentCfg.dot)}
										/>
									</TooltipTrigger>
									<TooltipContent>{paymentCfg.label}</TooltipContent>
								</Tooltip>
							))}
						<sc.Icon
							aria-label={sc.label}
							className="size-[14px] shrink-0"
							strokeWidth={2.5}
							style={{ color: sc.solidHex }}
						>
							<title>{sc.label}</title>
						</sc.Icon>
					</div>
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
				{canResize && (
					<div
						role="separator"
						aria-label="Drag to resize"
						draggable={false}
						onDragStart={(e) => e.preventDefault()}
						onMouseDown={(e) => e.stopPropagation()}
						onClick={(e) => e.stopPropagation()}
						onPointerDown={onResizePointerDown}
						onPointerMove={onResizePointerMove}
						onPointerUp={onResizePointerUp}
						onPointerCancel={onResizePointerUp}
						className="absolute right-0 bottom-0 left-0 h-1.5 cursor-ns-resize hover:bg-slate-900/15"
						style={{
							backgroundColor: isResizing ? "rgba(15, 23, 42, 0.2)" : undefined,
							touchAction: "none",
						}}
					/>
				)}
			</button>
			{hoverAnchor && (
				<AppointmentHoverCard appointment={a} anchor={hoverAnchor} />
			)}
		</>
	);
}
