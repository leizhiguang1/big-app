"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as receiptsService from "@/lib/services/receipts";

export async function loadReceiptForPaymentAction(paymentId: string) {
	const ctx = await getServerContext();
	const receipt = await receiptsService.getReceiptByPaymentId(ctx, paymentId);
	const edits = await receiptsService.listReceiptEdits(ctx, receipt.id);
	return { receipt, edits };
}

export async function saveReceiptAction(receiptId: string, input: unknown) {
	const ctx = await getServerContext();
	await receiptsService.saveReceiptEdit(ctx, receiptId, input);
	const receipt = await receiptsService.getReceiptById(ctx, receiptId);
	const edits = await receiptsService.listReceiptEdits(ctx, receiptId);
	revalidatePath("/customers/[id]", "page");
	revalidatePath("/receipts/[id]", "page");
	return { receipt, edits };
}
