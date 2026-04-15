import { z } from "zod";

export const INVENTORY_KINDS = ["product", "consumable", "medication"] as const;
export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export const INVENTORY_KIND_LABELS: Record<InventoryKind, string> = {
	product: "Product",
	consumable: "Consumable",
	medication: "Medication",
};

export const INVENTORY_STOCK_STATUSES = ["normal", "low", "out"] as const;
export type InventoryStockStatus = (typeof INVENTORY_STOCK_STATUSES)[number];

export const INVENTORY_STOCK_STATUS_LABELS: Record<
	InventoryStockStatus,
	string
> = {
	normal: "Normal",
	low: "Low",
	out: "Out",
};

const trimmedNullable = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.nullable()
		.transform((v) => (v == null || v === "" ? null : v));

const uuidNullable = z
	.string()
	.uuid()
	.nullable()
	.transform((v) => v ?? null);

const sharedBase = z.object({
	sku: z.string().trim().min(1, "SKU is required").max(40),
	name: z.string().trim().min(1, "Name is required").max(200),
	barcode: trimmedNullable(80),
	is_sellable: z.boolean(),
	is_active: z.boolean(),

	brand_id: uuidNullable,
	category_id: uuidNullable,
	supplier_id: uuidNullable,

	purchasing_uom_id: z.string().uuid("Purchasing UoM is required"),
	stock_uom_id: z.string().uuid("Stock UoM is required"),
	purchasing_to_stock_factor: z
		.number()
		.min(1, "Conversion must be ≥ 1"),

	cost_price: z.number().min(0, "Cost must be ≥ 0"),
	selling_price: z.number().min(0, "Price must be ≥ 0"),
	stock: z.number().min(0, "Stock must be ≥ 0"),
	in_transit: z.number().min(0, "Must be ≥ 0"),
	locked: z.number().min(0, "Must be ≥ 0"),
	stock_alert_count: z.number().min(0, "Must be ≥ 0"),
	discount_cap: z.number().min(0).max(100).nullable(),
	location: trimmedNullable(120),
});

export const productCreateSchema = sharedBase.extend({
	kind: z.literal("product"),
});

export const consumableCreateSchema = sharedBase.extend({
	kind: z.literal("consumable"),
	use_uom_id: z.string().uuid("Use UoM is required"),
	stock_to_use_factor: z.number().gt(0, "Conversion must be > 0"),
});

export const medicationCreateSchema = sharedBase.extend({
	kind: z.literal("medication"),
	use_uom_id: z.string().uuid("Dispensing UoM is required"),
	stock_to_use_factor: z.number().gt(0, "Conversion must be > 0"),
	is_controlled: z.boolean(),
	needs_replenish_reminder: z.boolean(),
	prescription_dosage: z.number().gt(0, "Dosage must be > 0"),
	prescription_dosage_uom_id: z.string().uuid("Dosage UoM is required"),
	prescription_frequency: z.string().trim().min(1, "Frequency is required").max(120),
	prescription_duration: z.string().trim().min(1, "Duration is required").max(120),
	prescription_reason: z.string().trim().min(1, "Reason is required").max(200),
	prescription_notes: trimmedNullable(500),
	prescription_default_billing_qty: z
		.number()
		.min(0, "Quantity must be ≥ 0"),
});

export const inventoryItemCreateSchema = z.discriminatedUnion("kind", [
	productCreateSchema,
	consumableCreateSchema,
	medicationCreateSchema,
]);

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ConsumableCreateInput = z.infer<typeof consumableCreateSchema>;
export type MedicationCreateInput = z.infer<typeof medicationCreateSchema>;
export type InventoryItemCreateInput = z.infer<typeof inventoryItemCreateSchema>;

export const productUpdateSchema = productCreateSchema.omit({ sku: true, kind: true });
export const consumableUpdateSchema = consumableCreateSchema.omit({ sku: true, kind: true });
export const medicationUpdateSchema = medicationCreateSchema.omit({ sku: true, kind: true });

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ConsumableUpdateInput = z.infer<typeof consumableUpdateSchema>;
export type MedicationUpdateInput = z.infer<typeof medicationUpdateSchema>;

// Lookup tables

export const uomInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(40),
	description: trimmedNullable(120),
});
export type UomInput = z.infer<typeof uomInputSchema>;

export const brandInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(120),
});
export type BrandInput = z.infer<typeof brandInputSchema>;

export const categoryInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(120),
	external_code: trimmedNullable(60),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const PAYMENT_TERM_UNITS = ["days", "months"] as const;
export type PaymentTermUnit = (typeof PAYMENT_TERM_UNITS)[number];

export const supplierInputSchema = z.object({
	// Supplier Details
	name: z.string().trim().min(1, "Supplier name is required").max(160),
	description: trimmedNullable(400),
	account_number: trimmedNullable(80),
	payment_terms_value: z
		.number()
		.int("Must be a whole number")
		.min(0, "Must be ≥ 0")
		.nullable(),
	payment_terms_unit: z.enum(PAYMENT_TERM_UNITS).nullable(),

	// Contact Information
	first_name: z.string().trim().min(1, "First name is required").max(80),
	last_name: trimmedNullable(80),
	mobile_number: trimmedNullable(40),
	email: trimmedNullable(160),
	office_phone: trimmedNullable(40),
	website: trimmedNullable(200),

	// Address
	address_1: z.string().trim().min(1, "Address 1 is required").max(200),
	address_2: trimmedNullable(200),
	postcode: trimmedNullable(20),
	country: z.string().trim().min(1, "Country is required").max(80),
	state: trimmedNullable(80),
	city: trimmedNullable(80),
});
export type SupplierInput = z.infer<typeof supplierInputSchema>;
