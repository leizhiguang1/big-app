import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	brandInputSchema,
	categoryInputSchema,
	consumableCreateSchema,
	consumableUpdateSchema,
	type InventoryItemCreateInput,
	medicationCreateSchema,
	medicationUpdateSchema,
	productCreateSchema,
	productUpdateSchema,
	supplierInputSchema,
	uomInputSchema,
} from "@/lib/schemas/inventory";
import { assertBrandId } from "@/lib/supabase/query";
import {
	listTaxIdsForInventoryItem,
	setTaxesForInventoryItem,
} from "@/lib/services/taxes";
import type { Tables } from "@/lib/supabase/types";

export type InventoryItem = Tables<"inventory_items">;
export type InventoryUom = Tables<"inventory_uoms">;
export type InventoryBrand = Tables<"inventory_brands">;
export type InventoryCategory = Tables<"inventory_categories">;
export type Supplier = Tables<"suppliers">;

export type InventoryItemWithRefs = InventoryItem & {
	brand: { id: string; name: string } | null;
	category: { id: string; name: string } | null;
	supplier: { id: string; name: string } | null;
	purchasing_uom: { id: string; name: string } | null;
	stock_uom: { id: string; name: string } | null;
	use_uom: { id: string; name: string } | null;
	tax_ids: string[];
};

const SELECT_WITH_REFS = `
	*,
	brand:inventory_brands!inventory_items_manufacturer_brand_id_fkey(id, name),
	category:inventory_categories!inventory_items_category_id_fkey(id, name),
	supplier:suppliers!inventory_items_supplier_id_fkey(id, name),
	purchasing_uom:inventory_uoms!inventory_items_purchasing_uom_id_fkey(id, name),
	stock_uom:inventory_uoms!inventory_items_stock_uom_id_fkey(id, name),
	use_uom:inventory_uoms!inventory_items_use_uom_id_fkey(id, name),
	inventory_item_taxes(tax_id)
` as const;

function attachTaxIds(row: unknown): InventoryItemWithRefs {
	const r = row as InventoryItemWithRefs & {
		inventory_item_taxes: { tax_id: string }[] | null;
	};
	const { inventory_item_taxes, ...rest } = r;
	return {
		...rest,
		tax_ids: (inventory_item_taxes ?? []).map((t) => t.tax_id),
	} as InventoryItemWithRefs;
}

// ---------- Items ----------

export async function listInventoryItems(
	ctx: Context,
): Promise<InventoryItemWithRefs[]> {
	const { data, error } = await ctx.db
		.from("inventory_items")
		.select(SELECT_WITH_REFS)
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []).map((row) => attachTaxIds(row));
}

// Sellable products only — used by the appointment billing item picker.
// Filters: kind='product', is_sellable=true, is_active=true.
export async function listSellableProducts(
	ctx: Context,
): Promise<InventoryItemWithRefs[]> {
	const { data, error } = await ctx.db
		.from("inventory_items")
		.select(SELECT_WITH_REFS)
		.eq("kind", "product")
		.eq("is_sellable", true)
		.eq("is_active", true)
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []).map((row) => attachTaxIds(row));
}

export async function getInventoryItem(
	ctx: Context,
	id: string,
): Promise<InventoryItemWithRefs> {
	const { data, error } = await ctx.db
		.from("inventory_items")
		.select(SELECT_WITH_REFS)
		.eq("id", id)
		.single();
	if (error || !data) throw new NotFoundError(`Inventory item ${id} not found`);
	return attachTaxIds(data);
}

function buildItemRow(parsed: InventoryItemCreateInput) {
	const base = {
		sku: parsed.sku,
		name: parsed.name,
		kind: parsed.kind,
		barcode: parsed.barcode,
		is_sellable: parsed.is_sellable,
		is_active: parsed.is_active,
		manufacturer_brand_id: parsed.manufacturer_brand_id,
		category_id: parsed.category_id,
		supplier_id: parsed.supplier_id,
		purchasing_uom_id: parsed.purchasing_uom_id,
		stock_uom_id: parsed.stock_uom_id,
		purchasing_to_stock_factor: parsed.purchasing_to_stock_factor,
		cost_price: parsed.cost_price,
		selling_price: parsed.selling_price,
		stock: parsed.stock,
		in_transit: parsed.in_transit,
		locked: parsed.locked,
		stock_alert_count: parsed.stock_alert_count,
		discount_cap: parsed.discount_cap,
		location: parsed.location,
	};

	if (parsed.kind === "product") {
		return {
			...base,
			use_uom_id: null,
			stock_to_use_factor: null,
			is_controlled: null,
			needs_replenish_reminder: null,
			prescription_dosage: null,
			prescription_dosage_uom_id: null,
			prescription_frequency: null,
			prescription_duration: null,
			prescription_reason: null,
			prescription_notes: null,
			prescription_default_billing_qty: null,
		};
	}

	if (parsed.kind === "consumable") {
		return {
			...base,
			use_uom_id: parsed.use_uom_id,
			stock_to_use_factor: parsed.stock_to_use_factor,
			is_controlled: null,
			needs_replenish_reminder: null,
			prescription_dosage: null,
			prescription_dosage_uom_id: null,
			prescription_frequency: null,
			prescription_duration: null,
			prescription_reason: null,
			prescription_notes: null,
			prescription_default_billing_qty: null,
		};
	}

	return {
		...base,
		use_uom_id: parsed.use_uom_id,
		stock_to_use_factor: parsed.stock_to_use_factor,
		is_controlled: parsed.is_controlled,
		needs_replenish_reminder: parsed.needs_replenish_reminder,
		prescription_dosage: parsed.prescription_dosage,
		prescription_dosage_uom_id: parsed.prescription_dosage_uom_id,
		prescription_frequency: parsed.prescription_frequency,
		prescription_duration: parsed.prescription_duration,
		prescription_reason: parsed.prescription_reason,
		prescription_notes: parsed.prescription_notes,
		prescription_default_billing_qty: parsed.prescription_default_billing_qty,
	};
}

