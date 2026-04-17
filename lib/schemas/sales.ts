import { z } from "zod";

export const collectPaymentItemSchema = z.object({
	service_id: z.string().uuid().nullable(),
	inventory_item_id: z.string().uuid().nullable(),
	sku: z.string().nullable(),
	item_name: z.string().trim().min(1, "Item name is required").max(200),
	item_type: z.enum(["service", "product", "charge"]).default("service"),
	quantity: z.coerce.number().positive("Quantity must be > 0"),
	unit_price: z.coerce.number().min(0, "Price cannot be negative"),
	discount: z.coerce.number().min(0).default(0),
	tax_id: z.string().uuid().nullable(),
});
export type CollectPaymentItem = z.infer<typeof collectPaymentItemSchema>;

const nullishTrimmed = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.nullish()
		.transform((v) => (v && v.length > 0 ? v : null));

export const paymentEntrySchema = z.object({
	mode: z.string().trim().min(1, "Payment method is required"),
	amount: z.coerce.number().positive("Payment amount must be > 0"),
	remarks: nullishTrimmed(500),
	bank: nullishTrimmed(80),
	card_type: nullishTrimmed(40),
	trace_no: nullishTrimmed(40),
	approval_code: nullishTrimmed(40),
	reference_no: nullishTrimmed(100),
	months: z.coerce
		.number()
		.int()
		.positive()
		.nullish()
		.transform((v) => (v && v > 0 ? v : null)),
});
export type PaymentEntry = z.infer<typeof paymentEntrySchema>;

export const paymentAllocationSchema = z.object({
	item_index: z.coerce.number().int().min(0),
	amount: z.coerce.number().min(0),
});
export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>;

export const collectPaymentInputSchema = z.object({
	items: z
		.array(collectPaymentItemSchema)
		.min(1, "At least one line item is required"),
	discount: z.coerce.number().min(0).default(0),
	tax: z.coerce.number().min(0).default(0),
	rounding: z.coerce.number().default(0),
	payments: z
		.array(paymentEntrySchema)
		.min(1, "At least one payment entry is required"),
	allocations: z.array(paymentAllocationSchema).nullish(),
	remarks: nullishTrimmed(500),
	sold_at: z
		.string()
		.datetime({ offset: true })
		.nullish()
		.transform((v) => (v && v.length > 0 ? v : null)),
	frontdesk_message: nullishTrimmed(1000),
});
export type CollectPaymentInput = z.infer<typeof collectPaymentInputSchema>;

export const cancelSalesOrderInputSchema = z.object({
	reason: z
		.string()
		.trim()
		.min(1, "Cancellation reason is required")
		.max(500),
	amount: z.coerce.number().min(0).optional(),
	tax: z.coerce.number().min(0).optional(),
});
export type CancelSalesOrderInput = z.infer<
	typeof cancelSalesOrderInputSchema
>;
