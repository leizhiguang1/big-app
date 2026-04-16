"use client";

import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { AppointmentServicesList } from "@/components/appointments/detail/AppointmentServicesList";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";

type Props = {
	appointment: AppointmentWithRelations;
	lineItems: AppointmentLineItem[];
	salesOrderId: string | null;
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB", {
		weekday: "short",
		day: "numeric",
		month: "short",
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
	if (h === 0) return `${m}m`;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

export function BookingInfoCard({
	appointment,
	lineItems,
	salesOrderId,
}: Props) {
	const employeeName = appointment.employee
		? `${appointment.employee.first_name} ${appointment.employee.last_name}`
		: null;
	const roomName = appointment.room?.name ?? null;
	const dur = durationLabel(appointment.start_at, appointment.end_at);

	return (
		<div className="flex flex-col gap-1.5 rounded-xl border bg-card p-2.5 text-[11px] shadow-sm">
			<div className="flex items-center gap-1.5 font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
				<FileText className="size-3" />
				Booking details
			</div>

			<dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 leading-tight">
				<Row label="Date" value={formatDate(appointment.start_at)} />
				<Row
					label="Time"
					value={
						<span className="tabular-nums">
							{formatTime(appointment.start_at)}–
							{formatTime(appointment.end_at)}
							{dur && ` · ${dur}`}
						</span>
					}
				/>
				<Row label="Employee" value={employeeName} muted={!employeeName} />
				<Row label="Room" value={roomName} muted={!roomName} />
				<Row
					label="Ref"
					value={
						<span className="tabular-nums">{appointment.booking_ref}</span>
					}
				/>
			</dl>

			<Section label="Services">
				<AppointmentServicesList entries={lineItems} compact />
			</Section>

			<Section label="Symptoms">
				<span className="text-muted-foreground italic">
					No symptoms recorded
				</span>
			</Section>

			{salesOrderId && (
				<Section label="Sales Order">
					<Link
						href={`/sales/${salesOrderId}`}
						className="inline-flex items-center gap-1 text-blue-600 hover:underline"
					>
						View invoice
						<ExternalLink className="size-2.5" />
					</Link>
				</Section>
			)}
		</div>
	);
}

function Row({
	label,
	value,
	muted,
}: {
	label: string;
	value: React.ReactNode;
	muted?: boolean;
}) {
	return (
		<>
			<dt className="text-[10px] text-muted-foreground uppercase tracking-wide">
				{label}
			</dt>
			<dd
				className={`min-w-0 truncate ${muted ? "text-muted-foreground" : ""}`}
			>
				{value ?? "—"}
			</dd>
		</>
	);
}

function Section({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="border-t pt-1">
			<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
				{label}
			</div>
			<div className="mt-0.5">{children}</div>
		</div>
	);
}
