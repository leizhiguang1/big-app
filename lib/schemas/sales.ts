import { z } from "zod";

export const SALES_PAYMENT_MODES = [
	"cash",
	"card",
	"bank_transfer",
	"e_wallet",
	"other",
] as const;
export type SalesPaymentMode = (typeof SALES_PAYMENT_MODES)[number];

export const SALES_PAYMENT_MODE_LABEL: Record<SalesPaymentMode, string> = {
	cash: "Cash",
	card: "Card",
	bank_transfer: "Bank Transfer",
	e_wallet: "E-Wallet",
	other: "Other",
};

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

export const collectPaymentInputSchema = z.object({
	items: z
		.array(collectPaymentItemSchema)
		.min(1, "At least one line item is required"),
	discount: z.coerce.number().min(0).default(0),
	tax: z.coerce.number().min(0).default(0),
	rounding: z.coerce.number().default(0),
	payment_mode: z.enum(SALES_PAYMENT_MODES),
	amount: z.coerce
		.number()
		.positive("Payment amount must be greater than zero"),
	remarks: z
		.string()
		.trim()
		.max(500)
		.nullish()
		.transform((v) => (v && v.length > 0 ? v : null)),
});
export type CollectPaymentInput = z.infer<typeof collectPaymentInputSchema>;
