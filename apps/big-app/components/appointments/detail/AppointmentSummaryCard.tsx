"use client";

import { Building2, CalendarClock, DoorOpen } from "lucide-react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { StatusProgressionRow } from "@/components/appointments/detail/StatusProgressionRow";
import { WorkflowTimingPanel } from "@/components/appointments/detail/WorkflowTimingPanel";
import type { AppointmentWithRelations } from "@/lib/services/appointments";

type Props = {
	appointment: AppointmentWithRelations;
	outletName: string | null;
	onToast: (message: string, variant?: Toast["variant"]) => void;
	onReschedule?: () => void;
};

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	const date = d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
	const time = d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
	return `${date} ${time}`;
}

function durationLabel(startIso: string, endIso: string): string {
	const diff =
		(new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
	if (!Number.isFinite(diff) || diff <= 0) return "";
	const h = Math.floor(diff / 60);
	const m = Math.round(diff % 60);
	return `${h}H${m.toString().padStart(2, "0")}M`;
}

export function AppointmentSummaryCard({
	appointment,
	outletName,
	onToast,
	onReschedule,
}: Props) {
	const title = appointment.is_time_block
		? (appointment.block_title ?? "Time block")
		: appointment.booking_ref;
	const roomName = appointment.room?.name ?? null;
	const dur = durationLabel(appointment.start_at, appointment.end_at);

	return (
		<div className="flex h-full w-full min-w-0 flex-col gap-2.5 rounded-xl border bg-card p-3 shadow-sm sm:p-3.5">
			<div className="min-w-0 space-y-1">
				<div className="font-semibold text-sky-800 text-sm tabular-nums sm:text-[15px]">
					{title}
				</div>
				<div className="flex items-start gap-1.5 text-muted-foreground text-[11px] sm:text-xs">
					<CalendarClock className="mt-0.5 size-3.5 shrink-0" />
					<span className="min-w-0 tabular-nums leading-snug">
						{formatDateTime(appointment.start_at)} —{" "}
						{formatDateTime(appointment.end_at)}
						{dur && ` (${dur})`}
					</span>
				</div>
				{outletName && (
					<div className="flex items-center gap-1.5 text-muted-foreground text-[11px] sm:text-xs">
						<Building2 className="size-3.5 shrink-0" />
						<span className="min-w-0">{outletName}</span>
					</div>
				)}
				{roomName && (
					<div className="flex items-center gap-1.5 text-muted-foreground text-[11px] sm:text-xs">
						<DoorOpen className="size-3.5 shrink-0" />
						<span className="min-w-0">{roomName}</span>
					</div>
				)}
			</div>
			<div className="min-w-0">
				<div className="sr-only">Appointment status</div>
				<StatusProgressionRow
					appointment={appointment}
					onToast={onToast}
					onReschedule={onReschedule}
				/>
			</div>
			{!appointment.is_time_block && (
				<WorkflowTimingPanel appointment={appointment} />
			)}
		</div>
	);
}
