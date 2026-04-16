"use client";

import {
	AlertTriangle,
	ArrowLeft,
	Bell,
	CalendarDays,
	ChevronRight,
	Cigarette,
	Crown,
	Heart,
	Mail,
	MapPin,
	Megaphone,
	Phone,
	Pill,
	Plus,
	Star,
	Tag,
	User,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CustomerLineItem } from "@/lib/services/appointment-line-items";
import type { CustomerTimelineAppointment } from "@/lib/services/appointments";
import type { CaseNoteWithContext } from "@/lib/services/case-notes";
import type { CustomerWithRelations } from "@/lib/services/customers";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { cn } from "@/lib/utils";
import { CustomerCaseNotesTab } from "@/components/customers/CustomerCaseNotesTab";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

type Props = {
	customer: CustomerWithRelations;
	timeline: CustomerTimelineAppointment[];
	lineItems: CustomerLineItem[];
	caseNotes: CaseNoteWithContext[];
};

type TabKey =
	| "timeline"
	| "casenotes"
	| "dental-assessment"
	| "periodontal-charting"
	| "followup"
	| "documents"
	| "visuals"
	| "medical-certificate"
	| "prescriptions"
	| "laboratory"
	| "vaccinations"
	| "sales"
	| "payments"
	| "services"
	| "products"
	| "cash-wallet";

const TABS: { key: TabKey; label: string }[] = [
	{ key: "timeline", label: "Timeline" },
	{ key: "casenotes", label: "Case Notes" },
	{ key: "dental-assessment", label: "Dental Assessment" },
	{ key: "periodontal-charting", label: "Periodontal Charting" },
	{ key: "followup", label: "Follow Up" },
	{ key: "documents", label: "Documents" },
	{ key: "visuals", label: "Visuals" },
	{ key: "medical-certificate", label: "Medical Certificate" },
	{ key: "prescriptions", label: "Prescriptions" },
	{ key: "laboratory", label: "Laboratory" },
	{ key: "vaccinations", label: "Vaccinations" },
	{ key: "sales", label: "Sales" },
	{ key: "payments", label: "Payments" },
	{ key: "services", label: "Services" },
	{ key: "products", label: "Products" },
	{ key: "cash-wallet", label: "Cash Wallet" },
];

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
	return `${years} YEARS ${Math.max(months, 0)} MONTHS`;
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

