"use client";

import { useOptimistic, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { useAppointmentNotifications } from "@/components/notifications/AppointmentNotificationsProvider";
import { setAppointmentStatusAction } from "@/lib/actions/appointments";
import {
	APPOINTMENT_STATUS_CONFIG,
	APPOINTMENT_STATUSES,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

// `completed` is excluded from the progression pills. Completion is only
// reachable via the Mark Complete FAB (which routes through the Collect
// Payment RPC or markAppointmentCompleted). When the appointment is already
// completed, the whole row is replaced with a static "Completed" indicator
// — the progression is terminal and the FAB's Revert button is the escape.
// See docs/modules/02-appointments.md §Complete appointment workflow.
const PROGRESSION_STATUSES = APPOINTMENT_STATUSES.filter(
	(s) => s !== "completed",
);

export function StatusProgressionRow({ appointment, onToast }: Props) {
	const initial = (appointment.status as AppointmentStatus) ?? "pending";
	const [optimistic, setOptimistic] = useOptimistic<
		AppointmentStatus,
		AppointmentStatus
	>(initial, (_prev, next) => next);
	const [, startTransition] = useTransition();
	const { showStatusToast, suppressNextRealtime } =
		useAppointmentNotifications();

	const handleClick = (status: AppointmentStatus) => {
		if (status === optimistic) return;
		suppressNextRealtime(appointment.id);
		showStatusToast(
			{
				appointmentId: appointment.id,
				customerName: appointment.customer
					? `${appointment.customer.first_name} ${appointment.customer.last_name ?? ""}`.trim()
					: (appointment.lead_name ?? "Customer"),
				employeeName: appointment.employee
					? `${appointment.employee.first_name} ${appointment.employee.last_name}`.trim()
					: null,
				roomName: appointment.room?.name ?? null,
			},
			status,
		);
		startTransition(async () => {
			setOptimistic(status);
			try {
				await setAppointmentStatusAction(appointment.id, { status });
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Status update failed",
					"error",
				);
			}
		});
	};

	if (appointment.is_time_block) return null;

	// Terminal state — show a static indicator, not a clickable journey.
	if (optimistic === "completed") {
		const config = APPOINTMENT_STATUS_CONFIG.completed;
		const Icon = config.Icon;
		return (
			<div
				className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-transparent px-3 py-1 font-semibold text-[11px] text-white uppercase tracking-wide shadow-sm sm:text-xs"
				style={{ backgroundColor: config.solidHex }}
			>
				<Icon className="size-3 shrink-0 sm:size-3.5" aria-hidden />
				{config.label}
			</div>
		);
	}

	return (
		<div className="flex flex-wrap gap-1.5 sm:gap-2">
			{PROGRESSION_STATUSES.map((s) => {
				const config = APPOINTMENT_STATUS_CONFIG[s];
				const Icon = config.Icon;
				const isActive = optimistic === s;
				return (
					<button
						key={s}
						type="button"
						onClick={() => handleClick(s)}
						className={cn(
							"inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-semibold text-[11px] uppercase tracking-wide transition sm:px-3 sm:text-xs",
							isActive
								? "border-transparent text-white shadow-sm"
								: "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
						)}
						style={isActive ? { backgroundColor: config.solidHex } : undefined}
					>
						<Icon className="size-3 shrink-0 sm:size-3.5" aria-hidden />
						{config.label}
					</button>
				);
			})}
		</div>
	);
}
