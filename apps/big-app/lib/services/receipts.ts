import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
	type SaveReceiptInput,
	saveReceiptInputSchema,
} from "@/lib/schemas/receipts";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type Receipt = Tables<"receipts">;
export type ReceiptEdit = Tables<"receipt_edits">;

type EmployeeRef = {
	id: string;
	first_name: string;
	last_name: string | null;
} | null;

type SaleItemSnapshot = {
	id: string;
	item_name: string;
	sku: string | null;
	quantity: number;
	unit_price: number;
	discount: number;
	total: number;
	tax_rate_pct: number | null;
};

type CustomerSnapshot = {
	id: string;
	code: string;
	salutation: string | null;
	first_name: string;
	last_name: string | null;
	id_number: string | null;
	phone: string | null;
	address1: string | null;
	address2: string | null;
	postcode: string | null;
	city: string | null;
	state: string | null;
	address_country: string | null;
} | null;

type OutletSnapshot = {
	id: string;
	code: string;
	name: string;
	company_reg_name: string | null;
	company_reg_number: string | null;
	address1: string | null;
	address2: string | null;
	postcode: string | null;
	city: string | null;
	state: string | null;
	country: string | null;
	phone: string | null;
	email: string | null;
	tax_number: string | null;
	logo_url: string | null;
	show_reg_number_on_invoice: boolean;
	show_tax_number_on_invoice: boolean;
};

export type ReceiptDetail = {
	id: string;
	receipt_no: string;
	customer_name_override: string | null;
	remarks_override: string | null;
	created_at: string;
	updated_at: string;
	outlet: OutletSnapshot;
	payment: {
		id: string;
		invoice_no: string;
		paid_at: string;
		amount: number;
		payment_mode: string;
		bank: string | null;
		card_type: string | null;
		trace_no: string | null;
		approval_code: string | null;
		reference_no: string | null;
		method: { code: string; name: string } | null;
		processed_by: EmployeeRef;
		ordinal: number;
		paymentTotalCount: number;
	};
	salesOrder: {
		id: string;
		so_number: string;
		total: number;
		amount_paid: number;
		outstanding: number;
		consultant: EmployeeRef;
		customer: CustomerSnapshot;
		items: SaleItemSnapshot[];
	};
};

export type ReceiptEditWithRefs = ReceiptEdit & {
	editor: EmployeeRef;
	outlet: { id: string; code: string; name: string } | null;
};

const RECEIPT_BASE_SELECT = `
	*,
	payment:payments!receipts_payment_id_fkey!inner(
		id, invoice_no, paid_at, amount, payment_mode, bank, card_type,
		trace_no, approval_code, reference_no,
		processed_by_employee:employees!payments_processed_by_fkey(id, first_name, last_name),
		method:payment_methods!payments_payment_mode_fk(code, name),
		sales_order:sales_orders!payments_sales_order_id_fkey!inner(
			id, so_number, total, amount_paid, outstanding,
			consultant:employees!sales_orders_consultant_id_fkey(id, first_name, last_name),
			customer:customers!sales_orders_customer_id_fkey(
				id, code, salutation, first_name, last_name, id_number, phone,
				address1, address2, postcode, city, state, address_country
			)
		)
	),
	outlet:outlets!receipts_outlet_id_fkey!inner(
		id, code, name, company_reg_name, company_reg_number,
		address1, address2, postcode, city, state, country,
		phone, email, tax_number, logo_url,
		show_reg_number_on_invoice, show_tax_number_on_invoice
	)
`;

// receipts inherit brand via outlets.brand_id.
async function assertReceiptInBrand(
	ctx: Context,
	receiptId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("receipts")
		.select("id, outlets!inner(brand_id)")
		.eq("id", receiptId)
		.eq("outlets.brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Receipt ${receiptId} not found`);
}

async function fetchReceiptByCriteria(
	ctx: Context,
	column: "id" | "payment_id",
	value: string,
): Promise<ReceiptDetail> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("receipts")
		.select(RECEIPT_BASE_SELECT)
		.eq(column, value)
		.eq("outlet.brand_id", brandId)
		.single();
	if (error) {
		if (error.code === "PGRST116") throw new NotFoundError("Receipt not found");
		throw new ValidationError(error.message);
	}
	return shapeReceipt(ctx, data as RawReceipt);
}

export async function getReceiptByPaymentId(
	ctx: Context,
	paymentId: string,
): Promise<ReceiptDetail> {
	return fetchReceiptByCriteria(ctx, "payment_id", paymentId);
}

export async function getReceiptById(
	ctx: Context,
	receiptId: string,
): Promise<ReceiptDetail> {
	return fetchReceiptByCriteria(ctx, "id", receiptId);
}

export async function listReceiptEdits(
	ctx: Context,
	receiptId: string,
): Promise<ReceiptEditWithRefs[]> {
	await assertReceiptInBrand(ctx, receiptId);
	const { data, error } = await ctx.db
		.from("receipt_edits")
		.select(
			"*, editor:employees!receipt_edits_edited_by_fkey(id, first_name, last_name), outlet:outlets!receipt_edits_outlet_id_fkey(id, code, name)",
		)
		.eq("receipt_id", receiptId)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as ReceiptEditWithRefs[];
}