export async function createInventoryItem(
	ctx: Context,
	input: unknown,
): Promise<InventoryItem> {
	const parsed = parseCreate(input);
	const { data, error } = await ctx.db
		.from("inventory_items")
		.insert({ ...buildItemRow(parsed), brand_id: assertBrandId(ctx) })
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("An inventory item with that SKU already exists");
		throw new ValidationError(error.message);
	}
	await setTaxesForInventoryItem(ctx, data.id, parsed.tax_ids);
	return data;
}

export async function updateInventoryItem(
	ctx: Context,
	id: string,
	kind: "product" | "consumable" | "medication",
	input: unknown,
): Promise<InventoryItem> {
	const parsed = parseUpdate(kind, input);
	// Re-construct a full create input shape so buildItemRow handles per-kind nulls
	const row = buildItemRow({
		...parsed,
		sku: "__placeholder__",
		kind,
	} as InventoryItemCreateInput);
	const { sku: _omit, ...updateRow } = row;
	const { data, error } = await ctx.db
		.from("inventory_items")
		.update(updateRow)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Inventory item ${id} not found`);
	await setTaxesForInventoryItem(ctx, id, parsed.tax_ids);
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

function parseCreate(input: unknown): InventoryItemCreateInput {
	if (typeof input !== "object" || input === null || !("kind" in input)) {
		throw new ValidationError("Inventory item kind is required");
	}
	const kind = (input as { kind: string }).kind;
	if (kind === "product") return productCreateSchema.parse(input);
	if (kind === "consumable") return consumableCreateSchema.parse(input);
	if (kind === "medication") return medicationCreateSchema.parse(input);
	throw new ValidationError(`Unknown inventory item kind: ${kind}`);
}

function parseUpdate(
	kind: "product" | "consumable" | "medication",
	input: unknown,
) {
	if (kind === "product") return productUpdateSchema.parse(input);
	if (kind === "consumable") return consumableUpdateSchema.parse(input);
	return medicationUpdateSchema.parse(input);
}

// ---------- UoMs ----------

export async function listUoms(ctx: Context): Promise<InventoryUom[]> {
	const { data, error } = await ctx.db
		.from("inventory_uoms")
		.select("*")
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function createUom(
	ctx: Context,
	input: unknown,
): Promise<InventoryUom> {
	const parsed = uomInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("inventory_uoms")
		.insert(parsed)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A UoM with that name already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateUom(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<InventoryUom> {
	const parsed = uomInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("inventory_uoms")
		.update(parsed)
		.eq("id", id)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A UoM with that name already exists");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`UoM ${id} not found`);
	return data;
}

export async function deleteUom(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db.from("inventory_uoms").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This UoM is used by inventory items and cannot be deleted.",
			);
		throw new ValidationError(error.message);
	}
}

// ---------- Brands ----------

export async function listBrands(ctx: Context): Promise<InventoryBrand[]> {
	const { data, error } = await ctx.db
		.from("inventory_brands")
		.select("*")
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function createBrand(
	ctx: Context,
	input: unknown,
): Promise<InventoryBrand> {
	const parsed = brandInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("inventory_brands")
		.insert(parsed)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A brand with that name already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateBrand(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<InventoryBrand> {
	const parsed = brandInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("inventory_brands")
		.update(parsed)
		.eq("id", id)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A brand with that name already exists");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Brand ${id} not found`);
	return data;
}

export async function deleteBrand(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db.from("inventory_brands").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This brand is used by inventory items and cannot be deleted.",
			);
		throw new ValidationError(error.message);
	}
}

// ---------- Categories ----------

export async function listCategories(
	ctx: Context,
): Promise<InventoryCategory[]> {
	const { data, error } = await ctx.db
		.from("inventory_categories")
		.select("*")
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function createCategory(
	ctx: Context,
	input: unknown,
): Promise<InventoryCategory> {
	const parsed = categoryInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("inventory_categories")
		.insert(parsed)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A category with that name already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateCategory(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<InventoryCategory> {
	const parsed = categoryInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("inventory_categories")
		.update(parsed)
		.eq("id", id)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A category with that name already exists");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Category ${id} not found`);
	return data;
}

export async function deleteCategory(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db
		.from("inventory_categories")
		.delete()
		.eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This category is used by inventory items and cannot be deleted.",
			);
		throw new ValidationError(error.message);
	}
}

// ---------- Suppliers ----------

export async function listSuppliers(ctx: Context): Promise<Supplier[]> {
	const { data, error } = await ctx.db
		.from("suppliers")
		.select("*")
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function createSupplier(
	ctx: Context,
	input: unknown,
): Promise<Supplier> {
	const parsed = supplierInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("suppliers")
		.insert(parsed)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A supplier with that name already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateSupplier(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Supplier> {
	const parsed = supplierInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("suppliers")
		.update(parsed)
		.eq("id", id)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A supplier with that name already exists");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Supplier ${id} not found`);
	return data;
}

export async function deleteSupplier(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db.from("suppliers").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This supplier is used by inventory items and cannot be deleted.",
			);
		throw new ValidationError(error.message);
	}
}
