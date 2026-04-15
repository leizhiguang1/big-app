import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
	lineItemIncentiveInputSchema,
	lineItemInputSchema,
} from "@/lib/schemas/appointments";
import type { Tables } from "@/lib/supabase/types";

export type AppointmentLineItem = Tables<"appointment_line_items">;
export type AppointmentLineItemIncentive =
	Tables<"appointment_line_item_incentives">;

export type CustomerLineItem = AppointmentLineItem & {
	service: { sku: string; name: string } | null;
	appointment: {
		id: string;
		booking_ref: string;
		start_at: string;
		status: string;
		payment_status: string;
		paid_via: string | null;
		employee: {
			id: string;
			first_name: string;
			last_name: string;
		} | null;
	} | null;
};

function normalize(input: unknown) {
	const p = lineItemInputSchema.parse(input);
	return {
		appointment_id: p.appointment_id,
		item_type: p.item_type,
		service_id: p.service_id ?? null,
		product_id: p.product_id ?? null,
		description: p.description,
		quantity: p.quantity,
		unit_price: p.unit_price,
		tax_id: p.tax_id ?? null,
		notes: p.notes ?? null,
	};
}

export async function listLineItemsForAppointment(
	ctx: Context,
	appointmentId: string,
): Promise<AppointmentLineItem[]> {
	const { data, error } = await ctx.db
		.from("appointment_line_items")
		.select("*")
		.eq("appointment_id", appointmentId)
		.order("created_at", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function listLineItemsForCustomer(
	ctx: Context,
	customerId: string,
): Promise<CustomerLineItem[]> {
	const { data, error } = await ctx.db
		.from("appointment_line_items")
		.select(
			"*, service:services!appointment_line_items_service_id_fkey(sku, name), appointment:appointments!appointment_line_items_appointment_id_fkey(id, booking_ref, start_at, status, payment_status, paid_via, customer_id, employee:employees!appointments_employee_id_fkey(id, first_name, last_name))",
		)
		.eq("appointment.customer_id", customerId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return ((data ?? []) as unknown as CustomerLineItem[]).filter(
		(r) => r.appointment !== null,
	);
}

export async function createLineItem(
	ctx: Context,
	input: unknown,
): Promise<AppointmentLineItem> {
	const row = normalize(input);
	const insert = {
		...row,
		created_by: ctx.currentUser?.employeeId ?? null,
	};
	const { data, error } = await ctx.db
		.from("appointment_line_items")
		.insert(insert)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	return data;
}

export async function createLineItemsBulk(
	ctx: Context,
	inputs: unknown[],
): Promise<AppointmentLineItem[]> {
	if (!Array.isArray(inputs) || inputs.length === 0) {
		throw new ValidationError("No line items to save");
	}
	const createdBy = ctx.currentUser?.employeeId ?? null;
	const rows = inputs.map((input) => ({
		...normalize(input),
		created_by: createdBy,
	}));
	const { data, error } = await ctx.db
		.from("appointment_line_items")
		.insert(rows)
		.select("*");
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function updateLineItem(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<AppointmentLineItem> {
	const row = normalize(input);
	const { data, error } = await ctx.db
		.from("appointment_line_items")
		.update(row)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Line item ${id} not found`);
	return data;
}

export async function deleteLineItem(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db
		.from("appointment_line_items")
		.delete()
		.eq("id", id);
	if (error) throw new ValidationError(error.message);
}

// ─── Incentives (per-line employee attribution) ─────────────────────────────
// Incentives must attach to a line item with item_type='service'. The
// service layer enforces this invariant — Postgres CHECK constraints can't
// express "parent must have column X equal to Y" without a trigger.

async function assertServiceLineItem(
	ctx: Context,
	lineItemId: string,
): Promise<void> {
	const { data, error } = await ctx.db
		.from("appointment_line_items")
		.select("id, item_type")
		.eq("id", lineItemId)
		.maybeSingle();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Line item ${lineItemId} not found`);
	if (data.item_type !== "service") {
		throw new ValidationError(
			"Incentives can only attach to service line items",
		);
	}
}

export type IncentiveWithEmployee = AppointmentLineItemIncentive & {
	employee: {
		id: string;
		first_name: string;
		last_name: string | null;
	} | null;
};

export async function listIncentivesForAppointment(
	ctx: Context,
	appointmentId: string,
): Promise<IncentiveWithEmployee[]> {
	const { data, error } = await ctx.db
		.from("appointment_line_item_incentives")
		.select(
			"*, line_item:appointment_line_items!inner(appointment_id), employee:employees!appointment_line_item_incentives_employee_id_fkey(id, first_name, last_name)",
		)
		.eq("line_item.appointment_id", appointmentId)
		.order("created_at", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as IncentiveWithEmployee[];
}

export async function createIncentive(
	ctx: Context,
	input: unknown,
): Promise<AppointmentLineItemIncentive> {
	const p = lineItemIncentiveInputSchema.parse(input);
	await assertServiceLineItem(ctx, p.line_item_id);
	const { data, error } = await ctx.db
		.from("appointment_line_item_incentives")
		.insert({
			line_item_id: p.line_item_id,
			employee_id: p.employee_id,
			created_by: ctx.currentUser?.employeeId ?? null,
		})
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505") {
			throw new ValidationError(
				"That employee is already attributed to this line item",
			);
		}
		throw new ValidationError(error.message);
	}
	return data;
}

export async function deleteIncentive(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db
		.from("appointment_line_item_incentives")
		.delete()
		.eq("id", id);
	if (error) throw new ValidationError(error.message);
}
