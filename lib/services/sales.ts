import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
	type CancelSalesOrderInput,
	type CollectPaymentInput,
	type CollectPaymentItem,
	cancelSalesOrderInputSchema,
	collectPaymentInputSchema,
} from "@/lib/schemas/sales";
import { assertPaymentFields } from "@/lib/services/payment-methods";
import type { Tables } from "@/lib/supabase/types";

export type SalesOrder = Tables<"sales_orders">;
export type SaleItem = Tables<"sale_items">;
export type Payment = Tables<"payments">;
export type Cancellation = Tables<"cancellations">;

export type PaymentWithProcessedBy = Payment & {
	processed_by_employee: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
	method: { code: string; name: string } | null;
};

export type SalesOrderWithRelations = SalesOrder & {
	customer: {
		id: string;
		code: string;
		first_name: string;
		last_name: string | null;
	} | null;
	consultant: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
	outlet: { id: string; name: string } | null;
	created_by_employee: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
};

const SALES_ORDER_SELECT =
	"*, customer:customers!sales_orders_customer_id_fkey(id, code, first_name, last_name), consultant:employees!sales_orders_consultant_id_fkey(id, first_name, last_name), outlet:outlets!sales_orders_outlet_id_fkey(id, name), created_by_employee:employees!sales_orders_created_by_fkey(id, first_name, last_name)";

export async function listSalesOrders(
	ctx: Context,
	opts: {
		outletId?: string | null;
		customerId?: string | null;
		limit?: number;
	} = {},
): Promise<SalesOrderWithRelations[]> {
	let query = ctx.db
		.from("sales_orders")
		.select(SALES_ORDER_SELECT)
		.order("sold_at", { ascending: false })
		.limit(opts.limit ?? 200);
	if (opts.outletId) query = query.eq("outlet_id", opts.outletId);
	if (opts.customerId) query = query.eq("customer_id", opts.customerId);
	const { data, error } = await query;
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as SalesOrderWithRelations[];
}

export type CollectPaymentResult = {
	sales_order_id: string;
	so_number: string;
	invoice_no: string;
	subtotal: number;
	total: number;
};

export async function collectAppointmentPayment(
	ctx: Context,
	appointmentId: string,
	input: unknown,
): Promise<CollectPaymentResult> {
	const parsed: CollectPaymentInput = collectPaymentInputSchema.parse(input);
	await assertLineDiscountCaps(ctx, parsed.items);
	const normalizedPayments = await assertPaymentFields(ctx, parsed.payments);
	// Only forward p_sold_at when the operator actually chose a backdate —
	// the RPC column is timestamptz and rejects "" with
	// "invalid input syntax for type timestamp with time zone". Letting
	// the argument default to NULL lets the RPC fall back to now().
	const { data, error } = await ctx.db.rpc("collect_appointment_payment", {
		p_appointment_id: appointmentId,
		p_items: parsed.items.map((i) => ({
			service_id: i.service_id,
			inventory_item_id: i.inventory_item_id,
			sku: i.sku,
			item_name: i.item_name,
			item_type: i.item_type,
			quantity: i.quantity,
			unit_price: i.unit_price,
			discount: i.discount,
			tax_id: i.tax_id,
		})),
		p_discount: parsed.discount,
		p_tax: parsed.tax,
		p_rounding: parsed.rounding,
		p_payments: normalizedPayments.map((p) => ({
			mode: p.mode,
			amount: p.amount,
			remarks: p.remarks ?? "",
			bank: p.bank ?? "",
			card_type: p.card_type ?? "",
			trace_no: p.trace_no ?? "",
			approval_code: p.approval_code ?? "",
			reference_no: p.reference_no ?? "",
			months: p.months != null ? String(p.months) : "",
		})),
		p_remarks: parsed.remarks ?? "",
		p_processed_by: (ctx.currentUser?.employeeId ?? null) as string,
		p_frontdesk_message: parsed.frontdesk_message ?? "",
		p_allocations: parsed.allocations
			? parsed.allocations.map((a) => ({
					item_index: a.item_index,
					amount: a.amount,
				}))
			: null,
		...(parsed.sold_at ? { p_sold_at: parsed.sold_at } : {}),
	});
	if (error) throw new ValidationError(error.message);
	if (!data) throw new ValidationError("Collect payment returned no result");
	return data as unknown as CollectPaymentResult;
}

