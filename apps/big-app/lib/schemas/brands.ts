import { z } from "zod";

const optionalText = (max: number) =>
	z.string().trim().max(max).optional().or(z.literal(""));

export const SUPPORTED_CURRENCIES = [
	{ value: "MYR", label: "Malaysian Ringgit (MYR)" },
	{ value: "SGD", label: "Singapore Dollar (SGD)" },
	{ value: "USD", label: "US Dollar (USD)" },
	{ value: "PHP", label: "Philippine Peso (PHP)" },
	{ value: "THB", label: "Thai Baht (THB)" },
	{ value: "IDR", label: "Indonesian Rupiah (IDR)" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["value"];

export const brandUpdateSchema = z.object({
	name: z.string().trim().min(1, "Business name is required").max(120),
	nickname: optionalText(60),
	logo_url: optionalText(500),
	contact_phone: optionalText(40),
	currency_code: z.enum(
		SUPPORTED_CURRENCIES.map((c) => c.value) as [
			CurrencyCode,
			...CurrencyCode[],
		],
	),
	// Subdomain stored now; routing wires up later.
	// DNS-label rules: lowercase a–z, digits, hyphens; no leading/trailing hyphen; max 63 chars.
	subdomain: z
		.string()
		.trim()
		.toLowerCase()
		.max(63)
		.regex(
			/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
			"Use lowercase letters, digits, or dashes (no leading/trailing dash)",
		)
		.optional()
		.or(z.literal("")),
	registered_name: optionalText(160),
	registration_number: optionalText(60),
	tax_id: optionalText(60),
	address: optionalText(500),
	email: z
		.string()
		.trim()
		.email("Enter a valid email")
		.max(160)
		.optional()
		.or(z.literal("")),
	website: optionalText(255),
	tagline: optionalText(160),
});

export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;
