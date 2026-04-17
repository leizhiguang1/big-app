import { z } from "zod";

export const paymentMethodInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(80),
	is_active: z.boolean(),
	sort_order: z.coerce.number().int().min(0).max(9999),
});
export type PaymentMethodInput = z.infer<typeof paymentMethodInputSchema>;

export const newPaymentMethodInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(80),
});
export type NewPaymentMethodInput = z.infer<typeof newPaymentMethodInputSchema>;
