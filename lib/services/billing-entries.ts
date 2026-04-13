import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { billingEntryInputSchema } from "@/lib/schemas/appointments";
import type { Tables } from "@/lib/supabase/types";

export type BillingEntry = Tables<"billing_entries">;

export type CustomerBillingEntry = BillingEntry & {
	appointment: {
		id: string;
		booking_ref: string;
		start_at: string;
		status: string;
		payment_status: string;
	} | null;
};

function normalize(input: unknown) {
	const p = billingEntryInputSchema.parse(input);
	return {
		appointment_id: p.appointment_id,
		item_type: p.item_type,
		service_id: p.service_id,
		description: p.description,
		quantity: p.quantity,
		unit_price: p.unit_price,
		notes: p.notes ?? null,
	};
}

export async function listBillingEntriesForAppointment(
	ctx: Context,
	appointmentId: string,
): Promise<BillingEntry[]> {
	const { data, error } = await ctx.db
		.from("billing_entries")
		.select("*")
		.eq("appointment_id", appointmentId)
		.order("created_at", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function listBillingEntriesForCustomer(
	ctx: Context,
	customerId: string,
): Promise<CustomerBillingEntry[]> {
	const { data, error } = await ctx.db
		.from("billing_entries")
		.select(
			"*, appointment:appointments!billing_entries_appointment_id_fkey(id, booking_ref, start_at, status, payment_status, customer_id)",
		)
		.eq("appointment.customer_id", customerId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return ((data ?? []) as unknown as CustomerBillingEntry[]).filter(
		(r) => r.appointment !== null,
	);
}

export async function createBillingEntry(
	ctx: Context,
	input: unknown,
): Promise<BillingEntry> {
	const row = normalize(input);
	const insert = {
		...row,
		created_by: ctx.currentUser?.employeeId ?? null,
	};
	const { data, error } = await ctx.db
		.from("billing_entries")
		.insert(insert)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	return data;
}

export async function createBillingEntriesBulk(
	ctx: Context,
	inputs: unknown[],
): Promise<BillingEntry[]> {
	if (!Array.isArray(inputs) || inputs.length === 0) {
		throw new ValidationError("No billing entries to save");
	}
	const createdBy = ctx.currentUser?.employeeId ?? null;
	const rows = inputs.map((input) => ({
		...normalize(input),
		created_by: createdBy,
	}));
	const { data, error } = await ctx.db
		.from("billing_entries")
		.insert(rows)
		.select("*");
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function updateBillingEntry(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<BillingEntry> {
	const row = normalize(input);
	const { data, error } = await ctx.db
		.from("billing_entries")
		.update(row)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Billing entry ${id} not found`);
	return data;
}

export async function deleteBillingEntry(
	ctx: Context,
	id: string,
): Promise<void> {
	const { error } = await ctx.db.from("billing_entries").delete().eq("id", id);
	if (error) throw new ValidationError(error.message);
}
