export const SALES_TABS = [
	{ key: "summary", label: "Summary" },
	{ key: "sales", label: "Sales" },
	{ key: "payment", label: "Payment" },
	{ key: "payor", label: "Payor" },
	{ key: "cancelled", label: "Cancelled" },
	{ key: "petty-cash", label: "Petty Cash" },
	{ key: "self-bill", label: "Self Bill" },
] as const;

export type SalesTabKey = (typeof SALES_TABS)[number]["key"];
