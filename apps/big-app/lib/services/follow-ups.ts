import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
	followUpInputSchema,
	followUpReminderDoneSchema,
	followUpUpdateSchema,
} from "@/lib/schemas/follow-ups";
import {
	assertAppointmentInBrand,
	assertCustomerInBrand,
	assertEmployeeInBrand,
} from "@/lib/supabase/brand-ownership";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type FollowUp = Tables<"appointment_follow_ups">;

type EmployeeRef = {
	id: string;
	first_name: string;
	last_name: string;
} | null;

export type FollowUpWithRefs = FollowUp & {
	author: EmployeeRef;
	reminder_employee: EmployeeRef;
};

type CustomerRef = {
	id: string;
	code: string;
	first_name: string;
	last_name: string | null;
	phone: string | null;
} | null;

type AppointmentRef = {
	id: string;
	booking_ref: string;
	start_at: string;
} | null;

export type ReminderFollowUp = FollowUp & {
	author: EmployeeRef;
	customer: CustomerRef;
	appointment: AppointmentRef;
};

const SELECT_WITH_REFS = `
	*,
	author:employees!appointment_follow_ups_author_id_fkey(id, first_name, last_name),
	reminder_employee:employees!appointment_follow_ups_reminder_employee_id_fkey(id, first_name, last_name)
`;

const SELECT_FOR_REMINDER = `
	*,
	author:employees!appointment_follow_ups_author_id_fkey(id, first_name, last_name),
	customer:customers!appointment_follow_ups_customer_id_fkey(id, code, first_name, last_name, phone),
	appointment:appointments!appointment_follow_ups_appointment_id_fkey(id, booking_ref, start_at)
`;

export async function listFollowUpsForCustomer(
	ctx: Context,
	customerId: string,
): Promise<FollowUpWithRefs[]> {
	await assertCustomerInBrand(ctx, customerId);
	const { data, error } = await ctx.db
		.from("appointment_follow_ups")
		.select(SELECT_WITH_REFS)
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as FollowUpWithRefs[];
}

export async function listFollowUpsForAppointment(
	ctx: Context,
	appointmentId: string,
): Promise<FollowUpWithRefs[]> {
	await assertAppointmentInBrand(ctx, appointmentId);
	const { data, error } = await ctx.db
		.from("appointment_follow_ups")
		.select(SELECT_WITH_REFS)
		.eq("appointment_id", appointmentId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as FollowUpWithRefs[];
}

export async function listRemindersForEmployee(
	ctx: Context,
	employeeId: string,
): Promise<ReminderFollowUp[]> {
	await assertEmployeeInBrand(ctx, employeeId);
	const { data, error } = await ctx.db
		.from("appointment_follow_ups")
		.select(SELECT_FOR_REMINDER)
		.eq("reminder_employee_id", employeeId)
		.eq("has_reminder", true)
		.order("reminder_done", { ascending: true })
		.order("reminder_date", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as ReminderFollowUp[];
}

export async function createFollowUp(
	ctx: Context,
	input: unknown,
): Promise<FollowUp> {
	const p = followUpInputSchema.parse(input);
	if (p.customer_id) await assertCustomerInBrand(ctx, p.customer_id);
	if (p.appointment_id) await assertAppointmentInBrand(ctx, p.appointment_id);
	const { data, error } = await ctx.db
		.from("appointment_follow_ups")
		.insert({
			appointment_id: p.appointment_id,
			customer_id: p.customer_id,
			author_id: p.author_id ?? ctx.currentUser?.employeeId ?? null,
			content: p.content,
			has_reminder: p.has_reminder,
			reminder_date: p.has_reminder ? p.reminder_date : null,
			reminder_method: p.has_reminder ? p.reminder_method : null,
			reminder_employee_id: p.has_reminder ? p.reminder_employee_id : null,
		})
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	return data;
}

export async function updateFollowUp(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<FollowUp> {
	await assertFollowUpInBrand(ctx, id);
	const p = followUpUpdateSchema.parse(input);
	const { data, error } = await ctx.db
		.from("appointment_follow_ups")
		.update({
			content: p.content,
			has_reminder: p.has_reminder,
			reminder_date: p.has_reminder ? p.reminder_date : null,
			reminder_method: p.has_reminder ? p.reminder_method : null,
			reminder_employee_id: p.has_reminder ? p.reminder_employee_id : null,
		})
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Follow-up ${id} not found`);
	return data;
}

export async function setFollowUpReminderDone(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<FollowUp> {
	await assertFollowUpInBrand(ctx, id);
	const p = followUpReminderDoneSchema.parse(input);
	const { data, error } = await ctx.db
		.from("appointment_follow_ups")
		.update({ reminder_done: p.reminder_done })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Follow-up ${id} not found`);
	return data;
}

export async function setFollowUpPin(
	ctx: Context,
	id: string,
	pinned: boolean,
): Promise<FollowUp> {
	await assertFollowUpInBrand(ctx, id);
	const { data, error } = await ctx.db
		.from("appointment_follow_ups")
		.update({ is_pinned: pinned })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Follow-up ${id} not found`);
	return data;
}

export async function deleteFollowUp(ctx: Context, id: string): Promise<void> {
	await assertFollowUpInBrand(ctx, id);
	const { error } = await ctx.db
		.from("appointment_follow_ups")
		.delete()
		.eq("id", id);
	if (error) throw new ValidationError(error.message);
}

// follow_ups inherit brand via customers.brand_id.
async function assertFollowUpInBrand(
	ctx: Context,
	followUpId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("appointment_follow_ups")
		.select("id, customers!inner(brand_id)")
		.eq("id", followUpId)
		.eq("customers.brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Follow-up ${followUpId} not found`);
}
