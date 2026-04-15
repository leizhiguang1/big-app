"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	APPOINTMENT_STATUS_CONFIG,
	APPOINTMENT_STATUSES,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	x: number;
	y: number;
	appointment: AppointmentWithRelations;
	onClose: () => void;
	onSetStatus: (status: AppointmentStatus) => void;
	onEdit: () => void;
	onDelete: () => void;
};

export function AppointmentContextMenu({
	x,
	y,
	appointment,
	onClose,
	onSetStatus,
	onEdit,
	onDelete,
}: Props) {
	const menuRef = useRef<HTMLDivElement>(null);
	const subRef = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ left: x, top: y });
	const [showStatus, setShowStatus] = useState(false);
	const [subFlip, setSubFlip] = useState({ x: false, y: false });
	const visitKey = (appointment.status as AppointmentStatus) ?? "pending";

	useLayoutEffect(() => {
		const el = menuRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const pad = 8;
		let left = x;
		let top = y;
		if (left + rect.width > window.innerWidth - pad)
			left = window.innerWidth - rect.width - pad;
		if (top + rect.height > window.innerHeight - pad)
			top = window.innerHeight - rect.height - pad;
		setPos({ left: Math.max(pad, left), top: Math.max(pad, top) });
	}, [x, y]);

	useLayoutEffect(() => {
		if (!showStatus) return;
		const sub = subRef.current;
		const parent = menuRef.current;
		if (!sub || !parent) return;
		const sr = sub.getBoundingClientRect();
		const pr = parent.getBoundingClientRect();
		const pad = 8;
		setSubFlip({
			x: pr.right + sr.width + 4 > window.innerWidth - pad,
			y: sr.bottom > window.innerHeight - pad,
		});
	}, [showStatus]);

	useEffect(() => {
		const close = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node))
				onClose();
		};
		const closeOnEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("mousedown", close);
		document.addEventListener("keydown", closeOnEsc);
		return () => {
			document.removeEventListener("mousedown", close);
			document.removeEventListener("keydown", closeOnEsc);
		};
	}, [onClose]);

	return createPortal(
		<div
			ref={menuRef}
			style={{ position: "fixed", left: pos.left, top: pos.top }}
			className="z-[10000] min-w-[180px] select-none rounded-md border bg-popover py-1 text-sm shadow-2xl"
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: hover wrapper for submenu */}
			<div
				className="relative"
				role="presentation"
				onMouseEnter={() => setShowStatus(true)}
				onMouseLeave={() => setShowStatus(false)}
			>
				<button
					type="button"
					className={cn(
						"flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left",
						showStatus ? "bg-muted" : "hover:bg-muted",
					)}
				>
					<span>⚙️ Status</span>
					<span className="text-[10px] text-muted-foreground">
						{subFlip.x ? "◀" : "▶"}
					</span>
				</button>
				{showStatus && (
					<div
						ref={subRef}
						className="absolute z-[10001] min-w-[160px] rounded-md border bg-popover py-1 shadow-2xl"
						style={{
							...(subFlip.x
								? { right: "100%", marginRight: 2 }
								: { left: "100%", marginLeft: 2 }),
							...(subFlip.y ? { bottom: 0 } : { top: 0 }),
						}}
					>
						{APPOINTMENT_STATUSES.filter((k) => k !== "completed").map(
							(key) => {
								const cfg = APPOINTMENT_STATUS_CONFIG[key];
								const Icon = cfg.Icon;
								const active = visitKey === key;
								return (
									<button
										key={key}
										type="button"
										onClick={() => {
											onSetStatus(key);
											onClose();
										}}
										className={cn(
											"flex w-full items-center gap-2 px-3.5 py-1.5 text-left",
											active ? cn(cfg.badge, "font-bold") : "hover:bg-muted",
										)}
									>
										<Icon className="size-3.5 shrink-0" />
										<span>{cfg.label}</span>
									</button>
								);
							},
						)}
					</div>
				)}
			</div>
			<div className="my-1 h-px bg-border" />
			<button
				type="button"
				disabled
				className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-muted-foreground/60"
			>
				<span>📄 Documents</span>
				<span className="text-[10px]">▶</span>
			</button>
			<button
				type="button"
				disabled
				className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-muted-foreground/60"
			>
				<span>📨 Send</span>
				<span className="text-[10px]">▶</span>
			</button>
			<div className="my-1 h-px bg-border" />
			<button
				type="button"
				onClick={() => {
					onEdit();
					onClose();
				}}
				className="flex w-full items-center gap-2 px-3.5 py-2 text-left hover:bg-muted"
			>
				<span>✏️ Edit appointment</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onDelete();
					onClose();
				}}
				className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-destructive hover:bg-destructive/10"
			>
				<span>🗑️ Delete</span>
			</button>
		</div>,
		document.body,
	);
}
