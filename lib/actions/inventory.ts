"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as inventoryService from "@/lib/services/inventory";

export async function createInventoryItemAction(input: unknown) {
	const ctx = await getServerContext();
	const item = await inventoryService.createInventoryItem(ctx, input);
	revalidatePath("/inventory");
	return item;
}

export async function updateInventoryItemAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const item = await inventoryService.updateInventoryItem(ctx, id, input);
	revalidatePath("/inventory");
	return item;
}

export async function deleteInventoryItemAction(id: string) {
	const ctx = await getServerContext();
	await inventoryService.deleteInventoryItem(ctx, id);
	revalidatePath("/inventory");
}
