import { z } from "zod";

export const INVENTORY_TYPES = [
	"product_retail",
	"product_non_retail",
	"medication_retail",
	"medication_non_retail",
	"consumable_retail",
	"consumable_non_retail",
] as const;
export type InventoryType = (typeof INVENTORY_TYPES)[number];

export const INVENTORY_TYPE_LABELS: Record<InventoryType, string> = {
	product_retail: "Product (Retail)",
	product_non_retail: "Product (Non-Retail)",
	medication_retail: "Medication (Retail)",
	medication_non_retail: "Medication (Non-Retail)",
	consumable_retail: "Consumable (Retail)",
	consumable_non_retail: "Consumable (Non-Retail)",
};

export const INVENTORY_STOCK_STATUSES = ["ok", "low", "out"] as const;
export type InventoryStockStatus = (typeof INVENTORY_STOCK_STATUSES)[number];

export const INVENTORY_STOCK_STATUS_LABELS: Record<
	InventoryStockStatus,
	string
> = {
	ok: "OK",
	low: "Low",
	out: "Out",
};

const nullableStr = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.nullable()
		.transform((v) => (v == null || v === "" ? null : v));

export const inventoryItemCreateSchema = z.object({
	sku: z.string().trim().min(1, "SKU is required").max(40),
	name: z.string().trim().min(1, "Name is required").max(200),
	type: z.enum(INVENTORY_TYPES),
	barcode: nullableStr(80),
	uom: z.string().trim().min(1, "UoM is required").max(20),
	price: z.number().min(0, "Price must be ≥ 0"),
	brand: nullableStr(120),
	category: nullableStr(120),
	supplier: nullableStr(160),
	stock: z.number().min(0, "Stock must be ≥ 0"),
	in_transit: z.number().min(0, "Must be ≥ 0"),
	locked: z.number().min(0, "Must be ≥ 0"),
	low_alert_count: z.number().min(0, "Must be ≥ 0"),
	discount_cap: z.number().min(0).max(100).nullable(),
	is_active: z.boolean(),
});

export const inventoryItemUpdateSchema = inventoryItemCreateSchema.omit({
	sku: true,
});

export type InventoryItemCreateInput = z.infer<
	typeof inventoryItemCreateSchema
>;
export type InventoryItemUpdateInput = z.infer<
	typeof inventoryItemUpdateSchema
>;