export async function saveReceiptEdit(
	ctx: Context,
	receiptId: string,
	input: unknown,
): Promise<{ receipt: Receipt; edit: ReceiptEdit }> {
	const parsed: SaveReceiptInput = saveReceiptInputSchema.parse(input);
	await assertReceiptInBrand(ctx, receiptId);

	const { data: existing, error: fetchErr } = await ctx.db
		.from("receipts")
		.select("id, outlet_id")
		.eq("id", receiptId)
		.single();
	if (fetchErr) {
		if (fetchErr.code === "PGRST116")
			throw new NotFoundError("Receipt not found");
		throw new ValidationError(fetchErr.message);
	}

	const { data: receipt, error: updateErr } = await ctx.db
		.from("receipts")
		.update({
			customer_name_override: parsed.customer_name,
			remarks_override: parsed.remarks || null,
		})
		.eq("id", receiptId)
		.select()
		.single();
	if (updateErr) throw new ValidationError(updateErr.message);

	const { data: edit, error: insertErr } = await ctx.db
		.from("receipt_edits")
		.insert({
			receipt_id: receiptId,
			outlet_id: existing.outlet_id,
			edited_by: ctx.currentUser?.employeeId ?? null,
			customer_name: parsed.customer_name,
			remarks: parsed.remarks || null,
		})
		.select()
		.single();
	if (insertErr) throw new ValidationError(insertErr.message);

	return { receipt, edit };
}

type RawReceipt = {
	id: string;
	receipt_no: string;
	customer_name_override: string | null;
	remarks_override: string | null;
	created_at: string;
	updated_at: string;
	outlet: OutletSnapshot;
	payment: {
		id: string;
		invoice_no: string;
		paid_at: string;
		amount: number | string;
		payment_mode: string;
		bank: string | null;
		card_type: string | null;
		trace_no: string | null;
		approval_code: string | null;
		reference_no: string | null;
		processed_by_employee: EmployeeRef;
		method: { code: string; name: string } | null;
		sales_order: {
			id: string;
			so_number: string;
			total: number | string;
			amount_paid: number | string;
			outstanding: number | string;
			consultant: EmployeeRef;
			customer: CustomerSnapshot;
		};
	};
};

async function shapeReceipt(
	ctx: Context,
	raw: RawReceipt,
): Promise<ReceiptDetail> {
	const salesOrderId = raw.payment.sales_order.id;

	const [{ data: items, error: itemsErr }, { data: siblings, error: sibErr }] =
		await Promise.all([
			ctx.db
				.from("sale_items")
				.select(
					"id, item_name, sku, quantity, unit_price, discount, total, tax_rate_pct",
				)
				.eq("sales_order_id", salesOrderId)
				.order("created_at", { ascending: true }),
			ctx.db
				.from("payments")
				.select("id, paid_at")
				.eq("sales_order_id", salesOrderId)
				.order("paid_at", { ascending: true }),
		]);
	if (itemsErr) throw new ValidationError(itemsErr.message);
	if (sibErr) throw new ValidationError(sibErr.message);

	const ordinal =
		(siblings ?? []).findIndex((p) => p.id === raw.payment.id) + 1;

	return {
		id: raw.id,
		receipt_no: raw.receipt_no,
		customer_name_override: raw.customer_name_override,
		remarks_override: raw.remarks_override,
		created_at: raw.created_at,
		updated_at: raw.updated_at,
		outlet: raw.outlet,
		payment: {
			id: raw.payment.id,
			invoice_no: raw.payment.invoice_no,
			paid_at: raw.payment.paid_at,
			amount: Number(raw.payment.amount ?? 0),
			payment_mode: raw.payment.payment_mode,
			bank: raw.payment.bank,
			card_type: raw.payment.card_type,
			trace_no: raw.payment.trace_no,
			approval_code: raw.payment.approval_code,
			reference_no: raw.payment.reference_no,
			method: raw.payment.method,
			processed_by: raw.payment.processed_by_employee,
			ordinal: Math.max(ordinal, 1),
			paymentTotalCount: (siblings ?? []).length,
		},
		salesOrder: {
			id: raw.payment.sales_order.id,
			so_number: raw.payment.sales_order.so_number,
			total: Number(raw.payment.sales_order.total ?? 0),
			amount_paid: Number(raw.payment.sales_order.amount_paid ?? 0),
			outstanding: Number(raw.payment.sales_order.outstanding ?? 0),
			consultant: raw.payment.sales_order.consultant,
			customer: raw.payment.sales_order.customer,
			items: (items ?? []).map((i) => ({
				id: i.id as string,
				item_name: i.item_name as string,
				sku: i.sku as string | null,
				quantity: Number(i.quantity ?? 0),
				unit_price: Number(i.unit_price ?? 0),
				discount: Number(i.discount ?? 0),
				total: Number(i.total ?? 0),
				tax_rate_pct: i.tax_rate_pct == null ? null : Number(i.tax_rate_pct),
			})),
		},
	};
}

export function defaultBeingPaymentOf(items: SaleItemSnapshot[]): string {
	return items
		.map((i) => {
			const sku = i.sku ? `(${i.sku}) ` : "";
			const tax = i.tax_rate_pct ?? 0;
			const taxAmt = ((i.unit_price * i.quantity - i.discount) * tax) / 100;
			return `${sku}${i.item_name} x ${i.quantity} (MYR ${formatMoney(i.total)}, (LOCAL) ${tax}%: MYR ${formatMoney(taxAmt)})`;
		})
		.join("\n");
}

export function defaultCustomerName(customer: CustomerSnapshot | null): string {
	if (!customer) return "WALK-IN";
	const name = [customer.first_name, customer.last_name]
		.filter(Boolean)
		.join(" ")
		.trim()
		.toUpperCase();
	if (customer.id_number) return `${name} (${customer.id_number})`;
	return name;
}

function formatMoney(n: number): string {
	return Number(n).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}