// Enforces per-service discount caps on a collect-payment payload. The UI
// clamps on blur, but the cap is a server invariant — never trust the client.
// Cap is stored as a percent on services.discount_cap (null = no cap).
async function assertLineDiscountCaps(
	ctx: Context,
	items: CollectPaymentItem[],
): Promise<void> {
	const serviceIds = Array.from(
		new Set(
			items.map((i) => i.service_id).filter((id): id is string => id != null),
		),
	);
	if (serviceIds.length === 0) return;
	const { data, error } = await ctx.db
		.from("services")
		.select("id, name, discount_cap")
		.in("id", serviceIds);
	if (error) throw new ValidationError(error.message);
	const capMap = new Map<string, number | null>();
	for (const row of data ?? []) {
		capMap.set(
			row.id,
			row.discount_cap == null ? null : Number(row.discount_cap),
		);
	}
	for (const item of items) {
		if (!item.service_id) continue;
		const capPct = capMap.get(item.service_id);
		if (capPct == null) continue;
		const lineGross = Math.max(0, item.quantity * item.unit_price);
		const capMyr = Math.round(lineGross * capPct) / 100;
		if (item.discount > capMyr + 0.005) {
			throw new ValidationError(
				`Discount on "${item.item_name}" exceeds the ${capPct}% cap (max RM ${capMyr.toFixed(2)}).`,
			);
		}
	}
}

