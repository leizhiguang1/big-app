"use client";

import {
	AlertCircle,
	CalendarClock,
	Phone,
	UserPlus,
	UserX,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LeadConvertDialog } from "@/components/appointments/detail/LeadConvertDialog";
import { Button } from "@/components/ui/button";
import type {
	AppointmentWithRelations,
	CustomerAppointmentSummary,
} from "@/lib/services/appointments";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	stats: { noShows: number; outstanding: number };
	nextAppointment: CustomerAppointmentSummary | null;
	allOutlets: OutletWithRoomCount[];
	allEmployees: EmployeeWithRelations[];
};

function formatNextAppointment(iso: string): string {
	const d = new Date(iso);
	const date = d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
	const time = d.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	return `${date} · ${time}`;
}

export function CustomerCard({
	appointment,
	stats,
	nextAppointment,
	allOutlets,
	allEmployees,
}: Props) {
	const [convertOpen, setConvertOpen] = useState(false);
	const isBlock = appointment.is_time_block;
	const isLead = !isBlock && !appointment.customer_id;
	const customer = appointment.customer;

	if (isBlock) {
		return (
			<div className="rounded-md border bg-slate-50 p-4">
				<div className="text-muted-foreground text-xs uppercase tracking-wide">
					Time block
				</div>
				<div className="mt-1 font-semibold text-base">
					{appointment.block_title || "Untitled block"}
				</div>
			</div>
		);
	}

	const displayName = customer
		? `${customer.first_name} ${customer.last_name ?? ""}`.trim()
		: (appointment.lead_name ?? "Walk-in");
	const phone = customer?.phone ?? appointment.lead_phone ?? null;
	const initials = displayName
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();

	return (
		<div
			className={cn(
				"flex flex-col gap-4 rounded-md border p-4",
				isLead ? "border-amber-300 bg-amber-50" : "bg-card",
			)}
		>
			<div className="flex flex-col items-center gap-2 text-center">
				<div
					className={cn(
						"flex size-16 items-center justify-center rounded-full font-semibold text-lg text-white",
						isLead ? "bg-amber-500" : "bg-slate-600",
					)}
				>
					{initials || "?"}
				</div>
				<div className="font-semibold text-base leading-tight">
					{displayName}
				</div>
				{isLead ? (
					<span className="rounded-sm bg-amber-200 px-2 py-0.5 font-semibold text-[10px] text-amber-900 uppercase tracking-wide">
						Walk-in lead
					</span>
				) : customer ? (
					<div className="text-muted-foreground text-xs tabular-nums">
						{customer.code}
					</div>
				) : null}
				{phone && (
					<a
						href={`tel:${phone}`}
						className="mt-1 inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
					>
						<Phone className="size-3.5" />
						<span className="tabular-nums">{phone}</span>
					</a>
				)}
			</div>

			{customer && (
				<div className="grid grid-cols-2 gap-2 border-t pt-3">
					<div className="flex flex-col items-center rounded bg-muted/40 p-2">
						<UserX className="mb-1 size-4 text-muted-foreground" />
						<div className="font-semibold text-base tabular-nums">
							{stats.noShows}
						</div>
						<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
							No-shows
						</div>
					</div>
					<div className="flex flex-col items-center rounded bg-muted/40 p-2">
						<AlertCircle className="mb-1 size-4 text-muted-foreground" />
						<div className="font-semibold text-base tabular-nums">
							{stats.outstanding}
						</div>
						<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
							Outstanding
						</div>
					</div>
				</div>
			)}

			{nextAppointment && (
				<div className="border-t pt-3">
					<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
						Next appointment
					</div>
					<Link
						href={`/appointments/${nextAppointment.id}`}
						className="mt-1 inline-flex items-center gap-1.5 text-sm hover:underline"
					>
						<CalendarClock className="size-3.5" />
						{formatNextAppointment(nextAppointment.start_at)}
					</Link>
				</div>
			)}

			{isLead && (
				<>
					<div className="border-t pt-3">
						<Button
							type="button"
							size="sm"
							className="w-full gap-1"
							onClick={() => setConvertOpen(true)}
						>
							<UserPlus className="size-3.5" />
							Register as Customer
						</Button>
					</div>
					<LeadConvertDialog
						open={convertOpen}
						onClose={() => setConvertOpen(false)}
						appointmentId={appointment.id}
						defaultName={appointment.lead_name ?? ""}
						defaultPhone={appointment.lead_phone ?? ""}
						defaultOutletId={appointment.outlet_id}
						defaultConsultantId={appointment.lead_attended_by_id}
						outlets={allOutlets}
						employees={allEmployees}
					/>
				</>
			)}
		</div>
	);
}
