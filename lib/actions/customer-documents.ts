"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as customerDocumentsService from "@/lib/services/customer-documents";
import {
	buildCustomerDocumentPath,
	createSignedReadUrl,
	createSignedUploadUrl,
	deleteObject,
} from "@/lib/services/storage";

export async function requestCustomerDocumentUploadUrlAction(args: {
	customerId: string;
	filename: string;
	mime: string;
}) {
	const ctx = await getServerContext();
	const path = buildCustomerDocumentPath({
		customerId: args.customerId,
		filename: args.filename,
		mime: args.mime,
	});
	return createSignedUploadUrl(ctx, "documents", path);
}

export async function createCustomerDocumentAction(
	appointmentId: string | null,
	input: unknown,
) {
	const ctx = await getServerContext();
	const doc = await customerDocumentsService.createCustomerDocument(ctx, input);
	if (appointmentId) revalidatePath("/appointments/[ref]", "page");
	return doc;
}

export async function getCustomerDocumentSignedUrlAction(
	id: string,
): Promise<string> {
	const ctx = await getServerContext();
	const doc = await customerDocumentsService.getCustomerDocument(ctx, id);
	return createSignedReadUrl(ctx, "documents", doc.storage_path, 60 * 10);
}

export async function deleteCustomerDocumentAction(
	appointmentId: string | null,
	id: string,
) {
	const ctx = await getServerContext();
	const { storage_path } =
		await customerDocumentsService.deleteCustomerDocument(ctx, id);
	await deleteObject(ctx, "documents", storage_path).catch(() => {
		// orphan blob — the row is already gone, a cleanup pass can sweep later
	});
	if (appointmentId) revalidatePath("/appointments/[ref]", "page");
}
