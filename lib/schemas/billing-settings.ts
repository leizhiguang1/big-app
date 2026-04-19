import { z } from "zod";

// Toggle and tax selections are stored independently. Whether the rule
// actually *applies* at sale time is a runtime check in resolveDefaultTaxId —
// it no-ops when foreign_tax_id is null, so staff can configure in any order.
export const billingSettingsInputSchema = z.object({
	auto_foreign_tax_enabled: z.boolean(),
	local_tax_id: z.string().uuid().nullable(),
	foreign_tax_id: z.string().uuid().nullable(),
});

export type BillingSettingsInput = z.infer<typeof billingSettingsInputSchema>;
