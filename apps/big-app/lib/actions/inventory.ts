"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as inventoryService from "@/lib/services/inventory";

// ---------- Items ----------

export async function createInventoryItemAction(input: unknown) {
	const ctx = await getServerContext();
	const item = await inventoryService.createInventoryItem(ctx, input);
	revalidatePath("/o/[outlet]/inventory", "page");
	return item;
}

export async function updateInventoryItemAction(
	id: string,
	kind: "product" | "consumable" | "medication",
	input: unknown,
) {
	const ctx = await getServerContext();
	const item = await inventoryService.updateInventoryItem(ctx, id, kind, input);
	revalidatePath("/o/[outlet]/inventory", "page");
	return item;
}

export async function deleteInventoryItemAction(id: string) {
	const ctx = await getServerContext();
	await inventoryService.deleteInventoryItem(ctx, id);
	revalidatePath("/o/[outlet]/inventory", "page");
}

// ---------- UoMs ----------

export async function createUomAction(input: unknown) {
	const ctx = await getServerContext();
	const row = await inventoryService.createUom(ctx, input);
	revalidatePath("/o/[outlet]/inventory/uom", "page");
	return row;
}

export async function updateUomAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const row = await inventoryService.updateUom(ctx, id, input);
	revalidatePath("/o/[outlet]/inventory/uom", "page");
	return row;
}

export async function deleteUomAction(id: string) {
	const ctx = await getServerContext();
	await inventoryService.deleteUom(ctx, id);
	revalidatePath("/o/[outlet]/inventory/uom", "page");
}

// ---------- Brands ----------

export async function createBrandAction(input: unknown) {
	const ctx = await getServerContext();
	const row = await inventoryService.createBrand(ctx, input);
	revalidatePath("/o/[outlet]/inventory/options", "page");
	return row;
}

export async function updateBrandAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const row = await inventoryService.updateBrand(ctx, id, input);
	revalidatePath("/o/[outlet]/inventory/options", "page");
	return row;
}

export async function deleteBrandAction(id: string) {
	const ctx = await getServerContext();
	await inventoryService.deleteBrand(ctx, id);
	revalidatePath("/o/[outlet]/inventory/options", "page");
}

// ---------- Categories ----------

export async function createCategoryAction(input: unknown) {
	const ctx = await getServerContext();
	const row = await inventoryService.createCategory(ctx, input);
	revalidatePath("/o/[outlet]/inventory/options", "page");
	return row;
}

export async function updateCategoryAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const row = await inventoryService.updateCategory(ctx, id, input);
	revalidatePath("/o/[outlet]/inventory/options", "page");
	return row;
}

export async function deleteCategoryAction(id: string) {
	const ctx = await getServerContext();
	await inventoryService.deleteCategory(ctx, id);
	revalidatePath("/o/[outlet]/inventory/options", "page");
}

// ---------- Suppliers ----------

export async function createSupplierAction(input: unknown) {
	const ctx = await getServerContext();
	const row = await inventoryService.createSupplier(ctx, input);
	revalidatePath("/o/[outlet]/inventory/options", "page");
	return row;
}

export async function updateSupplierAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const row = await inventoryService.updateSupplier(ctx, id, input);
	revalidatePath("/o/[outlet]/inventory/options", "page");
	return row;
}

export async function deleteSupplierAction(id: string) {
	const ctx = await getServerContext();
	await inventoryService.deleteSupplier(ctx, id);
	revalidatePath("/o/[outlet]/inventory/options", "page");
}
