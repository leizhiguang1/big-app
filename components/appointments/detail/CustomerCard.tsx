"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LeadConvertDialog } from "@/components/appointments/detail/LeadConvertDialog";
import { Button } from "@/components/ui/button";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	stats: { noShows: number; outstanding: number };
	allOutlets: OutletWithRoomCount[];
	allEmployees: EmployeeWithRelations[];
};

function computeAge(dob: string | null): string | null {
	if (!dob) return null;
	const d = new Date(dob);
	if (Number.isNaN(d.getTime())) return null;
	const now = new Date();
	let years = now.getFullYear() - d.getFullYear();
	let months = now.getMonth() - d.getMonth();
	if (now.getDate() < d.getDate()) months--;
	if (months < 0) {
		years--;
		months += 12;
	}
	if (years <= 0) return `${Math.max(months, 0)} MONTHS`;
	return `${years} YEARS ${months} MONTHS`;
}

function formatDob(dob: string | null): string | null {
	if (!dob) return null;
	const d = new Date(dob);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function whatsAppHref(raw: string): string | null {
	const digits = raw.replace(/\D/g, "");
	if (!digits) return null;
	return `https://wa.me/${digits}`;
}

function WhatsAppGlyph({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden
			focusable="false"
		>
			<title>WhatsApp</title>
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
		</svg>
	);
}

export function CustomerCard({
	appointment,
	stats,
	allOutlets,
	allEmployees,
}: Props) {
	const [convertOpen, setConvertOpen] = useState(false);
	const isBlock = appointment.is_time_block;
	const isLead = !isBlock && !appointment.customer_id;
	const customer = appointment.customer;

	if (isBlock) {
		return (
			<div className="h-full w-full min-w-0 rounded-xl border bg-slate-50 p-3 shadow-sm sm:p-4">
				<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
					Time block
				</div>
				<div className="mt-0.5 font-semibold text-sm leading-tight">
					{appointment.block_title || "Untitled block"}
				</div>
			</div>
		);
	}

	const displayName = customer
		? `${customer.first_name} ${customer.last_name ?? ""}`.trim().toUpperCase()
		: (appointment.lead_name ?? "Walk-in").toUpperCase();
	const phone = customer?.phone ?? appointment.lead_phone ?? null;
	const code = customer?.code ?? null;
	const age = computeAge(customer?.date_of_birth ?? null);
	const dob = formatDob(customer?.date_of_birth ?? null);
	const idNumber = customer?.id_number ?? null;
	const waUrl = phone ? whatsAppHref(phone) : null;

	return (
		<div
			className={cn(
				"flex h-full w-full min-w-0 flex-col gap-2 rounded-xl border p-3 text-[12px] shadow-sm sm:p-4",
				isLead ? "border-amber-300 bg-amber-50/40" : "bg-card",
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px]">
				<span className="inline-flex items-center gap-1 text-muted-foreground">
					<Star className="size-3 shrink-0" />
					No Rating
				</span>
				<button
					type="button"
					className="shrink-0 text-sky-600 hover:underline"
					disabled
				>
					Generate link
				</button>
			</div>

			<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 leading-tight">
				<div className="font-semibold text-sky-800 text-sm">{displayName}</div>
				{code && (
					<span className="text-[11px] text-muted-foreground tabular-nums">
						({code})
					</span>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[11px] leading-tight">
				<span className="font-medium text-rose-600">
					{stats.noShows} No show(s)
				</span>
				<span className="text-muted-foreground">·</span>
				<span className="font-medium text-rose-600">
					Outstanding MYR {stats.outstanding}
				</span>
			</div>

			{(age || dob || idNumber) && (
				<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground leading-snug">
					{age && <span>AGED {age}</span>}
					{dob && <span className="tabular-nums">{dob}</span>}
					{idNumber && <span className="tabular-nums">{idNumber}</span>}
				</div>
			)}

			{isLead && (
				<span className="inline-flex w-fit rounded-md bg-amber-200 px-1.5 py-0.5 font-semibold text-[10px] text-amber-900 uppercase tracking-wide">
					Walk In
				</span>
			)}

			{phone &&
				(waUrl ? (
					<a
						href={waUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex w-fit items-center gap-1.5 font-medium text-[12px] text-emerald-700 hover:text-emerald-800 hover:underline"
						aria-label={`Chat on WhatsApp: ${phone}`}
					>
						<WhatsAppGlyph className="size-4 shrink-0 text-emerald-600" />
						<span className="tabular-nums text-foreground">{phone}</span>
					</a>
				) : (
					<span className="tabular-nums text-muted-foreground text-[12px]">
						{phone}
					</span>
				))}

			<div className="mt-auto flex flex-wrap gap-1.5 pt-0.5">
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="h-8 min-w-0 flex-1 px-2 text-[11px] sm:h-7"
					disabled
				>
					Send Visuals
				</Button>
				{customer ? (
					<Button
						asChild
						type="button"
						size="sm"
						variant="outline"
						className="h-8 min-w-0 flex-1 px-2 text-[11px] sm:h-7"
					>
						<Link href={`/customers/${customer.id}`}>Page Customer</Link>
					</Button>
				) : (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="h-8 min-w-0 flex-1 px-2 text-[11px] sm:h-7"
						onClick={() => setConvertOpen(true)}
					>
						Register
					</Button>
				)}
			</div>

			{isLead && (
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
			)}
		</div>
	);
}
