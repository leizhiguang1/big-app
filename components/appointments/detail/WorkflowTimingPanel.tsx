"use client";

import { useLiveElapsed } from "@/lib/hooks/use-live-elapsed";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";
import {
	formatClockTime,
	formatDuration,
	formatDurationSigned,
} from "@/lib/utils/duration";

type Props = {
	appointment: AppointmentWithRelations;
};

export function WorkflowTimingPanel({ appointment }: Props) {
	const status = appointment.status;
	const arrivedAt = appointment.arrived_at ?? null;
	const startedAt = appointment.treatment_started_at ?? null;
	const completedAt = appointment.completed_at ?? null;

	const isWaiting = status === "arrived" && !!arrivedAt && !startedAt;
	const isOngoing =
		(status === "started" || status === "billing") &&
		!!startedAt &&
		!completedAt;

	const waitMs = useLiveElapsed(arrivedAt, isWaiting);
	const ongoingMs = useLiveElapsed(startedAt, isOngoing);

	if (!arrivedAt && !startedAt && !completedAt) return null;

	const scheduledMs = new Date(appointment.start_at).getTime();
	const arrivalDelay = arrivedAt
		? new Date(arrivedAt).getTime() - scheduledMs
		: null;
	const staticWaitMs =
		arrivedAt && startedAt
			? new Date(startedAt).getTime() - new Date(arrivedAt).getTime()
			: null;
	const staticServiceMs =
		startedAt && completedAt
			? new Date(completedAt).getTime() - new Date(startedAt).getTime()
			: null;

	return (
		<div className="space-y-0.5 rounded-lg border bg-muted/20 px-2.5 py-1.5 text-[11px] tabular-nums">
			{arrivedAt && (
				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Arrived</span>
					<span className="flex items-center gap-1.5">
						<span>{formatClockTime(arrivedAt)}</span>
						{arrivalDelay !== null && (
							<span
								className={cn(
									"text-[10px]",
									arrivalDelay > 0 ? "text-red-600" : "text-emerald-600",
								)}
							>
								{formatDurationSigned(arrivalDelay)}
							</span>
						)}
					</span>
				</div>
			)}
			{isWaiting && (
				<div className="flex items-center justify-between gap-2 font-semibold text-amber-700">
					<span>Waiting</span>
					<span>{formatDuration(waitMs)}</span>
				</div>
			)}
			{!isWaiting && staticWaitMs !== null && (
				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Wait time</span>
					<span>{formatDuration(staticWaitMs)}</span>
				</div>
			)}
			{startedAt && (
				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Started</span>
					<span>{formatClockTime(startedAt)}</span>
				</div>
			)}
			{isOngoing && (
				<div className="flex items-center justify-between gap-2 font-semibold text-emerald-700">
					<span>Ongoing</span>
					<span>{formatDuration(ongoingMs)}</span>
				</div>
			)}
			{!isOngoing && staticServiceMs !== null && (
				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Service time</span>
					<span>{formatDuration(staticServiceMs)}</span>
				</div>
			)}
			{completedAt && (
				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Completed</span>
					<span>{formatClockTime(completedAt)}</span>
				</div>
			)}
		</div>
	);
}
