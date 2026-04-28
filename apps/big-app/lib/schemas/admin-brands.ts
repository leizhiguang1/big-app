import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/schemas/brands";

const subdomainField = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, "At least 3 characters")
	.max(63)
	.regex(
		/^[a-z](?:[a-z0-9-]{1,61}[a-z0-9])?$/,
		"Lowercase letters, digits, dashes only — no leading/trailing dash",
	)
	.refine((s) => !s.includes("--"), "No consecutive dashes");

const codeField = z
	.string()
	.trim()
	.toUpperCase()
	.min(2, "At least 2 characters")
	.max(8, "At most 8 characters")
	.regex(/^[A-Z][A-Z0-9]+$/, "Uppercase letters and digits only");

const nameField = z.string().trim().min(1, "Brand name is required").max(120);

const currencyField = z.enum(
	SUPPORTED_CURRENCIES.map((c) => c.value) as [string, ...string[]],
);

export const createBrandSchema = z.object({
	subdomain: subdomainField,
	code: codeField,
	name: nameField,
	currency_code: currencyField,
	admin_email: z.string().trim().toLowerCase().email("Valid email required"),
	admin_password: z
		.string()
		.min(8, "At least 8 characters")
		.max(72, "At most 72 characters"),
	admin_first_name: z.string().trim().min(1, "First name is required").max(60),
	admin_last_name: z.string().trim().min(1, "Last name is required").max(60),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = z.object({
	brand_id: z.string().uuid(),
	name: nameField,
	nickname: z.string().trim().max(60),
	currency_code: currencyField,
});

export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

export const setBrandActiveSchema = z.object({
	brand_id: z.string().uuid(),
	is_active: z.boolean(),
});

export type SetBrandActiveInput = z.infer<typeof setBrandActiveSchema>;

export const renameSubdomainSchema = z
	.object({
		subdomain: subdomainField,
		confirm_subdomain: subdomainField,
	})
	.refine((d) => d.subdomain === d.confirm_subdomain, {
		path: ["confirm_subdomain"],
		message: "Confirmation must match",
	});

export type RenameSubdomainInput = z.infer<typeof renameSubdomainSchema>;

export const adminRenameSubdomainSchema = z
	.object({
		brand_id: z.string().uuid(),
		subdomain: subdomainField,
		confirm_subdomain: subdomainField,
	})
	.refine((d) => d.subdomain === d.confirm_subdomain, {
		path: ["confirm_subdomain"],
		message: "Confirmation must match",
	});

export type AdminRenameSubdomainInput = z.infer<
	typeof adminRenameSubdomainSchema
>;
