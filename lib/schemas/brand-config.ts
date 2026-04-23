import { z } from "zod";

const hexColor = z
	.string()
	.trim()
	.regex(/^#[0-9a-fA-F]{6}$/i, "Color must be a 6-digit hex like #ea580c");

const code = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(
		/^[A-Z0-9_./-]+$/,
		"Code must be uppercase letters, digits, or _ . / -",
	);

// Used when the category allows new codes (codeEditable: true). Label+color
// apply to every category; sort_order defaults server-side to end-of-list.
export const newBrandConfigItemInputSchema = z.object({
	category: z.string().min(1),
	code: code.optional(), // derived from label when omitted
	label: z.string().trim().min(1).max(200),
	color: hexColor.nullish(),
	sort_order: z.number().int().nonnegative().optional(),
	metadata: z.record(z.string(), z.unknown()).nullish(),
});
export type NewBrandConfigItemInput = z.infer<
	typeof newBrandConfigItemInputSchema
>;

// Used for edits. `code` is NOT in the update shape — once written, codes
// never change so transactional rows that reference the code continue to
// resolve. Use archive (is_active=false) + new row for effective renames.
export const brandConfigItemUpdateSchema = z.object({
	label: z.string().trim().min(1).max(200).optional(),
	color: hexColor.nullish().optional(),
	sort_order: z.number().int().nonnegative().optional(),
	is_active: z.boolean().optional(),
	metadata: z.record(z.string(), z.unknown()).nullish().optional(),
});
export type BrandConfigItemUpdate = z.infer<typeof brandConfigItemUpdateSchema>;
