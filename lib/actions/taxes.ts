"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as taxesService from "@/lib/services/taxes";

export async function createTaxAction(input: unknown) {
	const ctx = await getServerContext();
	const tax = await taxesService.createTax(ctx, input);
	revalidatePath("/config/taxes");
	revalidatePath("/services");
	revalidatePath("/inventory");
	return tax;
}

export async function updateTaxAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const tax = await taxesService.updateTax(ctx, id, input);
	revalidatePath("/config/taxes");
	revalidatePath("/services");
	revalidatePath("/inventory");
	return tax;
}

export async function deleteTaxAction(id: string) {
	const ctx = await getServerContext();
	await taxesService.deleteTax(ctx, id);
	revalidatePath("/config/taxes");
	revalidatePath("/services");
	revalidatePath("/inventory");
}
