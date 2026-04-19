export type DiscountType = "percent" | "amount";

export type Allocation = { employeeId: string; percent: number };

export type Line = {
	id: string;
	service_id: string | null;
	inventory_item_id: string | null;
	item_type: "service" | "product" | "charge";
	item_name: string;
	sku: string;
	quantity: number;
	unit_price: number;
	tax_id: string | null;
	discount_type: DiscountType;
	discount_input: string;
	tooth_number: string;
	surface: string;
	remarks: string;
};

export type PaymentEntry = {
	key: string;
	mode: string;
	amount: string;
	remarks: string;
	bank: string;
	card_type: string;
	trace_no: string;
	approval_code: string;
	reference_no: string;
	months: string;
};
