"use client";

import {
	Bell,
	CakeSlice,
	CalendarClock,
	CalendarDays,
	Compass,
	FileText,
	IdCard,
	Printer,
	Sparkles,
	Star,
	UserRound,
	UserX,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LeadConvertDialog } from "@/components/appointments/detail/LeadConvertDialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	stats: { noShows: number; outstanding: number };
	nextAppointmentAt: string | null;
	allOutlets: OutletWithRoomCount[];
	allEmployees: EmployeeWithRelations[];
	collapsed?: boolean;
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
	if (years <= 0) return `${Math.max(months, 0)} mo`;
	return `${years}y ${months}m`;
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

function formatNextAppt(iso: string): string {
	const d = new Date(iso);
	const date = d.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
	});
	const time = d.toLocaleTimeString("en-GB", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	return `${date} · ${time}`;
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

function LineGlyph({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden
			focusable="false"
		>
			<title>LINE</title>
			<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
		</svg>
	);
}

export function CustomerCard({
	appointment,
	stats,
	nextAppointmentAt,
	allOutlets,
	allEmployees,
	collapsed = false,
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
	const phone1 = customer?.phone ?? appointment.lead_phone ?? null;
	const phone2 = customer?.phone2 ?? null;
	const imageUrl = mediaPublicUrl(customer?.profile_image_path ?? null);
	const code = customer?.code ?? null;
	const age = computeAge(customer?.date_of_birth ?? null);
	const dob = formatDob(customer?.date_of_birth ?? null);
	const idNumber = customer?.id_number ?? null;
	const source = customer?.source ?? null;
	const medicalConditions = customer?.medical_conditions ?? [];
	const medicalAlert = customer?.medical_alert ?? null;
	const customerTag = customer?.tag ?? null;
	const hasMedicalInfo = medicalConditions.length > 0 || Boolean(medicalAlert);
	const wa1 = phone1 ? whatsAppHref(phone1) : null;
	const wa2 = phone2 ? whatsAppHref(phone2) : null;

	const nameRow = (
		<div className="flex items-center gap-1.5">
			{customer ? (
				<Link
					href={`/customers/${customer.id}`}
					className="min-w-0 truncate font-semibold text-[15px] text-sky-800 leading-tight hover:underline"
				>
					{displayName}
				</Link>
			) : (
				<span className="min-w-0 truncate font-semibold text-[15px] text-sky-800 leading-tight">
					{displayName}
				</span>
			)}
			{code && (
				<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
					({code})
				</span>
			)}
			<button
				type="button"
				title="Print Customer Label"
				aria-label="Print Customer Label"
				className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
				disabled
			>
				<Printer className="size-3.5" />
			</button>
		</div>
	);

	if (collapsed) {
		return (
			<div
				className={cn(
					"flex h-full w-full min-w-0 items-center rounded-xl border px-3 py-2 shadow-sm",
					isLead ? "border-amber-300 bg-amber-50/40" : "bg-card",
				)}
			>
				<div className="min-w-0 flex-1">{nameRow}</div>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={150}>
			<div
				className={cn(
					"flex h-full w-full min-w-0 flex-col gap-2.5 rounded-xl border p-3 shadow-sm sm:p-3.5",
					isLead ? "border-amber-300 bg-amber-50/40" : "bg-card",
				)}
			>
				<div className="flex items-start gap-2.5">
					<div className="relative size-12 shrink-0 overflow-hidden rounded-full border bg-muted">
						{imageUrl ? (
							// biome-ignore lint/performance/noImgElement: simple avatar, no next/image setup for supabase storage yet
							<img
								src={imageUrl}
								alt={displayName}
								className="size-full object-cover"
							/>
						) : (
							<div className="flex size-full items-center justify-center font-semibold text-[11px] text-muted-foreground">
								{customer ? (
									initials(displayName)
								) : (
									<UserRound className="size-5" />
								)}
							</div>
						)}
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<div className="flex items-center justify-between gap-2">
							<div
								className="flex items-center gap-0.5 text-muted-foreground"
								title="No rating"
							>
								<Star className="size-3" />
								<Star className="size-3" />
								<Star className="size-3" />
								<Star className="size-3" />
								<Star className="size-3" />
							</div>
							<button
								type="button"
								className="shrink-0 text-[10px] text-sky-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
								disabled
							>
								Generate link
							</button>
						</div>
						<div className="flex min-h-[14px] items-center gap-1 text-[10px] text-muted-foreground leading-tight">
							<CalendarClock className="size-3 shrink-0" />
							{nextAppointmentAt ? (
								<span className="truncate">
									Next: {formatNextAppt(nextAppointmentAt)}
								</span>
							) : (
								<span className="text-muted-foreground/60">No upcoming</span>
							)}
						</div>
					</div>
				</div>

				{nameRow}

				{isLead && (
					<span className="inline-flex w-fit rounded-md bg-amber-200 px-1.5 py-0.5 font-semibold text-[10px] text-amber-900 uppercase tracking-wide">
						Walk In
					</span>
				)}

				<div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
					<InfoItem
						label="No shows"
						icon={<UserX className="size-3.5" />}
						value={
							<span className="font-medium text-rose-600">
								{stats.noShows} No show{stats.noShows === 1 ? "" : "s"}
							</span>
						}
					/>
					<InfoItem
						label="Outstanding balance"
						icon={<Wallet className="size-3.5" />}
						value={
							<span className="font-medium text-rose-600">
								MYR {stats.outstanding}
							</span>
						}
					/>
					<InfoItem
						label="Age"
						icon={<CakeSlice className="size-3.5" />}
						value={age ?? <span className="text-muted-foreground/60">—</span>}
					/>
					<InfoItem
						label="Date of birth"
						icon={<CalendarDays className="size-3.5" />}
						value={
							dob ? (
								<span className="tabular-nums">{dob}</span>
							) : (
								<span className="text-muted-foreground/60">—</span>
							)
						}
					/>
					<InfoItem
						label="ID number"
						icon={<IdCard className="size-3.5" />}
						value={
							idNumber ? (
								<span className="tabular-nums">{idNumber}</span>
							) : (
								<span className="text-muted-foreground/60">—</span>
							)
						}
					/>
					<InfoItem
						label="Source"
						icon={<Compass className="size-3.5" />}
						value={
							source ?? <span className="text-muted-foreground/60">—</span>
						}
					/>
				</div>

				{customerTag && (
					<div className="flex">
						<span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-1.5 py-0.5 font-semibold text-[10px] text-violet-800 uppercase tracking-wide">
							<Sparkles className="size-3" />
							{customerTag}
						</span>
					</div>
				)}

				{hasMedicalInfo && (
					<div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-2">
						<Bell className="size-3.5 shrink-0 text-amber-600" />
						<div className="flex min-w-0 flex-col gap-0.5 text-[11px] leading-tight">
							<div className="font-semibold text-amber-900 uppercase tracking-wide">
								Medical History
							</div>
							{medicalConditions.length > 0 && (
								<div className="text-amber-900/90">
									{medicalConditions.join(", ")}
								</div>
							)}
							{medicalAlert && (
								<div className="whitespace-pre-wrap text-amber-800">
									{medicalAlert}
								</div>
							)}
						</div>
					</div>
				)}

				<div className="mt-auto flex flex-wrap gap-1 pt-0.5">
					<ActionIcon
						label="Line"
						disabled
						className="text-[#06C755] hover:bg-[#06C755]/10"
					>
						<LineGlyph className="size-4" />
					</ActionIcon>
					{wa1 && (
						<ActionIcon
							label={phone2 ? `WhatsApp 1 · ${phone1}` : `WhatsApp · ${phone1}`}
							href={wa1}
							className="text-emerald-600 hover:bg-emerald-500/10"
						>
							<WhatsAppGlyph className="size-4" />
						</ActionIcon>
					)}
					{wa2 && (
						<ActionIcon
							label={`WhatsApp 2 · ${phone2}`}
							href={wa2}
							className="text-emerald-600 hover:bg-emerald-500/10"
						>
							<WhatsAppGlyph className="size-4" />
						</ActionIcon>
					)}
					<ActionIcon label="Send visuals" disabled>
						<FileText className="size-4" />
					</ActionIcon>
					{customer ? (
						<ActionIcon label="Page customer" disabled>
							<Bell className="size-4" />
						</ActionIcon>
					) : (
						<button
							type="button"
							onClick={() => setConvertOpen(true)}
							className="ml-auto inline-flex h-7 items-center rounded-md border bg-background px-2 font-medium text-[11px] hover:bg-muted"
						>
							Register
						</button>
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
		</TooltipProvider>
	);
}

function InfoItem({
	icon,
	value,
	label,
}: {
	icon: React.ReactNode;
	value: React.ReactNode;
	label: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="flex min-w-0 items-center gap-1.5">
					<span className="shrink-0 text-muted-foreground" aria-label={label}>
						{icon}
					</span>
					<span className="min-w-0 truncate leading-tight">{value}</span>
				</div>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function ActionIcon({
	children,
	label,
	href,
	disabled,
	className,
}: {
	children: React.ReactNode;
	label: string;
	href?: string;
	disabled?: boolean;
	className?: string;
}) {
	const base =
		"flex size-7 items-center justify-center rounded-md border bg-background transition";
	if (href && !disabled) {
		return (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				title={label}
				aria-label={label}
				className={cn(base, "hover:bg-muted", className)}
			>
				{children}
			</a>
		);
	}
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			disabled={disabled}
			className={cn(
				base,
				"text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
				className,
			)}
		>
			{children}
		</button>
	);
}
