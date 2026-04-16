import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
	caseNoteInputSchema,
	caseNoteUpdateSchema,
} from "@/lib/schemas/case-notes";
import type { Tables } from "@/lib/supabase/types";

export type CaseNote = Tables<"case_notes">;

export type CaseNoteWithAuthor = CaseNote & {
	employee: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
};

export type CaseNoteWithContext = CaseNoteWithAuthor & {
	appointment: {
		id: string;
		booking_ref: string;
		start_at: string;
	} | null;
};

const SELECT_WITH_AUTHOR =
	"*, employee:employees!case_notes_employee_id_fkey(id, first_name, last_name)";

const SELECT_WITH_CONTEXT =
	"*, employee:employees!case_notes_employee_id_fkey(id, first_name, last_name), appointment:appointments!case_notes_appointment_id_fkey(id, booking_ref, start_at)";

export async function listCaseNotesForCustomer(
	ctx: Context,
	customerId: string,
): Promise<CaseNoteWithAuthor[]> {
	const { data, error } = await ctx.db
		.from("case_notes")
		.select(SELECT_WITH_AUTHOR)
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as CaseNoteWithAuthor[];
}

export async function listCaseNotesWithContext(
	ctx: Context,
	customerId: string,
): Promise<CaseNoteWithContext[]> {
	const { data, error } = await ctx.db
		.from("case_notes")
		.select(SELECT_WITH_CONTEXT)
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as CaseNoteWithContext[];
}

export async function createCaseNote(
	ctx: Context,
	input: unknown,
): Promise<CaseNote> {
	const p = caseNoteInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("case_notes")
		.insert({
			appointment_id: p.appointment_id,
			customer_id: p.customer_id,
			employee_id: p.employee_id ?? ctx.currentUser?.employeeId ?? null,
			content: p.content,
		})
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	return data;
}

export async function updateCaseNote(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<CaseNote> {
	const p = caseNoteUpdateSchema.parse(input);
	const { data, error } = await ctx.db
		.from("case_notes")
		.update({ content: p.content })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Case note ${id} not found`);
	return data;
}

export async function setCaseNotePin(
	ctx: Context,
	id: string,
	pinned: boolean,
): Promise<CaseNote> {
	const { data, error } = await ctx.db
		.from("case_notes")
		.update({ is_pinned: pinned })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Case note ${id} not found`);
	return data;
}

export async function cancelCaseNote(
	ctx: Context,
	id: string,
): Promise<CaseNote> {
	const { data, error } = await ctx.db
		.from("case_notes")
		.update({ is_cancelled: true })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Case note ${id} not found`);
	return data;
}

export async function revertCaseNote(
	ctx: Context,
	id: string,
): Promise<CaseNote> {
	const { data, error } = await ctx.db
		.from("case_notes")
		.update({ is_cancelled: false })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Case note ${id} not found`);
	return data;
}

export async function deleteCaseNote(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db.from("case_notes").delete().eq("id", id);
	if (error) throw new ValidationError(error.message);
}
