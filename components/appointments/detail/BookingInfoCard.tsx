"use client";

import { Building2, Clock, DoorOpen, UserCog } from "lucide-react";
import type { AppointmentWithRelations } from "@/lib/services/appointments";

type Props = {
	appointment: AppointmentWithRelations;
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString("en-GB", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

function durationLabel(startIso: string, endIso: string): string {
	const diff =
		(new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
	if (!Number.isFinite(diff) || diff <= 0) return "";
	const h = Math.floor(diff / 60);
	const m = Math.round(diff % 60);
	if (h === 0) return `${m} min`;
	if (m === 0) return `${h} hr`;
	return `${h} hr ${m} min`;
}

export function BookingInfoCard({ appointment }: Props) {
	const employeeName = appointment.employee
		? `${appointment.employee.first_name} ${appointment.employee.last_name}`
		: null;
	const roomName = appointment.room?.name ?? null;
	const dur = durationLabel(appointment.start_at, appointment.end_at);

	return (
		<div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
			<div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
				Booking details
			</div>
			<div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
				<InfoRow
					icon={<Clock className="size-3.5 sm:size-4" />}
					label="Time"
					value={
						<>
							<div className="font-medium text-sm leading-tight">
								{formatDate(appointment.start_at)}
							</div>
							<div className="text-muted-foreground text-xs tabular-nums leading-tight">
								{formatTime(appointment.start_at)} –{" "}
								{formatTime(appointment.end_at)}
								{dur && ` · ${dur}`}
							</div>
						</>
					}
				/>
				<InfoRow
					icon={<UserCog className="size-3.5 sm:size-4" />}
					label="Employee"
					value={
						<span
							className={`text-sm leading-tight ${employeeName ? "" : "text-muted-foreground"}`}
						>
							{employeeName ?? "Unassigned"}
						</span>
					}
				/>
				<InfoRow
					icon={<DoorOpen className="size-3.5 sm:size-4" />}
					label="Room"
					value={
						<span
							className={`text-sm leading-tight ${roomName ? "" : "text-muted-foreground"}`}
						>
							{roomName ?? "Unassigned"}
						</span>
					}
				/>
				<InfoRow
					icon={<Building2 className="size-3.5 sm:size-4" />}
					label="Booking ref"
					value={
						<span className="text-sm tabular-nums leading-tight">
							{appointment.booking_ref}
						</span>
					}
				/>
			</div>
		</div>
	);
}

function InfoRow({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-start gap-2">
			<div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
			<div className="min-w-0 flex-1">
				<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
					{label}
				</div>
				<div className="mt-0.5">{value}</div>
			</div>
		</div>
	);
}
