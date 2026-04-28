"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as paymentMethodsService from "@/lib/services/payment-methods";

function revalidate() {
	revalidatePath("/config/sales/payment");
	revalidatePath("/appointments");
}

export async function createPaymentMethodAction(input: unknown) {
	const ctx = await getServerContext();
	const method = await paymentMethodsService.createPaymentMethod(ctx, input);
	revalidate();
	return method;
}

export async function updatePaymentMethodAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const method = await paymentMethodsService.updatePaymentMethod(
		ctx,
		id,
		input,
	);
	revalidate();
	return method;
}

export async function deletePaymentMethodAction(id: string) {
	const ctx = await getServerContext();
	await paymentMethodsService.deletePaymentMethod(ctx, id);
	revalidate();
}

export async function listActivePaymentMethodsAction() {
	const ctx = await getServerContext();
	return paymentMethodsService.listActivePaymentMethods(ctx);
}