function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMoney(n: number): string {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function monthKey(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function CustomerDetailView({ customer, timeline, lineItems, caseNotes }: Props) {
	const [activeTab, setActiveTab] = useState<TabKey>("timeline");

	const displayName = `${customer.first_name} ${customer.last_name ?? ""}`
		.trim()
		.toUpperCase();
	const salutation = customer.salutation?.toUpperCase() ?? "";
	const age = computeAge(customer.date_of_birth);
	const dob = formatDob(customer.date_of_birth);
	const imageUrl = mediaPublicUrl(customer.profile_image_path ?? null);
	const joinDate = customer.join_date
		? new Date(customer.join_date).toLocaleDateString("en-GB")
		: null;

	const lineItemsByAppointment = useMemo(() => {
		const map = new Map<string, CustomerLineItem[]>();
		for (const li of lineItems) {
			const key = li.appointment_id;
			const arr = map.get(key) ?? [];
			arr.push(li);
			map.set(key, arr);
		}
		return map;
	}, [lineItems]);

	const totalSpent = useMemo(
		() =>
			lineItems.reduce(
				(sum, li) => sum + Number(li.unit_price) * Number(li.quantity),
				0,
			),
		[lineItems],
	);

	const stats = useMemo(() => {
		let completed = 0;
		let cancelled = 0;
		let noShow = 0;
		for (const a of timeline) {
			if (a.status === "completed") completed++;
			else if (a.status === "cancelled") cancelled++;
			else if (a.status === "no_show") noShow++;
		}
		return {
			total: timeline.length,
			completed,
			cancelled,
			noShow,
		};
	}, [timeline]);

	const groupedTimeline = useMemo(() => {
		const groups: {
			key: string;
			appointments: CustomerTimelineAppointment[];
		}[] = [];
		for (const a of timeline) {
			const key = monthKey(a.start_at);
			const last = groups[groups.length - 1];
			if (last && last.key === key) last.appointments.push(a);
			else groups.push({ key, appointments: [a] });
		}
		return groups;
	}, [timeline]);

	return (
		<div className="flex flex-col gap-3">
			<SegmentedTabs
				tabs={TABS}
				active={activeTab}
				onChange={(key) => setActiveTab(key as TabKey)}
				size="sm"
				aria-label="Customer sections"
			/>
			<div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4 lg:flex-row">
			<aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[320px]">
				<div className="flex items-center gap-2">
					<Link
						href="/customers"
						className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:bg-muted"
						aria-label="Back to customers"
					>
						<ArrowLeft className="size-4" />
					</Link>
					<div className="font-mono text-muted-foreground text-xs">
						{customer.code}
					</div>
				</div>

				<div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
					<div className="flex items-start gap-3">
						<div className="flex flex-col items-center gap-1">
							<div className="relative size-16 overflow-hidden rounded-full border bg-muted">
								{imageUrl ? (
									// biome-ignore lint/performance/noImgElement: simple avatar
									<img
										src={imageUrl}
										alt={displayName}
										className="size-full object-cover"
									/>
								) : (
									<div className="flex size-full items-center justify-center font-semibold text-muted-foreground text-sm">
										{initials(displayName)}
									</div>
								)}
							</div>
							<div className="flex items-center gap-0.5 text-muted-foreground">
								<Star className="size-3" />
								<Star className="size-3" />
								<Star className="size-3" />
								<Star className="size-3" />
								<Star className="size-3" />
							</div>
							<div className="text-[10px] text-muted-foreground">No Rating</div>
							<button
								type="button"
								className="text-[10px] text-sky-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
								disabled
							>
								Generate link
							</button>
						</div>

						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<div className="flex items-center gap-1.5">
								<User className="size-3.5 text-sky-600" />
								<div className="min-w-0 truncate font-semibold text-[15px] text-sky-800">
									{displayName} ({salutation})
								</div>
								{customer.is_vip && (
									<span className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
										<Crown className="size-3" />
										VIP
									</span>
								)}
							</div>
							{customer.gender && (
								<div className="text-[11px] text-muted-foreground capitalize">
									{customer.gender}
								</div>
							)}
							{customer.tag && (
								<span className="flex w-fit items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
									<Tag className="size-2.5" />
									{customer.tag}
								</span>
							)}
							{(customer.address1 || customer.city || customer.state) && (
								<div className="flex items-start gap-1 text-[11px] text-muted-foreground">
									<MapPin className="mt-0.5 size-3 shrink-0" />
									<span className="line-clamp-2">
										{[
											customer.address1,
											customer.address2,
											customer.postcode,
											customer.city,
											customer.state,
										]
											.filter(Boolean)
											.join(", ")}
									</span>
								</div>
							)}
							{age && (
								<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
									<CalendarDays className="size-3 shrink-0" />
									<span>AGED {age}</span>
								</div>
							)}
							{customer.phone && (
								<div className="flex items-center gap-1 text-[11px] text-emerald-600">
									<Phone className="size-3 shrink-0" />
									<span className="tabular-nums">{customer.phone}</span>
								</div>
							)}
							{customer.phone2 && (
								<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
									<Phone className="size-3 shrink-0" />
									<span className="tabular-nums">{customer.phone2}</span>
								</div>
							)}
							{customer.email && (
								<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
									<Mail className="size-3 shrink-0" />
									<span className="truncate">{customer.email}</span>
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center justify-between text-[10px] text-muted-foreground">
						<span>Joined on {joinDate ?? "—"}</span>
						<span className="truncate">
							{customer.home_outlet?.name ?? "—"}
						</span>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<StatPill
							dotClass="bg-sky-500"
							label="Spent"
							value={`MYR ${formatMoney(totalSpent)}`}
							valueClass="text-sky-700"
						/>
						<StatPill
							dotClass="bg-rose-500"
							label="Outstanding"
							value="MYR 0.00"
							valueClass="text-rose-600"
						/>
					</div>

					<div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
						<div className="flex flex-col">
							<span className="text-[10px] text-muted-foreground uppercase">
								Lead Attended By
							</span>
							<span className="font-medium text-xs text-muted-foreground/70">
								—
							</span>
						</div>
						<div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
							<User className="size-3.5" />
						</div>
					</div>

					<div className="flex flex-col gap-2 text-xs">
						<DetailRow
							label={customer.id_type === "passport" ? "Passport" : "IC Number"}
							value={customer.id_number ?? "—"}
						/>
						<DetailRow label="Birthday" value={dob ?? "—"} />
						<DetailRow
							label="Country"
							value={(customer.country_of_origin ?? "Malaysia").toUpperCase()}
						/>
						<DetailRow
							label="Consultant"
							value={
								customer.consultant
									? `${customer.consultant.first_name} ${customer.consultant.last_name}`.toUpperCase()
									: "—"
							}
						/>
						<DetailRow
							label="Source"
							value={(customer.source ?? "—").toUpperCase()}
						/>
						<DetailRow label="Visits" value={String(timeline.length)} />
						{customer.external_code && (
							<DetailRow
								label="External Code"
								value={customer.external_code}
							/>
						)}
					</div>

					{customer.medical_alert && (
						<div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
							<AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
							<div className="flex flex-col gap-0.5">
								<span className="font-semibold text-[10px] text-amber-700 uppercase">
									Medical Alert
								</span>
								<span className="text-[11px] text-amber-800 leading-snug">
									{customer.medical_alert}
								</span>
							</div>
						</div>
					)}

					<div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
						<div className="flex items-center gap-2">
							<div className="flex size-8 items-center justify-center rounded-full bg-teal-500 font-semibold text-[10px] text-white">
								MYR
							</div>
							<div className="flex flex-col">
								<span className="font-semibold text-xs">Wallet</span>
								<span className="text-[10px] text-muted-foreground">0.00</span>
							</div>
						</div>
						<ChevronRight className="size-4 text-muted-foreground" />
					</div>
				</div>

				<MedicalInfoCard customer={customer} />

				<div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
					<div className="flex items-center gap-1.5 text-[11px]">
						<Bell className="size-3 text-muted-foreground" />
						<span className="text-muted-foreground">Notifications</span>
						<span
							className={cn(
								"font-semibold",
								customer.opt_in_notifications
									? "text-emerald-600"
									: "text-muted-foreground",
							)}
						>
							{customer.opt_in_notifications ? "ON" : "OFF"}
						</span>
					</div>
					<span className="text-border">|</span>
					<div className="flex items-center gap-1.5 text-[11px]">
						<Megaphone className="size-3 text-muted-foreground" />
						<span className="text-muted-foreground">Marketing</span>
						<span
							className={cn(
								"font-semibold",
								customer.opt_in_marketing
									? "text-emerald-600"
									: "text-muted-foreground",
							)}
						>
							{customer.opt_in_marketing ? "ON" : "OFF"}
						</span>
					</div>
				</div>
			</aside>

			<main className="flex min-w-0 flex-1 flex-col gap-4">
				{activeTab === "timeline" ? (
					<TimelineTab
						groupedTimeline={groupedTimeline}
						stats={stats}
						lineItemsByAppointment={lineItemsByAppointment}
					/>
				) : activeTab === "casenotes" ? (
					<CustomerCaseNotesTab
						customerId={customer.id}
						caseNotes={caseNotes}
					/>
				) : (
					<PlaceholderTab
						label={TABS.find((t) => t.key === activeTab)?.label ?? ""}
					/>
				)}
			</main>
			</div>
		</div>
	);
}

function StatPill({
	dotClass,
	label,
	value,
	valueClass,
}: {
	dotClass: string;
	label: string;
	value: string;
	valueClass: string;
}) {
	return (
		<div className="flex flex-col items-center gap-0.5 rounded-full border bg-background px-3 py-2 shadow-sm">
			<div className="flex items-center gap-1.5">
				<span className={cn("size-2 rounded-full", dotClass)} />
				<span className={cn("font-semibold text-sm tabular-nums", valueClass)}>
					{value}
				</span>
			</div>
			<span className="text-[10px] text-muted-foreground uppercase">
				{label}
			</span>
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col">
			<span className="text-[10px] text-muted-foreground uppercase">
				{label}
			</span>
			<span className="font-semibold text-[13px]">{value}</span>
		</div>
	);
}

function TimelineTab({
	groupedTimeline,
	stats,
	lineItemsByAppointment,
}: {
	groupedTimeline: {
		key: string;
		appointments: CustomerTimelineAppointment[];
	}[];
	stats: {
		total: number;
		completed: number;
		cancelled: number;
		noShow: number;
	};
	lineItemsByAppointment: Map<string, CustomerLineItem[]>;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-3">
				<button
					type="button"
					className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
					aria-label="New entry"
					disabled
				>
					<Plus className="size-5" />
				</button>
				<div className="flex flex-col items-end gap-2">
					<div className="font-semibold text-muted-foreground/70 text-sm uppercase tracking-wide">
						Summary
					</div>
					<div className="flex flex-wrap items-center justify-end gap-1.5">
						<SummaryChip
							dotClass="bg-sky-500"
							label="Appointments"
							value={stats.total}
						/>
						<SummaryChip
							dotClass="bg-emerald-500"
							label="Completed"
							value={stats.completed}
						/>
						<SummaryChip
							dotClass="bg-rose-500"
							label="Cancelled"
							value={stats.cancelled}
						/>
						<SummaryChip
							dotClass="bg-slate-400"
							label="No Show"
							value={stats.noShow}
						/>
					</div>
				</div>
			</div>

			{groupedTimeline.length === 0 ? (
				<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
					No appointments yet.
				</div>
			) : (
				<div className="relative flex flex-col gap-4 pl-4">
					<div className="absolute top-0 bottom-0 left-[5px] w-px bg-border" />
					{groupedTimeline.map((group) => (
						<div key={group.key} className="flex flex-col gap-3">
							<div className="relative flex">
								<span className="-left-[2px] absolute top-2 size-2.5 rounded-full bg-sky-500 ring-4 ring-background" />
								<span className="ml-2 inline-flex items-center rounded-full bg-sky-500 px-3 py-1 font-semibold text-white text-xs">
									{group.key}
								</span>
							</div>
							<div className="flex flex-col gap-3 pl-2">
								{group.appointments.map((a) => (
									<AppointmentTimelineCard
										key={a.id}
										appointment={a}
										lineItems={lineItemsByAppointment.get(a.id) ?? []}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function SummaryChip({
	dotClass,
	label,
	value,
}: {
	dotClass: string;
	label: string;
	value: number;
}) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px]">
			<span className={cn("size-2 rounded-full", dotClass)} />
			<span className="font-medium">{label}</span>
			<span className="text-muted-foreground">:</span>
			<span className="font-semibold tabular-nums">{value}</span>
		</span>
	);
}

function AppointmentTimelineCard({
	appointment,
	lineItems,
}: {
	appointment: CustomerTimelineAppointment;
	lineItems: CustomerLineItem[];
}) {
	const d = new Date(appointment.start_at);
	const day = d.getDate();
	const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
	const monthYear = d.toLocaleDateString("en-GB", {
		month: "long",
		year: "numeric",
	});
	const time = d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	const total = lineItems.reduce(
		(sum, li) => sum + Number(li.unit_price) * Number(li.quantity),
		0,
	);

	const serviceSummary = lineItems
		.filter((li) => li.service)
		.map(
			(li) =>
				`${li.service?.name?.toUpperCase() ?? li.description?.toUpperCase() ?? ""} x ${li.quantity}`,
		)
		.join(", ");

	const employee = appointment.employee
		? `${appointment.employee.first_name} ${appointment.employee.last_name}`.toUpperCase()
		: null;

	const outletRoom = [
		appointment.outlet?.name?.toUpperCase(),
		appointment.room?.name?.toUpperCase(),
	]
		.filter(Boolean)
		.join(" @ ");

	const statusLabel = appointment.status.replace(/_/g, " ");

	return (
		<div className="rounded-xl border bg-card p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-baseline gap-3">
					<div className="font-bold text-3xl tabular-nums">{day}</div>
					<div className="flex flex-col">
						<span className="font-medium text-sm">{weekday}</span>
						<span className="text-[11px] text-muted-foreground">
							{monthYear} | {time}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Link
						href={`/appointments/${appointment.id}`}
						className="flex size-9 items-center justify-center rounded-full bg-sky-600 font-semibold text-[11px] text-white shadow-sm transition hover:bg-sky-700"
					>
						Go
					</Link>
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold text-[11px] capitalize",
							appointment.status === "completed" &&
								"border-emerald-300 bg-emerald-50 text-emerald-700",
							appointment.status === "cancelled" &&
								"border-rose-300 bg-rose-50 text-rose-700",
							appointment.status === "no_show" &&
								"border-slate-300 bg-slate-50 text-slate-700",
							appointment.status !== "completed" &&
								appointment.status !== "cancelled" &&
								appointment.status !== "no_show" &&
								"border-sky-300 bg-sky-50 text-sky-700",
						)}
					>
						{statusLabel}
					</span>
				</div>
			</div>

			<div className="mt-3 flex flex-col gap-1.5 text-[12px]">
				<div className="text-muted-foreground">
					<span className="font-mono">{appointment.booking_ref}</span>
				</div>
				{serviceSummary && (
					<div className="font-semibold uppercase leading-snug">
						{serviceSummary}
					</div>
				)}
				{total > 0 && (
					<div className="flex items-center gap-1 font-semibold text-emerald-600">
						<Wallet className="size-3.5" />
						<span className="tabular-nums">MYR {formatMoney(total)}</span>
					</div>
				)}
				{outletRoom && (
					<div className="text-muted-foreground uppercase">{outletRoom}</div>
				)}
				{employee && (
					<div className="flex items-center gap-1 text-muted-foreground">
						<User className="size-3" />
						<span>{employee}</span>
					</div>
				)}
				{appointment.notes && (
					<div className="text-muted-foreground">
						<span className="font-semibold">Remarks:</span> {appointment.notes}
					</div>
				)}
			</div>
		</div>
	);
}

function MedicalInfoCard({ customer }: { customer: CustomerWithRelations }) {
	const hasMedical =
		customer.smoker ||
		customer.drug_allergies ||
		(customer.medical_conditions && customer.medical_conditions.length > 0);

	if (!hasMedical) return null;

	return (
		<div className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
			<div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase">
				<Heart className="size-3.5" />
				Medical Information
			</div>

			{customer.smoker && (
				<div className="flex items-center gap-2 text-xs">
					<Cigarette className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="text-[10px] text-muted-foreground uppercase">
						Smoker:
					</span>
					<span className="font-medium capitalize">{customer.smoker}</span>
				</div>
			)}

			{customer.drug_allergies && (
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
						<Pill className="size-3 shrink-0" />
						Drug Allergies
					</div>
					<span className="text-xs leading-snug">
						{customer.drug_allergies}
					</span>
				</div>
			)}

			{customer.medical_conditions && customer.medical_conditions.length > 0 && (
				<div className="flex flex-col gap-1">
					<span className="text-[10px] text-muted-foreground uppercase">
						Conditions
					</span>
					<div className="flex flex-wrap gap-1">
						{customer.medical_conditions.map((c) => (
							<span
								key={c}
								className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
							>
								{c}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function PlaceholderTab({ label }: { label: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 p-16 text-center">
			<div className="font-medium text-base">{label}</div>
			<div className="text-muted-foreground text-sm">
				This section will be built in a future phase.
			</div>
		</div>
	);
}
