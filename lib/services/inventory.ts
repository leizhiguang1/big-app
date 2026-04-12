import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	inventoryItemCreateSchema,
	inventoryItemUpdateSchema,
} from "@/lib/schemas/inventory";
import type { Tables } from "@/lib/supabase/types";

export type InventoryItem = Tables<"inventory_items">;

export async function listInventoryItems(
	ctx: Context,
): Promise<InventoryItem[]> {
	const { data, error } = await ctx.db
		.from("inventory_items")
		.select("*")
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function getInventoryItem(
	ctx: Context,
	id: string,
): Promise<InventoryItem> {
	const { data, error } = await ctx.db
		.from("inventory_items")
		.select("*")
		.eq("id", id)
		.single();
	if (error || !data) throw new NotFoundError(`Inventory item ${id} not found`);
	return data;
}

export async function createInventoryItem(
	ctx: Context,
	input: unknown,
): Promise<InventoryItem> {
	const parsed = inventoryItemCreateSchema.parse(input);
	const { data, error } = await ctx.db
		.from("inventory_items")
		.insert({
			sku: parsed.sku,
			name: parsed.name,
			type: parsed.type,
			barcode: parsed.barcode,
			uom: parsed.uom,
			price: parsed.price,
			brand: parsed.brand,
			category: parsed.category,
			supplier: parsed.supplier,
			stock: parsed.stock,
			in_transit: parsed.in_transit,
			locked: parsed.locked,
			low_alert_count: parsed.low_alert_count,
			discount_cap: parsed.discount_cap,
			is_active: parsed.is_active,
		})
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("An inventory item with that SKU already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateInventoryItem(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<InventoryItem> {
	const parsed = inventoryItemUpdateSchema.parse(input);
	const { data, error } = await ctx.db
		.from("inventory_items")
		.update({
			name: parsed.name,
			type: parsed.type,
			barcode: parsed.barcode,
			uom: parsed.uom,
			price: parsed.price,
			brand: parsed.brand,
			category: parsed.category,
			supplier: parsed.supplier,
			stock: parsed.stock,
			in_transit: parsed.in_transit,
			locked: parsed.locked,
			low_alert_count: parsed.low_alert_count,
			discount_cap: parsed.discount_cap,
			is_active: parsed.is_active,
		})
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Inventory item ${id} not found`);
	return data;
}

export async function deleteInventoryItem(
	ctx: Context,
	id: string,
): Promise<void> {
	const { error } = await ctx.db.from("inventory_items").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This item is referenced by existing records. Mark it inactive from the edit form instead.",
			);
		throw new ValidationError(error.message);
	}
}
