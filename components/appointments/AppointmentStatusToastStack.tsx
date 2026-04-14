"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	APPOINTMENT_STATUS_CONFIG,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import { cn } from "@/lib/utils";

export type StatusToast = {
	id: string;
	status: AppointmentStatus;
	title: string;
	subtitle: string;
};

type Props = {
	toasts: StatusToast[];
	onDismiss: (id: string) => void;
};

export function AppointmentStatusToastStack({ toasts, onDismiss }: Props) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;

	return createPortal(
		<div className="pointer-events-none fixed top-4 right-4 z-[10100] flex flex-col gap-2">
			{toasts.map((t) => {
				const cfg = APPOINTMENT_STATUS_CONFIG[t.status];
				const Icon = cfg.Icon;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => onDismiss(t.id)}
						className={cn(
							"pointer-events-auto flex min-w-[280px] max-w-[360px] items-start gap-3 rounded-lg border-l-4 bg-card px-4 py-3 text-left shadow-2xl ring-1 ring-black/5 transition-all",
							"animate-in slide-in-from-right-4 fade-in",
							cfg.badge,
						)}
						style={{ borderLeftColor: cfg.solidHex }}
					>
						<span
							className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
							style={{ backgroundColor: cfg.solidHex, color: "white" }}
						>
							<Icon className="size-4" />
						</span>
						<div className="min-w-0 flex-1">
							<div className={cn("text-sm font-semibold", cfg.text)}>
								{t.title}
							</div>
							{t.subtitle && (
								<div className={cn("mt-0.5 text-xs opacity-80", cfg.text)}>
									{t.subtitle}
								</div>
							)}
						</div>
						<X
							className={cn("mt-0.5 size-3.5 shrink-0 opacity-60", cfg.text)}
						/>
					</button>
				);
			})}
		</div>,
		document.body,
	);
}
