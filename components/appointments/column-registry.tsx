import type { ReactNode } from "react";
import { useAppointmentTag } from "@/components/brand-config/AppointmentConfigProvider";
import type { ColumnKey } from "@/lib/appointments/columns";
import {
	APPOINTMENT_STATUS_CONFIG,
	type AppointmentStatus,
	PAYMENT_STATUS_CONFIG,
	type PaymentStatus,
} from "@/lib/constants/appointment-status";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";
import {
	formatAge,
	formatClockTime,
	formatDobShort,
	formatDuration,
	formatDurationSigned,
} from "@/lib/utils/duration";

function fmt12h(iso: string): string {
	const d = new Date(iso);
	let h = d.getHours();
	const m = String(d.getMinutes()).padStart(2, "0");
	const ampm = h < 12 ? "am" : "pm";
	h = h % 12 || 12;
	return `${h}:${m} ${ampm}`;
}

function getApptType(
	a: AppointmentWithRelations,
): "Block" | "Regular" | "Walk-in" {
	if (a.is_time_block) return "Block";
	if (a.customer_id) return "Regular";
	return "Walk-in";
}

function sumOutstanding(sos: AppointmentWithRelations["sales_orders"]): number {
	return (sos ?? []).reduce((t, so) => t + (so.outstanding ?? 0), 0);
}

function ms(iso: string | null | undefined): number | null {
	if (!iso) return null;
	const t = new Date(iso).getTime();
	return Number.isNaN(t) ? null : t;
}

const Empty = () => <span className="text-muted-foreground">—</span>;

export type ColumnRenderer = (a: AppointmentWithRelations) => ReactNode;

