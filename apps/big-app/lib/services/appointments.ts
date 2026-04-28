import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	appointmentCancelSchema,
	appointmentFollowUpSchema,
	appointmentInputSchema,
	appointmentPaymentRemarkSchema,
	appointmentPaymentSchema,
	appointmentRescheduleSchema,
	appointmentStatusSchema,
	appointmentTagsSchema,
} from "@/lib/schemas/appointments";
import { createCustomer } from "@/lib/services/customers";
import type { Tables, TablesUpdate } from "@/lib/supabase/types";

export type Appointment = Tables<"appointments">;

export type AppointmentLineItemSummary = {
	id: string;
	service_id: string | null;
	description: string;
	quantity: number;
	unit_price: number;
	total: number | null;
	is_cancelled: boolean;
	service: {
		id: string;
		sku: string;
		name: string;
		category: { id: string; name: string } | null;
	} | null;
};

export type AppointmentSalesOrderSummary = {
	id: string;
	so_number: string;
	status: string;
	total: number;
	amount_paid: number;
	outstanding: number | null;
};

export type AppointmentWithRelations = Appointment & {
	customer: {
		id: string;
		code: string;
		first_name: string;
		last_name: string | null;
		phone: string;
		phone2: string | null;
		email: string | null;
		date_of_birth: string | null;
		gender: string | null;
		id_type: string;
		id_number: string | null;
		country_of_origin: string | null;
		source: string | null;
		profile_image_path: string | null;
		tag: string | null;
		is_vip: boolean;
		is_staff: boolean;
		smoker: "yes" | "no" | "occasionally" | null;
		drug_allergies: string | null;
		medical_conditions: string[];
		medical_alert: string | null;
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
	line_items: AppointmentLineItemSummary[];
	sales_orders: AppointmentSalesOrderSummary[];
};

const SELECT_WITH_RELATIONS =
	"*, customer:customers!appointments_customer_id_fkey(id, code, first_name, last_name, phone, phone2, email, date_of_birth, gender, id_type, id_number, country_of_origin, source, profile_image_path, tag, is_vip, is_staff, smoker, drug_allergies, medical_conditions, medical_alert), employee:employees!appointments_employee_id_fkey(id, code, first_name, last_name), room:rooms!appointments_room_id_fkey(id, name), lead_attended_by:employees!appointments_lead_attended_by_id_fkey(id, first_name, last_name), created_by_employee:employees!appointments_created_by_fkey(id, first_name, last_name), line_items:appointment_line_items!appointment_line_items_appointment_id_fkey(id, service_id, description, quantity, unit_price, total, is_cancelled, service:services!appointment_line_items_service_id_fkey(id, sku, name, category:service_categories!services_category_id_fkey(id, name))), sales_orders:sales_orders!sales_orders_appointment_id_fkey(id, so_number, status, total, amount_paid, outstanding)";

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

export async function getAppointmentByBookingRef(
	ctx: Context,
	bookingRef: string,
): Promise<AppointmentWithRelations> {
	const { data, error } = await ctx.db
		.from("appointments")
		.select(SELECT_WITH_RELATIONS)
		.eq("booking_ref", bookingRef)
		.single();
	if (error || !data)
		throw new NotFoundError(`Appointment ${bookingRef} not found`);
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
	await logStatusChange(ctx, data.id, null, data.status);
	return data;
}

async function logStatusChange(
	ctx: Context,
	appointmentId: string,
	fromStatus: string | null,
	toStatus: string,
): Promise<void> {
	await ctx.db.from("appointment_status_log").insert({
		appointment_id: appointmentId,
		from_status: fromStatus,
		to_status: toStatus,
		changed_by: ctx.currentUser?.employeeId ?? null,
	});
}

export async function updateAppointment(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Appointment> {
	const row = normalize(input);
	const { data: prev } = await ctx.db
		.from("appointments")
		.select("status")
		.eq("id", id)
		.single();
	if (row.status === "completed" && prev && prev.status !== "completed") {
		throw new ValidationError(
			"Use Mark Complete on the floating action bar to complete an appointment.",
		);
	}
	const { data, error } = await ctx.db
		.from("appointments")
		.update(row)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	if (prev && prev.status !== data.status) {
		await logStatusChange(ctx, id, prev.status, data.status);
	}
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
	if (p.status === "completed") {
		throw new ValidationError(
			"Use Mark Complete on the floating action bar to complete an appointment.",
		);
	}
	const { data: prev } = await ctx.db
		.from("appointments")
		.select("status")
		.eq("id", id)
		.single();
	const { data, error } = await ctx.db
		.from("appointments")
		.update({ status: p.status })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	if (prev && prev.status !== data.status) {
		await logStatusChange(ctx, id, prev.status, data.status);
	}
	return data;
}

// Mark an appointment as completed without going through the Collect Payment
// RPC. Used by the Floating Action Bar for two cases:
//   1. No line items at all — nothing to bill, just close the visit.
//   2. Line items exist and payment_status is already 'paid' — the paid SO
//      covers the charges (e.g. the appointment was reverted and is now
//      being re-completed). The RPC path handled the money the first time.
// Never deducts inventory. Deduction only happens inside
// collect_appointment_payment, which by construction is not called here.
export async function markAppointmentCompleted(
	ctx: Context,
	id: string,
): Promise<Appointment> {
	const { data: prev } = await ctx.db
		.from("appointments")
		.select("status")
		.eq("id", id)
		.single();
	if (!prev) throw new NotFoundError(`Appointment ${id} not found`);
	const { data, error } = await ctx.db
		.from("appointments")
		.update({ status: "completed" })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	if (prev.status !== "completed") {
		await logStatusChange(ctx, id, prev.status, "completed");
	}
	return data;
}

// Revert a completed appointment back to 'pending' so staff can reopen the
// chart for edits. Never touches sales_orders, sale_items, payments,
// payment_status, or inventory_movements — revert is about unlocking the
// clinical record, not about unwinding money. Refunds are a separate flow
// (future cancellation record) and are intentionally out of scope here.
//
// Known v1 limitation: if staff reverts a paid appointment and then adds
// new appointment_line_items, those rows are not in the existing sales
// order. Re-completing via markAppointmentCompleted() will just flip
// status (because payment_status is still 'paid') — the new items won't
// generate a new SO and won't deduct inventory. Accepted for v1; the
// intended workflow is "revert only to edit clinical data, not to re-charge".
export async function revertCompletedAppointment(
	ctx: Context,
	id: string,
): Promise<Appointment> {
	const { data: prev } = await ctx.db
		.from("appointments")
		.select("status")
		.eq("id", id)
		.single();
	if (!prev) throw new NotFoundError(`Appointment ${id} not found`);
	if (prev.status !== "completed") {
		throw new ValidationError("Only completed appointments can be reverted.");
	}
	const { data, error } = await ctx.db
		.from("appointments")
		.update({ status: "pending" })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	await logStatusChange(ctx, id, "completed", "pending");
	return data;
}

export type AppointmentStatusLogEntry = {
	id: string;
	from_status: string | null;
	to_status: string;
	changed_at: string;
	changed_by: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
};

export async function listAppointmentStatusLog(
	ctx: Context,
	appointmentId: string,
): Promise<AppointmentStatusLogEntry[]> {
	const { data, error } = await ctx.db
		.from("appointment_status_log")
		.select(
			"id, from_status, to_status, changed_at, changed_by:employees!appointment_status_log_changed_by_fkey(id, first_name, last_name)",
		)
		.eq("appointment_id", appointmentId)
		.order("changed_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as AppointmentStatusLogEntry[];
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
> & {
	outlet: { code: string } | null;
};

export async function listCustomerAppointments(
	ctx: Context,
	customerId: string,
): Promise<CustomerAppointmentSummary[]> {
	const { data, error } = await ctx.db
		.from("appointments")
		.select(
			"id, start_at, end_at, status, payment_status, booking_ref, outlet:outlets!appointments_outlet_id_fkey(code)",
		)
		.eq("customer_id", customerId)
		.order("start_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as CustomerAppointmentSummary[];
}

export type CustomerTimelineAppointment = Appointment & {
	outlet: { id: string; name: string; code: string } | null;
	room: { id: string; name: string } | null;
	employee: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
	cancelled_by_employee: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
};

export async function listCustomerTimeline(
	ctx: Context,
	customerId: string,
): Promise<CustomerTimelineAppointment[]> {
	const { data, error } = await ctx.db
		.from("appointments")
		.select(
			"*, outlet:outlets!appointments_outlet_id_fkey(id, name, code), room:rooms!appointments_room_id_fkey(id, name), employee:employees!appointments_employee_id_fkey(id, first_name, last_name), cancelled_by_employee:employees!appointments_cancelled_by_fkey(id, first_name, last_name)",
		)
		.eq("customer_id", customerId)
		.order("start_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as CustomerTimelineAppointment[];
}

// Soft-cancel: row stays so the audit trail survives on the customer detail
// timeline (and the status log picks up the → cancelled transition for free).
// The `cancellation_reason` is brand-configurable — the cancel dialog pulls
// its options from brand_config_items under category `reason.appointment_cancel`.
export async function cancelAppointment(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Appointment> {
	const { reason } = appointmentCancelSchema.parse(input);
	const { data: prev } = await ctx.db
		.from("appointments")
		.select("status")
		.eq("id", id)
		.single();
	if (prev?.status === "cancelled")
		throw new ValidationError("Appointment is already cancelled");
	const { data, error } = await ctx.db
		.from("appointments")
		.update({
			status: "cancelled",
			cancelled_at: new Date().toISOString(),
			cancelled_by: ctx.currentUser?.employeeId ?? null,
			cancellation_reason: reason,
		})
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Appointment ${id} not found`);
	await logStatusChange(ctx, id, prev?.status ?? null, "cancelled");
	return data;
}

// Convert a lead appointment into a real customer using the full customer
// form, then back-link every appointment with the same (lead_phone,
// customer_id IS NULL) pair to the new customer.
//
// We *preserve* lead_name/lead_phone/lead_source/lead_attended_by_id on the
// back-linked appointments — those are the audit breadcrumb that answers
// "did this customer originate from a lead?" after the fact. Rendering keys
// off customer_id, so once it's set the UI shows the customer; the lead_*
// columns stay quietly underneath.
export async function convertLeadToCustomer(
	ctx: Context,
	leadAppointmentId: string,
	input: unknown,
): Promise<{ customer: Tables<"customers">; linkedAppointments: number }> {
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

	const customer = await createCustomer(ctx, input);

	const link: TablesUpdate<"appointments"> = { customer_id: customer.id };
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
		customer,
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
