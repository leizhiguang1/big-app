"use client";

import { useOptimistic, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { useAppointmentNotifications } from "@/components/notifications/AppointmentNotificationsProvider";
import { setAppointmentStatusAction } from "@/lib/actions/appointments";
import { APPOINTMENT_STATUS_NOTIFICATIONS } from "@/lib/constants/appointment-notifications";
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

export function StatusProgressionRow({ appointment, onToast }: Props) {
	const initial = (appointment.status as AppointmentStatus) ?? "pending";
	const [optimistic, setOptimistic] = useOptimistic<
		AppointmentStatus,
		AppointmentStatus
	>(initial, (_prev, next) => next);
	const [pending, startTransition] = useTransition();
	const { showStatusToast, suppressNextRealtime } =
		useAppointmentNotifications();

	const handleClick = (status: AppointmentStatus) => {
		if (status === optimistic || pending) return;
		const notif = APPOINTMENT_STATUS_NOTIFICATIONS[status];
		suppressNextRealtime(appointment.id, status);
		if (notif.enabled) {
			showStatusToast(
				{
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
		}
		startTransition(async () => {
			setOptimistic(status);
			try {
				await setAppointmentStatusAction(appointment.id, { status });
				if (!notif.enabled) {
					onToast(
						`Marked ${APPOINTMENT_STATUS_CONFIG[status].label}`,
						"success",
					);
				}
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Status update failed",
					"error",
				);
			}
		});
	};

	if (appointment.is_time_block) return null;

	return (
		<div className="rounded-md border bg-card p-4">
			<div className="text-muted-foreground text-xs uppercase tracking-wide">
				Status
			</div>
			<div className="mt-3 flex flex-wrap gap-2">
				{APPOINTMENT_STATUSES.map((s) => {
					const config = APPOINTMENT_STATUS_CONFIG[s];
					const Icon = config.Icon;
					const isActive = optimistic === s;
					return (
						<button
							key={s}
							type="button"
							onClick={() => handleClick(s)}
							disabled={pending}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium text-xs transition",
								isActive
									? "border-transparent text-white shadow-sm"
									: "border-border bg-background text-muted-foreground hover:text-foreground",
								pending && "cursor-wait opacity-70",
							)}
							style={
								isActive ? { backgroundColor: config.solidHex } : undefined
							}
						>
							<Icon className="size-3.5" aria-hidden />
							{config.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
