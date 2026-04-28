import {
	APPOINTMENT_STATUSES,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";

export const APPOINTMENT_TYPE_FILTERS = [
	"regular",
	"walkin",
	"timeblock",
] as const;

export type AppointmentTypeFilter = (typeof APPOINTMENT_TYPE_FILTERS)[number];

export const APPOINTMENT_PAYMENT_STATUSES = [
	"unpaid",
	"partial",
	"paid",
] as const;

export type AppointmentPaymentStatus =
	(typeof APPOINTMENT_PAYMENT_STATUSES)[number];

export function parseStatusParam(raw: string | undefined): AppointmentStatus[] {
	if (!raw) return [];
	const set = new Set<string>(APPOINTMENT_STATUSES);
	return raw
		.split(",")
		.map((x) => x.trim())
		.filter((x): x is AppointmentStatus => set.has(x));
}

export function parseTypeParam(
	raw: string | undefined,
): AppointmentTypeFilter[] {
	if (!raw) return [];
	const set = new Set<string>(APPOINTMENT_TYPE_FILTERS);
	return raw
		.split(",")
		.map((x) => x.trim())
		.filter((x): x is AppointmentTypeFilter => set.has(x));
}

export function parsePaymentStatusParam(
	raw: string | undefined,
): AppointmentPaymentStatus[] {
	if (!raw) return [];
	const set = new Set<string>(APPOINTMENT_PAYMENT_STATUSES);
	return raw
		.split(",")
		.map((x) => x.trim())
		.filter((x): x is AppointmentPaymentStatus => set.has(x));
}

export function appointmentMatchesTypeFilter(
	row: { customer_id: string | null; is_time_block: boolean | null },
	types: AppointmentTypeFilter[],
): boolean {
	if (types.length === 0) return true;
	const t: AppointmentTypeFilter = row.is_time_block
		? "timeblock"
		: row.customer_id
			? "regular"
			: "walkin";
	return types.includes(t);
}