export const COLUMN_RENDERERS: Record<ColumnKey, ColumnRenderer> = {
	customer_name: (a) => {
		const isBlock = a.is_time_block;
		const isLead = !isBlock && !a.customer_id && !!a.lead_name;
		const primary = isBlock
			? a.block_title || "Time block"
			: a.customer
				? `${a.customer.first_name} ${a.customer.last_name ?? ""}`.trim()
				: (a.lead_name ?? "Walk-in");
		return (
			<div className="flex items-center gap-1.5 font-semibold text-[13px]">
				{isLead && (
					<span className="rounded bg-amber-200 px-1 py-px font-bold text-[9px] text-amber-900 uppercase">
						Lead
					</span>
				)}
				{isBlock && (
					<span className="rounded bg-slate-600 px-1 py-px font-bold text-[9px] text-white uppercase">
						Block
					</span>
				)}
				{a.customer?.is_vip && (
					<span className="rounded bg-amber-500 px-1 py-px font-bold text-[9px] text-white uppercase">
						VIP
					</span>
				)}
				<span className="truncate">{primary}</span>
			</div>
		);
	},

	age: (a) => {
		const age = formatAge(a.customer?.date_of_birth);
		return age === "—" ? (
			<Empty />
		) : (
			<span className="whitespace-nowrap tabular-nums text-xs">{age}</span>
		);
	},

	dob: (a) => {
		const dob = formatDobShort(a.customer?.date_of_birth);
		return dob === "—" ? (
			<Empty />
		) : (
			<span className="whitespace-nowrap tabular-nums text-xs">{dob}</span>
		);
	},

	phone: (a) => {
		const phone = a.customer?.phone ?? a.lead_phone ?? null;
		const phone2 = a.customer?.phone2 ?? null;
		if (!phone && !phone2) return <Empty />;
		return (
			<div className="text-xs tabular-nums">
				{phone && <div>1 {phone}</div>}
				{phone2 && <div className="text-muted-foreground">2 {phone2}</div>}
			</div>
		);
	},

	email: (a) =>
		a.customer?.email ? (
			<span className="block truncate text-xs" title={a.customer.email}>
				{a.customer.email}
			</span>
		) : (
			<Empty />
		),

	appt_type: (a) => <span className="text-xs">{getApptType(a)}</span>,

	booking_ref: (a) => (
		<span className="font-medium text-sky-600 text-xs tabular-nums">
			{a.booking_ref}
		</span>
	),

	customer_code: (a) => {
		if (a.is_time_block) return <Empty />;
		const isLead = !a.customer_id && !!a.lead_name;
		if (isLead) {
			return <span className="font-mono text-[10px] text-amber-700">LEAD</span>;
		}
		return a.customer?.code ? (
			<span className="font-mono text-[10px] text-muted-foreground">
				{a.customer.code}
			</span>
		) : (
			<Empty />
		);
	},

	service: (a) => {
		if (a.is_time_block) return <Empty />;
		const live = a.line_items.filter((li) => !li.is_cancelled);
		if (live.length === 0) return <Empty />;
		const first = live[0];
		const category = first.service?.category?.name;
		const name = first.service?.name ?? first.description;
		return (
			<div className="text-xs">
				<div className="truncate" title={name}>
					{category && (
						<span className="text-muted-foreground">({category}) </span>
					)}
					<span className="font-medium">
						{name} x {first.quantity}
					</span>
				</div>
				{live.length > 1 && (
					<div className="text-[10px] text-muted-foreground">
						+ {live.length - 1} more
					</div>
				)}
			</div>
		);
	},

	appt_status: (a) => {
		if (a.is_time_block) return <Empty />;
		return (
			<ApptStatusBadge status={(a.status as AppointmentStatus) ?? "pending"} />
		);
	},

	appt_time: (a) => (
		<span className="whitespace-nowrap text-xs tabular-nums">
			{fmt12h(a.start_at)} – {fmt12h(a.end_at)}
		</span>
	),

	arrival_delay: (a) => {
		const arrived = ms(a.arrived_at);
		const scheduled = ms(a.start_at);
		if (arrived === null || scheduled === null) return <Empty />;
		const diff = arrived - scheduled;
		return (
			<span
				className={cn(
					"whitespace-nowrap text-xs tabular-nums",
					diff > 0 ? "text-red-600" : "text-emerald-600",
				)}
			>
				{formatDurationSigned(diff)}
			</span>
		);
	},

	arrival_time: (a) =>
		a.arrived_at ? (
			<span className="whitespace-nowrap text-xs tabular-nums">
				{formatClockTime(a.arrived_at)}
			</span>
		) : (
			<Empty />
		),

	wait_time: (a) => {
		const arrived = ms(a.arrived_at);
		const started = ms(a.treatment_started_at);
		if (arrived === null || started === null) return <Empty />;
		return (
			<span className="whitespace-nowrap text-xs tabular-nums">
				{formatDuration(started - arrived)}
			</span>
		);
	},

	start_time: (a) =>
		a.treatment_started_at ? (
			<span className="whitespace-nowrap text-xs tabular-nums">
				{formatClockTime(a.treatment_started_at)}
			</span>
		) : (
			<Empty />
		),

	service_time: (a) => {
		const started = ms(a.treatment_started_at);
		const completed = ms(a.completed_at);
		if (started === null || completed === null) return <Empty />;
		return (
			<span className="whitespace-nowrap text-xs tabular-nums">
				{formatDuration(completed - started)}
			</span>
		);
	},

	completed_time: (a) =>
		a.completed_at ? (
			<span className="whitespace-nowrap text-xs tabular-nums">
				{formatClockTime(a.completed_at)}
			</span>
		) : (
			<Empty />
		),

	appt_tag: (a) => {
		if ((a.tags?.length ?? 0) === 0) return <Empty />;
		return (
			<div className="flex flex-wrap gap-1">
				{a.tags.map((t) => (
					<ApptTagChip key={t} code={t} />
				))}
			</div>
		);
	},

	outstanding: (a) => {
		if (a.is_time_block) return <Empty />;
		const amt = sumOutstanding(a.sales_orders);
		return (
			<span
				className={cn(
					"whitespace-nowrap text-xs tabular-nums",
					amt > 0 ? "font-semibold text-red-600" : "text-muted-foreground",
				)}
			>
				MYR {amt.toFixed(2)}
			</span>
		);
	},

	employee_name: (a) =>
		a.employee ? (
			<span className="text-xs">
				{a.employee.first_name} {a.employee.last_name}
			</span>
		) : (
			<Empty />
		),

	room: (a) =>
		a.room?.name ? <span className="text-xs">{a.room.name}</span> : <Empty />,

	remarks: (a) => {
		const text = a.frontdesk_message ?? a.notes ?? null;
		return text ? (
			<span className="block truncate text-xs" title={text}>
				{text}
			</span>
		) : (
			<Empty />
		);
	},

	payment_status: (a) => {
		if (a.is_time_block) return <Empty />;
		const pc =
			PAYMENT_STATUS_CONFIG[(a.payment_status as PaymentStatus) ?? "unpaid"];
		return (
			<span
				className={cn(
					"inline-flex rounded px-2 py-0.5 font-semibold text-[10px] uppercase",
					pc.badge,
				)}
			>
				{pc.label}
			</span>
		);
	},
};

function ApptStatusBadge({ status }: { status: AppointmentStatus }) {
	const sc =
		APPOINTMENT_STATUS_CONFIG[status] ?? APPOINTMENT_STATUS_CONFIG.pending;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold text-[10px]",
				sc.badge,
			)}
		>
			<sc.Icon className="size-3" />
			{sc.label}
		</span>
	);
}

function ApptTagChip({ code }: { code: string }) {
	const tc = useAppointmentTag(code);
	return (
		<span
			className="rounded px-1 py-px font-semibold text-[9px] text-white"
			style={{ backgroundColor: tc?.dot ?? "#94a3b8" }}
		>
			{tc?.label ?? code}
		</span>
	);
}
