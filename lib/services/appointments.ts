import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	appointmentFollowUpSchema,
	appointmentInputSchema,
	appointmentPaymentRemarkSchema,
	appointmentPaymentSchema,
	appointmentRescheduleSchema,
	appointmentStatusSchema,
	appointmentTagsSchema,
	convertLeadInputSchema,
} from "@/lib/schemas/appointments";
import type { Tables, TablesUpdate } from "@/lib/supabase/types";

export type Appointment = Tables<"appointments">;

export type AppointmentWithRelations = Appointment & {
	customer: {
		id: string;
		code: string;
		first_name: string;
		last_name: string | null;
		phone: string;
	} | null;
	employee: {
		id: string;
		code: string;
		first_name: string;
		last_name: string;
	} | null;
	room: { id: string; name: string } | null;
	lead_attended_by: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
	created_by_employee: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
};

const SELECT_WITH_RELATIONS =
	"*, customer:customers!appointments_customer_id_fkey(id, code, first_name, last_name, phone), employee:employees!appointments_employee_id_fkey(id, code, first_name, last_name), room:rooms!appointments_room_id_fkey(id, name), lead_attended_by:employees!appointments_lead_attended_by_id_fkey(id, first_name, last_name), created_by_employee:employees!appointments_created_by_fkey(id, first_name, last_name)";

function nz<T>(value: T | undefined | null): T | null {
	return value === undefined || value === null ? null : value;
}

function normalize(input: unknown) {
	const p = appointmentInputSchema.parse(input);
	const isBlock = p.is_time_block;
	const hasCustomer = !isBlock && !!p.customer_id;
	const isLead = !isBlock && !hasCustomer;
	return {
		customer_id: isBlock ? null : nz(p.customer_id),
		employee_id: nz(p.employee_id),
		outlet_id: p.outlet_id,
		room_id: nz(p.room_id),
		start_at: new Date(p.start_at).toISOString(),
		end_at: new Date(p.end_at).toISOString(),
		status: p.status,
		payment_status: p.payment_status,
		notes: p.notes ?? null,
		tags: p.tags,
		is_time_block: isBlock,
		block_title: isBlock ? (p.block_title ?? null) : null,
		lead_name: isLead ? (p.lead_name ?? null) : null,
		lead_phone: isLead ? (p.lead_phone ?? null) : null,
		lead_source: isLead ? (p.lead_source ?? null) : null,
		lead_attended_by_id: isLead ? nz(p.lead_attended_by_id) : null,
	};
}