export async function getSalesOrderForAppointment(
	ctx: Context,
	appointmentId: string,
): Promise<SalesOrder | null> {
	const { data, error } = await ctx.db
		.from("sales_orders")
		.select("*")
		.eq("appointment_id", appointmentId)
		.order("sold_at", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new ValidationError(error.message);
	return data;
}

export async function getSalesOrder(
	ctx: Context,
	id: string,
): Promise<SalesOrderWithRelations> {
	const { data, error } = await ctx.db
		.from("sales_orders")
		.select(SALES_ORDER_SELECT)
		.eq("id", id)
		.single();
	if (error) {
		if (error.code === "PGRST116")
			throw new NotFoundError("Sales order not found");
		throw new ValidationError(error.message);
	}
	return data as unknown as SalesOrderWithRelations;
}

export async function listSaleItems(
	ctx: Context,
	salesOrderId: string,
): Promise<SaleItem[]> {
	const { data, error } = await ctx.db
		.from("sale_items")
		.select("*")
		.eq("sales_order_id", salesOrderId)
		.order("created_at", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function listPaymentsForOrder(
	ctx: Context,
	salesOrderId: string,
): Promise<PaymentWithProcessedBy[]> {
	const { data, error } = await ctx.db
		.from("payments")
		.select(
			"*, processed_by_employee:employees!payments_processed_by_fkey(id, first_name, last_name), method:payment_methods!payments_payment_mode_fk(code, name)",
		)
		.eq("sales_order_id", salesOrderId)
		.order("paid_at", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as PaymentWithProcessedBy[];
}

// ---------------------------------------------------------------------------
// Payment tab: list all payment records across orders
// ---------------------------------------------------------------------------

export type PaymentWithRelations = Payment & {
	processed_by_employee: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
	method: { code: string; name: string } | null;
	sales_order: {
		id: string;
		so_number: string;
		customer: {
			id: string;
			code: string;
			first_name: string;
			last_name: string | null;
		} | null;
		consultant: {
			id: string;
			first_name: string;
			last_name: string;
		} | null;
	} | null;
};

const PAYMENT_LIST_SELECT =
	"*, processed_by_employee:employees!payments_processed_by_fkey(id, first_name, last_name), method:payment_methods!payments_payment_mode_fk(code, name), sales_order:sales_orders!payments_sales_order_id_fkey!inner(id, so_number, customer:customers!sales_orders_customer_id_fkey(id, code, first_name, last_name), consultant:employees!sales_orders_consultant_id_fkey(id, first_name, last_name))";

export async function listPayments(
	ctx: Context,
	opts: {
		outletId?: string | null;
		customerId?: string | null;
		limit?: number;
	} = {},
): Promise<PaymentWithRelations[]> {
	let query = ctx.db
		.from("payments")
		.select(PAYMENT_LIST_SELECT)
		.order("paid_at", { ascending: false })
		.limit(opts.limit ?? 200);
	if (opts.outletId) query = query.eq("outlet_id", opts.outletId);
	if (opts.customerId)
		query = query.eq("sales_order.customer_id", opts.customerId);
	const { data, error } = await query;
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as PaymentWithRelations[];
}

// ---------------------------------------------------------------------------
// Cancellation flow
// ---------------------------------------------------------------------------

export type CancellationWithRelations = Cancellation & {
	sales_order: {
		id: string;
		so_number: string;
		total: number;
		customer: {
			id: string;
			code: string;
			first_name: string;
			last_name: string | null;
		} | null;
	} | null;
	processed_by_employee: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
};

const CANCELLATION_LIST_SELECT =
	"*, sales_order:sales_orders!cancellations_sales_order_id_fkey(id, so_number, total, customer:customers!sales_orders_customer_id_fkey(id, code, first_name, last_name)), processed_by_employee:employees!cancellations_processed_by_fkey(id, first_name, last_name)";

export async function listCancellations(
	ctx: Context,
	opts: { outletId?: string | null; limit?: number } = {},
): Promise<CancellationWithRelations[]> {
	let query = ctx.db
		.from("cancellations")
		.select(CANCELLATION_LIST_SELECT)
		.order("cancelled_at", { ascending: false })
		.limit(opts.limit ?? 200);
	if (opts.outletId) query = query.eq("outlet_id", opts.outletId);
	const { data, error } = await query;
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as CancellationWithRelations[];
}

export type CancelSalesOrderResult = {
	cn_id: string;
	cn_number: string;
	sales_order_id: string;
};

export async function cancelSalesOrder(
	ctx: Context,
	salesOrderId: string,
	input: unknown,
): Promise<CancelSalesOrderResult> {
	const parsed: CancelSalesOrderInput =
		cancelSalesOrderInputSchema.parse(input);

	const { data, error } = await ctx.db.rpc("cancel_sales_order", {
		p_sales_order_id: salesOrderId,
		p_passcode: parsed.passcode,
		p_reason: parsed.reason,
		p_used_by: (ctx.currentUser?.employeeId ?? null) as string,
	});
	if (error) {
		const msg = error.message || "Failed to cancel sales order";
		if (msg.includes("Invalid or expired passcode")) {
			throw new ValidationError("Invalid or expired passcode");
		}
		throw new ValidationError(msg);
	}
	return data as unknown as CancelSalesOrderResult;
}

// ---------------------------------------------------------------------------
// Summary: daily totals for the summary tab
// ---------------------------------------------------------------------------

export type SalesSummary = {
	totalSales: number;
	totalPayments: number;
	orderCount: number;
	paymentCount: number;
};

export async function getSalesSummary(
	ctx: Context,
	opts: { outletId?: string | null; from?: string; to?: string } = {},
): Promise<SalesSummary> {
	const today = new Date().toISOString().slice(0, 10);
	const from = opts.from ?? today;
	const to = opts.to ?? today;

	// Sales orders in range
	let soQuery = ctx.db
		.from("sales_orders")
		.select("total", { count: "exact" })
		.gte("sold_at", `${from}T00:00:00`)
		.lte("sold_at", `${to}T23:59:59`)
		.neq("status", "void");
	if (opts.outletId) soQuery = soQuery.eq("outlet_id", opts.outletId);
	const { data: soData, count: soCount, error: soErr } = await soQuery;
	if (soErr) throw new ValidationError(soErr.message);

	const totalSales = (soData ?? []).reduce(
		(sum, r) => sum + Number(r.total),
		0,
	);

	// Payments in range
	let payQuery = ctx.db
		.from("payments")
		.select("amount", { count: "exact" })
		.gte("paid_at", `${from}T00:00:00`)
		.lte("paid_at", `${to}T23:59:59`);
	if (opts.outletId) payQuery = payQuery.eq("outlet_id", opts.outletId);
	const { data: payData, count: payCount, error: payErr } = await payQuery;
	if (payErr) throw new ValidationError(payErr.message);

	const totalPayments = (payData ?? []).reduce(
		(sum, r) => sum + Number(r.amount),
		0,
	);

	return {
		totalSales,
		totalPayments,
		orderCount: soCount ?? 0,
		paymentCount: payCount ?? 0,
	};
}
