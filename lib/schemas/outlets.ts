import { z } from "zod";

const optionalText = (max: number) =>
	z.string().trim().max(max).optional().or(z.literal(""));

export const outletCreateSchema = z.object({
	code: z
		.string()
		.trim()
		.min(2, "Code must be 2–6 characters")
		.max(6, "Code must be 2–6 characters")
		.regex(
			/^[A-Z0-9]+$/,
			"Use uppercase letters or digits only (no dashes or spaces)",
		),
	name: z.string().trim().min(1, "Name is required").max(120),
	nick_name: optionalText(60),
	company_reg_number: optionalText(40),
	company_reg_name: optionalText(120),
	show_reg_number_on_invoice: z.boolean(),
	tax_number: optionalText(40),
	show_tax_number_on_invoice: z.boolean(),
	address1: optionalText(160),
	address2: optionalText(160),
	postcode: optionalText(20),
	country: optionalText(80),
	state: optionalText(80),
	city: optionalText(80),
	phone: optionalText(40),
	phone2: optionalText(40),
	email: z.string().trim().email().max(160).optional().or(z.literal("")),
	bank_name: optionalText(80),
	bank_account_number: optionalText(40),
	waze_name: optionalText(120),
	location_video_url: optionalText(500),
	location_link: optionalText(500),
	logo_url: optionalText(500),
	is_active: z.boolean(),
});

export const outletUpdateSchema = outletCreateSchema.omit({ code: true });

export type OutletCreateInput = z.infer<typeof outletCreateSchema>;
export type OutletUpdateInput = z.infer<typeof outletUpdateSchema>;

export const roomInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(80),
	sort_order: z.number().int().min(0).max(9999),
	is_active: z.boolean(),
});

export type RoomInput = z.infer<typeof roomInputSchema>;
