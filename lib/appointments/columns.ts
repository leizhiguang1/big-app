export const APPOINTMENT_COLUMN_KEYS = [
	"customer_name",
	"age",
	"dob",
	"phone",
	"email",
	"appt_type",
	"booking_ref",
	"customer_code",
	"service",
	"appt_status",
	"appt_time",
	"arrival_delay",
	"arrival_time",
	"wait_time",
	"start_time",
	"service_time",
	"completed_time",
	"appt_tag",
	"outstanding",
	"employee_name",
	"room",
	"remarks",
	"payment_status",
] as const;

export type ColumnKey = (typeof APPOINTMENT_COLUMN_KEYS)[number];

export const COLUMN_LABELS: Record<ColumnKey, string> = {
	customer_name: "Customer Name",
	age: "Age",
	dob: "DOB",
	phone: "Phone No.",
	email: "Email",
	appt_type: "Appt. Type",
	booking_ref: "Booking #",
	customer_code: "Customer #",
	service: "Service",
	appt_status: "Appt. Status",
	appt_time: "Appt. Time",
	arrival_delay: "Arrival Delay",
	arrival_time: "Arrival Time",
	wait_time: "Wait Time",
	start_time: "Start Time",
	service_time: "Service Time",
	completed_time: "Completed Time",
	appt_tag: "Appt. Tag",
	outstanding: "Outstanding",
	employee_name: "Employee Name",
	room: "Room",
	remarks: "Remarks",
	payment_status: "Payment",
};

export const COLUMN_WIDTHS: Record<ColumnKey, string | null> = {
	customer_name: null,
	age: "70px",
	dob: "100px",
	phone: "150px",
	email: "180px",
	appt_type: "90px",
	booking_ref: "140px",
	customer_code: "110px",
	service: "200px",
	appt_status: "110px",
	appt_time: "150px",
	arrival_delay: "120px",
	arrival_time: "90px",
	wait_time: "100px",
	start_time: "90px",
	service_time: "100px",
	completed_time: "110px",
	appt_tag: "140px",
	outstanding: "120px",
	employee_name: "140px",
	room: "100px",
	remarks: "200px",
	payment_status: "90px",
};

export const DEFAULT_COLUMN_ORDER: ColumnKey[] = [...APPOINTMENT_COLUMN_KEYS];

export const DEFAULT_VISIBLE: ColumnKey[] = [...APPOINTMENT_COLUMN_KEYS];

export function isColumnKey(x: unknown): x is ColumnKey {
	return (
		typeof x === "string" &&
		(APPOINTMENT_COLUMN_KEYS as readonly string[]).includes(x)
	);
}

export function sanitizeColumnOrder(input: unknown): ColumnKey[] | null {
	if (!Array.isArray(input)) return null;
	const seen = new Set<ColumnKey>();
	const out: ColumnKey[] = [];
	for (const k of input) {
		if (isColumnKey(k) && !seen.has(k)) {
			seen.add(k);
			out.push(k);
		}
	}
	for (const k of APPOINTMENT_COLUMN_KEYS) {
		if (!seen.has(k)) out.push(k);
	}
	return out;
}

export function sanitizeVisibleColumns(input: unknown): ColumnKey[] | null {
	if (!Array.isArray(input)) return null;
	const seen = new Set<ColumnKey>();
	for (const k of input) {
		if (isColumnKey(k)) seen.add(k);
	}
	return Array.from(seen);
}
