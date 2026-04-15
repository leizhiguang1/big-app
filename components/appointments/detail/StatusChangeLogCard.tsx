"use client";

import { History } from "lucide-react";
import {
	APPOINTMENT_STATUS_CONFIG,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import type { AppointmentStatusLogEntry } from "@/lib/services/appointments";

type Props = {
	entries: AppointmentStatusLogEntry[];
};

function formatTimestamp(iso: string): string {
	const d = new Date(iso);
	const date = d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
	const time = d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	return `${date} ${time}`;
}

function StatusPill({ status }: { status: string | null }) {
	if (!status) {
		return (
			<span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 font-medium text-[9px] text-muted-foreground uppercase tracking-wide">
				—
			</span>
		);
	}
	const cfg = APPOINTMENT_STATUS_CONFIG[status as AppointmentStatus];
	if (!cfg) {
		return (
			<span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 font-medium text-[9px] uppercase tracking-wide">
				{status}
			</span>
		);
	}
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium text-[9px] uppercase tracking-wide ${cfg.badge}`}
		>
			<span className={`size-1.5 rounded-full ${cfg.dot}`} />
			{cfg.label}
		</span>
	);
}

export function StatusChangeLogCard({ entries }: Props) {
	return (
		<div className="flex flex-col gap-1.5 rounded-xl border bg-card p-2.5 text-[11px] shadow-sm">
			<div className="flex items-center gap-1.5 font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
				<History className="size-3" />
				Status change log
			</div>

			{entries.length === 0 ? (
				<div className="py-3 text-center text-[10px] text-muted-foreground italic">
					No status changes recorded
				</div>
			) : (
				<div className="flex flex-col">
					<div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border/60 pb-1 text-[9px] text-muted-foreground uppercase tracking-wide">
						<div>When / Who</div>
						<div className="text-center">From</div>
						<div className="text-center">To</div>
					</div>
					<div className="flex max-h-64 flex-col divide-y divide-border/60 overflow-y-auto">
					{entries.map((entry) => {
						const who = entry.changed_by
							? `${entry.changed_by.first_name} ${entry.changed_by.last_name}`.trim()
							: "System";
						return (
							<div
								key={entry.id}
								className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1.5"
							>
								<div className="min-w-0">
									<div className="truncate tabular-nums text-[10px]">
										{formatTimestamp(entry.changed_at)}
									</div>
									<div className="truncate text-[10px] text-muted-foreground">
										{who}
									</div>
								</div>
								<StatusPill status={entry.from_status} />
								<StatusPill status={entry.to_status} />
							</div>
						);
					})}
					</div>
				</div>
			)}
		</div>
	);
}