export async function listAppointmentsForRange(
	ctx: Context,
	args: { outletId: string; from: string; to: string },
): Promise<AppointmentWithRelations[]> {
	const { data, error } = await ctx.db
		.from("appointments")
		.select(SELECT_WITH_RELATIONS)
		.eq("outlet_id", args.outletId)
		.gte("start_at", args.from)
		.lt("start_at", args.to)
		.order("start_at", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as AppointmentWithRelations[];
}

export async function getAppointment(
	ctx: Context,
	id: string,
): Promise<AppointmentWithRelations> {
	const { data, error } = await ctx.db
		.from("appointments")
		.select(SELECT_WITH_RELATIONS)
		.eq("id", id)
		.single();
	if (error || !data) throw new NotFoundError(`Appointment ${id} not found`);
	return data as unknown as AppointmentWithRelations;
}

export async function createAppointment(
	ctx: Context,
	input: unknown,
): Promise<Appointment> {
	const row = normalize(input);
	const insert = {
		...row,
		created_by: ctx.currentUser?.employeeId ?? null,
	};
	const { data, error } = await ctx.db
		.from("appointments")
		.insert(insert)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23503")
			throw new ConflictError("Referenced record no longer exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateAppointment(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Appointment> {
	const row = normalize(input);
	const { data, error } = await ctx.db
		.from("appointments")
		.update(row)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	return data;
}

export async function rescheduleAppointment(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Appointment> {
	const p = appointmentRescheduleSchema.parse(input);
	const update: TablesUpdate<"appointments"> = {
		start_at: new Date(p.start_at).toISOString(),
		end_at: new Date(p.end_at).toISOString(),
	};
	if (p.employee_id !== undefined) update.employee_id = p.employee_id;
	if (p.room_id !== undefined) update.room_id = p.room_id;
	const { data, error } = await ctx.db
		.from("appointments")
		.update(update)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	return data;
}

export async function setAppointmentStatus(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Appointment> {
	const p = appointmentStatusSchema.parse(input);
	const { data, error } = await ctx.db
		.from("appointments")
		.update({ status: p.status })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	return data;
}

export async function setAppointmentPayment(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Appointment> {
	const p = appointmentPaymentSchema.parse(input);
	const { data, error } = await ctx.db
		.from("appointments")
		.update({ payment_status: p.payment_status, paid_via: p.paid_via })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	return data;
}

export async function setAppointmentPaymentRemark(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Appointment> {
	const p = appointmentPaymentRemarkSchema.parse(input);
	const { data, error } = await ctx.db
		.from("appointments")
		.update({ payment_remark: p.payment_remark })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	return data;
}

export async function setAppointmentTags(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Appointment> {
	const p = appointmentTagsSchema.parse(input);
	const { data, error } = await ctx.db
		.from("appointments")
		.update({ tags: p.tags })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	return data;
}

export async function setAppointmentFollowUp(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Appointment> {
	const p = appointmentFollowUpSchema.parse(input);
	const { data, error } = await ctx.db
		.from("appointments")
		.update({ follow_up: p.follow_up })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	return data;
}

export type CustomerAppointmentSummary = Pick<
	Appointment,
	"id" | "start_at" | "end_at" | "status" | "payment_status" | "booking_ref"
>;

export async function listCustomerAppointments(
	ctx: Context,
	customerId: string,
): Promise<CustomerAppointmentSummary[]> {
	const { data, error } = await ctx.db
		.from("appointments")
		.select("id, start_at, end_at, status, payment_status, booking_ref")
		.eq("customer_id", customerId)
		.order("start_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function deleteAppointment(
	ctx: Context,
	id: string,
): Promise<void> {
	const { error } = await ctx.db.from("appointments").delete().eq("id", id);
	if (error) throw new ValidationError(error.message);
}

// Convert a lead appointment into a real customer, then back-link every
// appointment with the same (lead_phone, customer_id IS NULL) pair to the
// new customer. Mirrors the reference prototype's one-click flow.
export async function convertLeadToCustomer(
	ctx: Context,
	leadAppointmentId: string,
	input: unknown,
): Promise<{ customerId: string; linkedAppointments: number }> {
	const p = convertLeadInputSchema.parse(input);

	const { data: lead, error: leadErr } = await ctx.db
		.from("appointments")
		.select("id, outlet_id, lead_phone, customer_id, is_time_block")
		.eq("id", leadAppointmentId)
		.single();
	if (leadErr || !lead)
		throw new NotFoundError(`Appointment ${leadAppointmentId} not found`);
	if (lead.customer_id)
		throw new ValidationError("Appointment is already linked to a customer");
	if (lead.is_time_block)
		throw new ValidationError("Cannot convert a time block to a customer");

	const { data: created, error: createErr } = await ctx.db
		.from("customers")
		.insert({
			salutation: "Mr",
			first_name: p.first_name,
			last_name: p.last_name ?? null,
			id_type: "ic",
			phone: p.phone,
			home_outlet_id: p.home_outlet_id,
			consultant_id: p.consultant_id,
			source: "walk_in",
			is_vip: false,
			opt_in_notifications: true,
			opt_in_marketing: true,
		})
		.select("id")
		.single();
	if (createErr || !created) {
		if (createErr?.code === "23505")
			throw new ConflictError("A customer with that phone already exists");
		throw new ValidationError(
			createErr?.message ?? "Failed to create customer",
		);
	}

	// Back-link every matching lead appointment: same phone, no customer,
	// not a time block. Cleanest when two bookings share the same walk-in.
	const link: TablesUpdate<"appointments"> = {
		customer_id: created.id,
		lead_name: null,
		lead_phone: null,
		lead_source: null,
		lead_attended_by_id: null,
	};
	const linkQuery = ctx.db
		.from("appointments")
		.update(link)
		.is("customer_id", null)
		.eq("is_time_block", false);
	const { data: linked, error: linkErr } = lead.lead_phone
		? await linkQuery.eq("lead_phone", lead.lead_phone).select("id")
		: await linkQuery.eq("id", leadAppointmentId).select("id");
	if (linkErr) throw new ValidationError(linkErr.message);

	return {
		customerId: created.id,
		linkedAppointments: linked?.length ?? 0,
	};
}

// Soft conflict check — caller decides whether to warn or block.
export async function findOverlappingAppointments(
	ctx: Context,
	args: {
		outletId: string;
		employeeId: string | null;
		startAt: string;
		endAt: string;
		excludeId: string | null;
	},
): Promise<Appointment[]> {
	if (!args.employeeId) return [];
	const { data, error } = await ctx.db
		.from("appointments")
		.select("*")
		.eq("outlet_id", args.outletId)
		.eq("employee_id", args.employeeId)
		.lt("start_at", args.endAt)
		.gt("end_at", args.startAt);
	if (error) throw new ValidationError(error.message);
	return (data ?? []).filter((a) => a.id !== args.excludeId);
}
