import { z } from "zod";

export const SERVICE_TYPES = ["retail", "non_retail"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
	retail: "Retail",
	non_retail: "Non-Retail",
};

export const serviceInventoryLinkSchema = z.object({
	inventory_item_id: z.string().uuid(),
	default_quantity: z
		.number()
		.positive("Quantity must be greater than 0")
		.max(999_999, "Quantity too large"),
});

export type ServiceInventoryLinkInput = z.infer<
	typeof serviceInventoryLinkSchema
>;

const serviceBaseShape = z.object({
	id: z.string().uuid().optional(),
	sku: z.string().trim().min(1, "SKU is required").max(40),
	name: z.string().trim().min(1, "Name is required").max(200),
	category_id: z.string().uuid().nullable(),
	type: z.enum(SERVICE_TYPES),
	duration_min: z
		.number()
		.int()
		.min(5, "Minimum 5 minutes")
		.max(600, "Maximum 600 minutes"),
	external_code: z.string().trim().max(80).nullable(),
	image_url: z.string().trim().max(500).nullable(),
	price: z.number().min(0, "Price must be ≥ 0"),
	price_min: z.number().min(0, "Min price must be ≥ 0").nullable(),
	price_max: z.number().min(0, "Max price must be ≥ 0").nullable(),
	other_fees: z.number().min(0, "Other fees must be ≥ 0"),
	incentive_type: z.string().trim().max(80).nullable(),
	discount_cap: z.number().min(0, "Min 0").max(100, "Max 100").nullable(),
	allow_redemption_without_payment: z.boolean(),
	allow_cash_price_range: z.boolean(),
	is_active: z.boolean(),
	tax_ids: z.array(z.string().uuid()),
	inventory_links: z.array(serviceInventoryLinkSchema),
});

type ServiceRangeFields = {
	price: number;
	price_min: number | null;
	price_max: number | null;
	allow_cash_price_range: boolean;
};

const refinePriceRange = (val: ServiceRangeFields, ctx: z.RefinementCtx) => {
	if (val.allow_cash_price_range) {
		if (val.price_min == null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["price_min"],
				message: "Min price is required when price range is enabled",
			});
		}
		if (val.price_max == null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["price_max"],
				message: "Max price is required when price range is enabled",
			});
		}
		if (
			val.price_min != null &&
			val.price_max != null &&
			val.price_max < val.price_min
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["price_max"],
				message: "Max price must be ≥ min price",
			});
		}
		if (
			val.price_min != null &&
			val.price_max != null &&
			(val.price < val.price_min || val.price > val.price_max)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["price"],
				message: "Default price must sit within min–max range",
			});
		}
		return;
	}
	if (val.price_min != null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["price_min"],
			message: "Min price must be blank when range is disabled",
		});
	}
	if (val.price_max != null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["price_max"],
			message: "Max price must be blank when range is disabled",
		});
	}
};

export const serviceCreateSchema =
	serviceBaseShape.superRefine(refinePriceRange);

export const serviceUpdateSchema = serviceBaseShape
	.omit({ sku: true })
	.superRefine(refinePriceRange);

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;

export const serviceCategoryInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(80),
	sort_order: z.number().int().min(0).max(9999),
	is_active: z.boolean(),
});

export type ServiceCategoryInput = z.infer<typeof serviceCategoryInputSchema>;
