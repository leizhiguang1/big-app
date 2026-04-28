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

export const createBrandSchema = z.object({
	subdomain: subdomainField,
	code: z
		.string()
		.trim()
		.toUpperCase()
		.min(2, "At least 2 characters")
		.max(8, "At most 8 characters")
		.regex(/^[A-Z][A-Z0-9]+$/, "Uppercase letters and digits only"),
	name: z.string().trim().min(1, "Brand name is required").max(120),
	currency_code: z.enum(
		SUPPORTED_CURRENCIES.map((c) => c.value) as [string, ...string[]],
	),
	owner_first_name: z.string().trim().min(1, "First name is required").max(60),
	owner_last_name: z.string().trim().min(1, "Last name is required").max(60),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;

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
