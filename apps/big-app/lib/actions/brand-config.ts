"use server";

import { revalidatePath } from "next/cache";
import {
	type BrandConfigCategory,
	isBrandConfigCategory,
} from "@/lib/brand-config/categories";
import { getServerContext } from "@/lib/context/server";
import { ValidationError } from "@/lib/errors";
import * as brandConfigService from "@/lib/services/brand-config";

// Categories are referenced from many surfaces — revalidate the admin page
// and the primary consumers so rename/reorder shows up everywhere.
function revalidate() {
	revalidatePath("/config/appointments");
	revalidatePath("/config/sales");
	revalidatePath("/config/customers");
	revalidatePath("/appointments");
	revalidatePath("/customers");
	revalidatePath("/sales");
}

export async function createBrandConfigItemAction(input: unknown) {
	const ctx = await getServerContext();
	const row = await brandConfigService.createBrandConfigItem(ctx, input);
	revalidate();
	return row;
}

export async function updateBrandConfigItemAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const row = await brandConfigService.updateBrandConfigItem(ctx, id, input);
	revalidate();
	return row;
}

export async function archiveBrandConfigItemAction(id: string) {
	const ctx = await getServerContext();
	await brandConfigService.archiveBrandConfigItem(ctx, id);
	revalidate();
}

export async function deleteBrandConfigItemAction(id: string) {
	const ctx = await getServerContext();
	await brandConfigService.deleteBrandConfigItem(ctx, id);
	revalidate();
}

// Client-safe fetch of the active rows for a category. Used by dialogs that
// need a picklist without making the parent RSC fetch pre-open.
export async function listActiveBrandConfigItemsAction(category: string) {
	if (!isBrandConfigCategory(category))
		throw new ValidationError(`Unknown category "${category}"`);
	const ctx = await getServerContext();
	return brandConfigService.listActiveBrandConfigItems(
		ctx,
		category as BrandConfigCategory,
	);
}
