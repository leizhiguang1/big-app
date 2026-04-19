import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { medicalCertificateCreateSchema } from "@/lib/schemas/medical-certificates";
import type { Tables } from "@/lib/supabase/types";

export type MedicalCertificate = Tables<"medical_certificates">;

type CustomerRef = {
	id: string;
	code: string;
	first_name: string;
	last_name: string | null;
	id_number: string | null;
};

type OutletRef = {
	id: string;
	code: string;
	name: string;
	address1: string | null;
	address2: string | null;
	city: string | null;
	state: string | null;
	postcode: string | null;
	country: string | null;
	phone: string | null;
	email: string | null;
};

type EmployeeRef = {
	id: string;
	first_name: string;
	last_name: string;
} | null;

export type MedicalCertificateWithRefs = MedicalCertificate & {
	customer: CustomerRef;
	outlet: OutletRef;
	issuing_employee: EmployeeRef;
};

const SELECT_WITH_REFS = `
	*,
	customer:customers!medical_certificates_customer_id_fkey(id, code, first_name, last_name, id_number),
	outlet:outlets!medical_certificates_outlet_id_fkey(id, code, name, address1, address2, city, state, postcode, country, phone, email),
	issuing_employee:employees!medical_certificates_issuing_employee_id_fkey(id, first_name, last_name)
`;

function addDaysISO(startISO: string, wholeDays: number): string {
	const [y, m, d] = startISO.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() + wholeDays);
	return dt.toISOString().slice(0, 10);
}

function deriveDayOffEnd(input: {
	start_date: string;
	duration_days: number;
}): {
	end_date: string;
	half_day_period: "AM" | "PM" | null;
} {
	const hasFractional =
		Math.abs(input.duration_days - Math.floor(input.duration_days)) > 0.01;
	const wholeOffset = Math.floor(input.duration_days) - (hasFractional ? 0 : 1);
	const end_date = addDaysISO(input.start_date, Math.max(0, wholeOffset));
	return {
		end_date,
		half_day_period: hasFractional ? "AM" : null,
	};
}

export async function listMedicalCertificatesForAppointment(
	ctx: Context,
	appointmentId: string,
): Promise<MedicalCertificateWithRefs[]> {
	const { data, error } = await ctx.db
		.from("medical_certificates")
		.select(SELECT_WITH_REFS)
		.eq("appointment_id", appointmentId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as MedicalCertificateWithRefs[];
}

export async function listMedicalCertificatesForCustomer(
	ctx: Context,
	customerId: string,
): Promise<MedicalCertificateWithRefs[]> {
	const { data, error } = await ctx.db
		.from("medical_certificates")
		.select(SELECT_WITH_REFS)
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as MedicalCertificateWithRefs[];
}

export async function getMedicalCertificate(
	ctx: Context,
	id: string,
): Promise<MedicalCertificateWithRefs> {
	const { data, error } = await ctx.db
		.from("medical_certificates")
		.select(SELECT_WITH_REFS)
		.eq("id", id)
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Medical certificate ${id} not found`);
	return data as unknown as MedicalCertificateWithRefs;
}

export async function createMedicalCertificate(
	ctx: Context,
	input: unknown,
): Promise<MedicalCertificate> {
	const p = medicalCertificateCreateSchema.parse(input);
	const shared = {
		appointment_id: p.appointment_id,
		customer_id: p.customer_id,
		outlet_id: p.outlet_id,
		issuing_employee_id:
			p.issuing_employee_id ?? ctx.currentUser?.employeeId ?? null,
		slip_type: p.slip_type,
		start_date: p.start_date,
		reason: p.reason,
	};

	const row =
		p.slip_type === "day_off"
			? (() => {
					const { end_date, half_day_period } = deriveDayOffEnd({
						start_date: p.start_date,
						duration_days: p.duration_days,
					});
					return {
						...shared,
						end_date,
						duration_days: p.duration_days,
						has_half_day: p.has_half_day,
						half_day_period: p.has_half_day ? half_day_period : null,
					};
				})()
			: {
					...shared,
					end_date: p.start_date,
					start_time: p.start_time,
					end_time: p.end_time,
					duration_hours: p.duration_hours,
				};

	const { data, error } = await ctx.db
		.from("medical_certificates")
		.insert(row)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	return data;
}
