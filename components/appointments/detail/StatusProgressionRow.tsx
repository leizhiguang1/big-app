"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { useAppointmentNotifications } from "@/components/notifications/AppointmentNotificationsProvider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
	onReschedule?: () => void;
};

// `completed` and `cancelled` are excluded from the progression pills —
// both are terminal states reached via dedicated actions, not by clicking
// a state. Completion routes through the Mark Complete FAB (Collect Payment
// RPC or markAppointmentCompleted); cancellation routes through the Cancel
// action (CancelAppointmentDialog) which captures a reason and unwinds side
// effects. When the appointment is in either terminal state, the whole row
// is replaced with a static badge.
// See docs/modules/02-appointments.md §Complete appointment workflow.
const PROGRESSION_STATUSES = APPOINTMENT_STATUSES.filter(
	(s) => s !== "completed" && s !== "cancelled",
);

export function StatusProgressionRow({
	appointment,
	onToast,
	onReschedule,
}: Props) {
	const initial = (appointment.status as AppointmentStatus) ?? "pending";
	const [optimistic, setOptimistic] = useOptimistic<
		AppointmentStatus,
		AppointmentStatus
	>(initial, (_prev, next) => next);
	const [, startTransition] = useTransition();
	const [noShowPromptOpen, setNoShowPromptOpen] = useState(false);
	const { showStatusToast, suppressNextRealtime } =
		useAppointmentNotifications();

	const applyStatus = (status: AppointmentStatus) => {
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

	const handleClick = (status: AppointmentStatus) => {
		if (status === optimistic) return;
		if (status === "noshow" && onReschedule) {
			setNoShowPromptOpen(true);
			return;
		}
		applyStatus(status);
	};

	if (appointment.is_time_block) return null;

	// Terminal state — show a static indicator, not a clickable journey.
	if (optimistic === "completed" || optimistic === "cancelled") {
		return <TerminalBadge status={optimistic} />;
	}

	return (
		<TooltipProvider delayDuration={200}>
			<ConfirmDialog
				open={noShowPromptOpen}
				onOpenChange={setNoShowPromptOpen}
				title="Mark as no-show?"
				description="The customer didn't show up. Would you like to reschedule them to another time instead of marking no-show?"
				confirmLabel="Mark no-show"
				cancelLabel={null}
				variant="destructive"
				onConfirm={() => {
					setNoShowPromptOpen(false);
					applyStatus("noshow");
				}}
				altLabel="Reschedule"
				onAlt={() => {
					setNoShowPromptOpen(false);
					onReschedule?.();
				}}
			/>
			<div className="@container flex flex-wrap gap-1.5 @[340px]:gap-2 @[480px]:gap-2.5">
				{PROGRESSION_STATUSES.map((s) => (
					<ProgressionButton
						key={s}
						status={s}
						isActive={optimistic === s}
						onClick={() => handleClick(s)}
					/>
				))}
			</div>
		</TooltipProvider>
	);
}

function TerminalBadge({
	status,
}: {
	status: Extract<AppointmentStatus, "completed" | "cancelled">;
}) {
	const config = APPOINTMENT_STATUS_CONFIG[status];
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

function ProgressionButton({
	status,
	isActive,
	onClick,
}: {
	status: AppointmentStatus;
	isActive: boolean;
	onClick: () => void;
}) {
	const config = APPOINTMENT_STATUS_CONFIG[status];
	const Icon = config.Icon;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					className={cn(
						"inline-flex min-h-7 items-center justify-center gap-1 rounded-full border py-0.5 font-semibold text-[10px] uppercase tracking-wide transition",
						"min-w-7 px-1 @[340px]:min-h-8 @[340px]:px-1.5 @[340px]:py-1 @[340px]:text-[11px] @[480px]:px-2.5 @[480px]:text-xs",
						isActive
							? "border-transparent text-white shadow-sm"
							: "bg-transparent hover:bg-muted/40",
					)}
					style={
						isActive
							? { backgroundColor: config.solidHex }
							: { borderColor: config.solidHex, color: config.solidHex }
					}
				>
					<Icon className="size-3 shrink-0 @[480px]:size-3.5" aria-hidden />
					<span className="hidden @[340px]:inline">{config.label}</span>
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{config.label}</TooltipContent>
		</Tooltip>
	);
}
