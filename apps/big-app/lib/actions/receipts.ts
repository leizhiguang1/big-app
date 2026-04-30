"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import { getBrand } from "@/lib/services/brands";
import * as receiptsService from "@/lib/services/receipts";

export async function loadReceiptForPaymentAction(paymentId: string) {
	const ctx = await getServerContext();
	const receipt = await receiptsService.getReceiptByPaymentId(ctx, paymentId);
	const [edits, brand] = await Promise.all([
		receiptsService.listReceiptEdits(ctx, receipt.id),
		getBrand(ctx).catch(() => null),
	]);
	return { receipt, edits, brand };
}

export async function saveReceiptAction(receiptId: string, input: unknown) {
	const ctx = await getServerContext();
	await receiptsService.saveReceiptEdit(ctx, receiptId, input);
	const [receipt, edits, brand] = await Promise.all([
		receiptsService.getReceiptById(ctx, receiptId),
		receiptsService.listReceiptEdits(ctx, receiptId),
		getBrand(ctx).catch(() => null),
	]);
	revalidatePath("/o/[outlet]/customers/[id]", "page");
	revalidatePath("/receipts/[id]", "page");
	return { receipt, edits, brand };
}
