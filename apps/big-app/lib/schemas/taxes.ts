import { z } from "zod";

export const taxInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(80),
	rate_pct: z
		.number()
		.min(0, "Rate must be ≥ 0")
		.max(100, "Rate must be ≤ 100"),
	is_active: z.boolean(),
});

export type TaxInput = z.infer<typeof taxInputSchema>;
