import { z } from "zod";

export const saveReceiptInputSchema = z.object({
	customer_name: z.string().trim().min(1, "Customer name is required").max(200),
	remarks: z.string().trim().max(2000).default(""),
});

export type SaveReceiptInput = z.infer<typeof saveReceiptInputSchema>;
