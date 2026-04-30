"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as taxesService from "@/lib/services/taxes";

export async function createTaxAction(input: unknown) {
	const ctx = await getServerContext();
	const tax = await taxesService.createTax(ctx, input);
	revalidatePath("/o/[outlet]/config/taxes", "page");
	revalidatePath("/o/[outlet]/services", "page");
	revalidatePath("/o/[outlet]/inventory", "page");
	return tax;
}

export async function updateTaxAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const tax = await taxesService.updateTax(ctx, id, input);
	revalidatePath("/o/[outlet]/config/taxes", "page");
	revalidatePath("/o/[outlet]/services", "page");
	revalidatePath("/o/[outlet]/inventory", "page");
	return tax;
}

export async function deleteTaxAction(id: string) {
	const ctx = await getServerContext();
	await taxesService.deleteTax(ctx, id);
	revalidatePath("/o/[outlet]/config/taxes", "page");
	revalidatePath("/o/[outlet]/services", "page");
	revalidatePath("/o/[outlet]/inventory", "page");
}
