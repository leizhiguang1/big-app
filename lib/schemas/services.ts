import { z } from "zod";

export const SERVICE_TYPES = ["retail", "non_retail"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
	retail: "Retail",
	non_retail: "Non-Retail",
};

export const serviceCreateSchema = z.object({
	sku: z.string().trim().min(1, "SKU is required").max(40),
	name: z.string().trim().min(1, "Name is required").max(200),
	category_id: z.string().uuid().nullable(),
	type: z.enum(SERVICE_TYPES),
	duration_min: z
		.number()
		.int()
		.min(5, "Minimum 5 minutes")
		.max(600, "Maximum 600 minutes"),
	price: z.number().min(0, "Price must be ≥ 0"),
	incentive_type: z.string().trim().max(80).nullable(),
	consumables: z.string().trim().max(500).nullable(),
	discount_cap: z.number().min(0, "Min 0").max(100, "Max 100").nullable(),
	full_payment: z.boolean(),
	is_active: z.boolean(),
});

export const serviceUpdateSchema = serviceCreateSchema.omit({ sku: true });

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;

export const serviceCategoryInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(80),
	sort_order: z.number().int().min(0).max(9999),
	is_active: z.boolean(),
});

export type ServiceCategoryInput = z.infer<typeof serviceCategoryInputSchema>;
