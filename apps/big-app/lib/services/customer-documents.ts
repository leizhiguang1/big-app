import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { customerDocumentInputSchema } from "@/lib/schemas/customer-documents";
import { createSignedReadUrls } from "@/lib/services/storage";
import type { Tables } from "@/lib/supabase/types";

export type CustomerDocument = Tables<"customer_documents">;

type EmployeeRef = {
	id: string;
	first_name: string;
	last_name: string;
} | null;

type AppointmentRef = {
	id: string;
	booking_ref: string;
	start_at: string;
} | null;

export type CustomerDocumentWithRefs = CustomerDocument & {
	uploaded_by: EmployeeRef;
	appointment: AppointmentRef;
	preview_url: string | null;
};

const SELECT_WITH_REFS = `
	*,
	uploaded_by:employees!customer_documents_uploaded_by_id_fkey(id, first_name, last_name),
	appointment:appointments!customer_documents_appointment_id_fkey(id, booking_ref, start_at)
`;

export async function listCustomerDocuments(
	ctx: Context,
	customerId: string,
): Promise<CustomerDocumentWithRefs[]> {
	const { data, error } = await ctx.db
		.from("customer_documents")
		.select(SELECT_WITH_REFS)
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	const rows = (data ?? []) as unknown as Array<
		Omit<CustomerDocumentWithRefs, "preview_url">
	>;

	const imagePaths = rows
		.filter((r) => r.mime_type.startsWith("image/"))
		.map((r) => r.storage_path);
	const urlByPath = await createSignedReadUrls(
		ctx,
		"documents",
		imagePaths,
	).catch(() => ({}) as Record<string, string>);

	return rows.map((r) => ({
		...r,
		preview_url: urlByPath[r.storage_path] ?? null,
	}));
}

export async function createCustomerDocument(
	ctx: Context,
	input: unknown,
): Promise<CustomerDocument> {
	const p = customerDocumentInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("customer_documents")
		.insert({
			customer_id: p.customer_id,
			appointment_id: p.appointment_id,
			uploaded_by_id: p.uploaded_by_id ?? ctx.currentUser?.employeeId ?? null,
			storage_path: p.storage_path,
			file_name: p.file_name,
			mime_type: p.mime_type,
			size_bytes: p.size_bytes,
		})
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	return data;
}

export async function getCustomerDocument(
	ctx: Context,
	id: string,
): Promise<CustomerDocument> {
	const { data, error } = await ctx.db
		.from("customer_documents")
		.select("*")
		.eq("id", id)
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Document ${id} not found`);
	return data;
}

export async function deleteCustomerDocument(
	ctx: Context,
	id: string,
): Promise<{ storage_path: string }> {
	const doc = await getCustomerDocument(ctx, id);
	const { error } = await ctx.db
		.from("customer_documents")
		.delete()
		.eq("id", id);
	if (error) throw new ValidationError(error.message);
	return { storage_path: doc.storage_path };
}
