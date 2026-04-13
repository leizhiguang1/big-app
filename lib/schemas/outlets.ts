import { z } from "zod";

const optionalText = (max: number) =>
	z.string().trim().max(max).optional().or(z.literal(""));

export const outletCreateSchema = z.object({
	code: z
		.string()
		.trim()
		.min(1, "Code is required")
		.max(16)
		.regex(/^[A-Z0-9-]+$/, "Use uppercase letters, digits, or dashes only"),
	name: z.string().trim().min(1, "Name is required").max(120),
	address1: optionalText(160),
	address2: optionalText(160),
	city: optionalText(80),
	state: optionalText(80),
	postcode: optionalText(20),
	country: optionalText(80),
	phone: optionalText(40),
	email: z.string().trim().email().max(160).optional().or(z.literal("")),
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
