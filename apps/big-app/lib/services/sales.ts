import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
	type CollectPaymentInput,
	type CollectPaymentItem,
	collectPaymentInputSchema,
	type IssueRefundInput,
	issueRefundInputSchema,
	type RecordAdditionalPaymentInput,
	recordAdditionalPaymentInputSchema,
	type ReplaceSaleItemIncentivesInput,
	replaceSaleItemIncentivesInputSchema,
	type UpdatePaymentAllocationsInput,
	type UpdatePaymentMethodInput,
	updatePaymentAllocationsInputSchema,
	updatePaymentMethodInputSchema,
	type VoidSalesOrderInput,
	voidSalesOrderInputSchema,
	type WalkInSaleInput,
	walkInSaleInputSchema,
} from "@/lib/schemas/sales";
import { assertPaymentFields } from "@/lib/services/payment-methods";
import {
	assertAppointmentInBrand,
	assertCustomerInBrand,
	assertOutletInBrand,
	assertSalesOrderInBrand,
} from "@/lib/supabase/brand-ownership";
import { assertBrandId } from "@/lib/supabase/query";
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
		profile_image_path: string | null;
		phone: string | null;
		id_number: string | null;
		is_vip: boolean | null;
		is_staff: boolean | null;
		tag: string | null;
	} | null;
	consultant: {
		id: string;
		first_name: string;
		last_name: string;
		profile_image_path: string | null;
	} | null;
	outlet: { id: string; code: string; name: string } | null;
	created_by_employee: {
		id: string;
		first_name: string;
		last_name: string;
		profile_image_path: string | null;
	} | null;
	appointment: { id: string; booking_ref: string } | null;
};

const SALES_ORDER_SELECT =
	"*, customer:customers!sales_orders_customer_id_fkey(id, code, first_name, last_name, profile_image_path, phone, id_number, is_vip, is_staff, tag), consultant:employees!sales_orders_consultant_id_fkey(id, first_name, last_name, profile_image_path), outlet:outlets!sales_orders_outlet_id_fkey(id, code, name), created_by_employee:employees!sales_orders_created_by_fkey(id, first_name, last_name, profile_image_path), appointment:appointments!sales_orders_appointment_id_fkey(id, booking_ref)";

export async function listSalesOrders(
	ctx: Context,
	opts: {
		outletId?: string | null;
		customerId?: string | null;
		limit?: number;
	} = {},
): Promise<SalesOrderWithRelations[]> {
	const brandId = assertBrandId(ctx);
	let query = ctx.db
		.from("sales_orders")
		.select(
			`${SALES_ORDER_SELECT}, _brand_outlet:outlets!sales_orders_outlet_id_fkey!inner(brand_id)`,
		)
		.eq("_brand_outlet.brand_id", brandId)
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
	await assertAppointmentInBrand(ctx, appointmentId);
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
		p_incentives: parsed.incentives
			? parsed.incentives.map((i) => ({
					item_index: i.item_index,
					employees: i.employees.map((e) => ({
						employee_id: e.employee_id,
						percent: e.percent,
					})),
				}))
			: null,
		...(parsed.sold_at ? { p_sold_at: parsed.sold_at } : {}),
	});
	if (error) throw new ValidationError(error.message);
	if (!data) throw new ValidationError("Collect payment returned no result");
	return data as unknown as CollectPaymentResult;
}

export async function collectWalkInSale(
	ctx: Context,
	input: unknown,
): Promise<CollectPaymentResult> {
	const parsed: WalkInSaleInput = walkInSaleInputSchema.parse(input);
	await assertOutletInBrand(ctx, parsed.outlet_id);
	await assertCustomerInBrand(ctx, parsed.customer_id);
	await assertLineDiscountCaps(ctx, parsed.items);
	const normalizedPayments = await assertPaymentFields(ctx, parsed.payments);
	const { data, error } = await ctx.db.rpc("collect_walkin_sale", {
		p_customer_id: parsed.customer_id,
		p_outlet_id: parsed.outlet_id,
		p_consultant_id: (parsed.consultant_id ?? null) as string,
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
		p_allocations: parsed.allocations
			? parsed.allocations.map((a) => ({
					item_index: a.item_index,
					amount: a.amount,
				}))
			: null,
		p_incentives: parsed.incentives
			? parsed.incentives.map((i) => ({
					item_index: i.item_index,
					employees: i.employees.map((e) => ({
						employee_id: e.employee_id,
						percent: e.percent,
					})),
				}))
			: null,
		...(parsed.sold_at ? { p_sold_at: parsed.sold_at } : {}),
	});
	if (error) throw new ValidationError(error.message);
	if (!data)
		throw new ValidationError("Collect walk-in sale returned no result");
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
		.eq("brand_id", assertBrandId(ctx))
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
	await assertAppointmentInBrand(ctx, appointmentId);
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
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("sales_orders")
		.select(
			`${SALES_ORDER_SELECT}, _brand_outlet:outlets!sales_orders_outlet_id_fkey!inner(brand_id)`,
		)
		.eq("id", id)
		.eq("_brand_outlet.brand_id", brandId)
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
	await assertSalesOrderInBrand(ctx, salesOrderId);
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
	await assertSalesOrderInBrand(ctx, salesOrderId);
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
		profile_image_path: string | null;
	} | null;
	method: { code: string; name: string } | null;
	outlet: { id: string; code: string; name: string } | null;
	sales_order: {
		id: string;
		so_number: string;
		status: SalesOrder["status"];
		customer: {
			id: string;
			code: string;
			first_name: string;
			last_name: string | null;
			profile_image_path: string | null;
		} | null;
		consultant: {
			id: string;
			first_name: string;
			last_name: string;
			profile_image_path: string | null;
		} | null;
	} | null;
};

const PAYMENT_LIST_SELECT =
	"*, processed_by_employee:employees!payments_processed_by_fkey(id, first_name, last_name, profile_image_path), method:payment_methods!payments_payment_mode_fk(code, name), outlet:outlets!payments_outlet_id_fkey(id, code, name), sales_order:sales_orders!payments_sales_order_id_fkey!inner(id, so_number, status, customer:customers!sales_orders_customer_id_fkey(id, code, first_name, last_name, profile_image_path), consultant:employees!sales_orders_consultant_id_fkey(id, first_name, last_name, profile_image_path))";

export async function listPayments(
	ctx: Context,
	opts: {
		outletId?: string | null;
		customerId?: string | null;
		limit?: number;
	} = {},
): Promise<PaymentWithRelations[]> {
	const brandId = assertBrandId(ctx);
	let query = ctx.db
		.from("payments")
		.select(
			`${PAYMENT_LIST_SELECT}, _brand_outlet:outlets!payments_outlet_id_fkey!inner(brand_id)`,
		)
		.eq("_brand_outlet.brand_id", brandId)
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
	"*, sales_order:sales_orders!cancellations_sales_order_id_fkey!inner(id, so_number, total, customer:customers!sales_orders_customer_id_fkey(id, code, first_name, last_name)), processed_by_employee:employees!cancellations_processed_by_fkey(id, first_name, last_name)";

export async function listCancellations(
	ctx: Context,
	opts: {
		outletId?: string | null;
		customerId?: string | null;
		limit?: number;
	} = {},
): Promise<CancellationWithRelations[]> {
	const brandId = assertBrandId(ctx);
	let query = ctx.db
		.from("cancellations")
		.select(
			`${CANCELLATION_LIST_SELECT}, _brand_outlet:outlets!cancellations_outlet_id_fkey!inner(brand_id)`,
		)
		.eq("_brand_outlet.brand_id", brandId)
		.order("cancelled_at", { ascending: false })
		.limit(opts.limit ?? 200);
	if (opts.outletId) query = query.eq("outlet_id", opts.outletId);
	if (opts.customerId)
		query = query.eq("sales_order.customer_id", opts.customerId);
	const { data, error } = await query;
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as CancellationWithRelations[];
}

export type VoidSalesOrderResult = {
	cn_id: string;
	cn_number: string;
	rn_id: string;
	rn_number: string;
	refund_amount: number;
	sales_order_id: string;
};

export async function voidSalesOrder(
	ctx: Context,
	salesOrderId: string,
	input: unknown,
): Promise<VoidSalesOrderResult> {
	await assertSalesOrderInBrand(ctx, salesOrderId);
	const parsed: VoidSalesOrderInput = voidSalesOrderInputSchema.parse(input);

	const { data, error } = await ctx.db.rpc("void_sales_order", {
		p_sales_order_id: salesOrderId,
		p_passcode: parsed.passcode,
		p_reason: parsed.reason,
		p_refund_method: parsed.refund_method,
		p_include_admin_fee: parsed.include_admin_fee,
		p_admin_fee: parsed.admin_fee,
		p_sale_item_ids: parsed.sale_item_ids,
		p_used_by: (ctx.currentUser?.employeeId ?? null) as string,
	});
	if (error) {
		const msg = error.message || "Failed to void sales order";
		if (msg.includes("Invalid or expired passcode")) {
			throw new ValidationError("Invalid or expired passcode");
		}
		throw new ValidationError(msg);
	}
	return data as unknown as VoidSalesOrderResult;
}

// ---------------------------------------------------------------------------
// Standalone refund: tracking-only. Writes a refund_notes row with a null
// cancellation_id. Does NOT touch SO status, amount_paid, or inventory.
// ---------------------------------------------------------------------------

export type RefundNote = Tables<"refund_notes">;

export type RefundNoteWithRefs = RefundNote & {
	processed_by_employee: {
		id: string;
		first_name: string;
		last_name: string | null;
	} | null;
};

export type IssueRefundResult = {
	rn_id: string;
	rn_number: string;
	amount: number;
	sales_order_id: string;
};

export async function issueRefund(
	ctx: Context,
	salesOrderId: string,
	input: unknown,
): Promise<IssueRefundResult> {
	await assertSalesOrderInBrand(ctx, salesOrderId);
	const parsed: IssueRefundInput = issueRefundInputSchema.parse(input);

	const { data, error } = await ctx.db.rpc("issue_refund", {
		p_sales_order_id: salesOrderId,
		p_amount: parsed.amount,
		p_refund_method: parsed.refund_method,
		p_notes: parsed.notes ?? "",
		p_processed_by: (ctx.currentUser?.employeeId ?? null) as string,
	});
	if (error)
		throw new ValidationError(error.message || "Failed to issue refund");
	return data as unknown as IssueRefundResult;
}

// ---------------------------------------------------------------------------
// Post-collection corrections: revert, change method, reallocate, re-credit.
// All four block when the parent SO is `cancelled`; wallet payments are
// non-editable (void the SO instead).
// ---------------------------------------------------------------------------

export type RevertLastPaymentResult = {
	payment_id: string;
	invoice_no: string;
	amount: number;
	payment_mode: string;
	sales_order_id: string;
	new_amount_paid: number;
	new_status: string;
};

export async function revertLastPayment(
	ctx: Context,
	salesOrderId: string,
): Promise<RevertLastPaymentResult> {
	await assertSalesOrderInBrand(ctx, salesOrderId);
	const { data, error } = await ctx.db.rpc("revert_last_payment", {
		p_sales_order_id: salesOrderId,
		p_processed_by: (ctx.currentUser?.employeeId ?? null) as string,
	});
	if (error) throw new ValidationError(error.message);
	return data as unknown as RevertLastPaymentResult;
}

export type RecordAdditionalPaymentResult = {
	payment_id: string;
	invoice_no: string;
	amount: number;
	sales_order_id: string;
	new_amount_paid: number;
	new_outstanding: number;
	new_status: string;
};

export async function recordAdditionalPayment(
	ctx: Context,
	salesOrderId: string,
	input: unknown,
): Promise<RecordAdditionalPaymentResult> {
	await assertSalesOrderInBrand(ctx, salesOrderId);
	const parsed: RecordAdditionalPaymentInput =
		recordAdditionalPaymentInputSchema.parse(input);
	const [normalized] = await assertPaymentFields(ctx, [
		{
			mode: parsed.payment_mode,
			amount: parsed.amount,
			remarks: parsed.remarks,
			bank: parsed.bank,
			card_type: parsed.card_type,
			trace_no: parsed.trace_no,
			approval_code: parsed.approval_code,
			reference_no: parsed.reference_no,
			months: parsed.months,
		},
	]);
	const { data, error } = await ctx.db.rpc("record_additional_payment", {
		p_sales_order_id: salesOrderId,
		p_amount: parsed.amount,
		p_payment_mode: normalized.mode,
		p_bank: normalized.bank ?? "",
		p_card_type: normalized.card_type ?? "",
		p_trace_no: normalized.trace_no ?? "",
		p_approval_code: normalized.approval_code ?? "",
		p_reference_no: normalized.reference_no ?? "",
		p_months: normalized.months as unknown as number,
		p_remarks: normalized.remarks ?? "",
		p_processed_by: (ctx.currentUser?.employeeId ?? null) as string,
		p_allocations: parsed.allocations?.length
			? (JSON.stringify(parsed.allocations) as unknown as string)
			: null,
	});
	if (error) throw new ValidationError(error.message);
	if (!data) throw new ValidationError("Record payment returned no result");
	return data as unknown as RecordAdditionalPaymentResult;
}

export async function updatePaymentMethod(
	ctx: Context,
	paymentId: string,
	input: unknown,
): Promise<void> {
	const parsed: UpdatePaymentMethodInput =
		updatePaymentMethodInputSchema.parse(input);
	const { error } = await ctx.db.rpc("update_payment_method", {
		p_payment_id: paymentId,
		p_payment_mode: parsed.payment_mode,
		p_bank: parsed.bank ?? "",
		p_card_type: parsed.card_type ?? "",
		p_trace_no: parsed.trace_no ?? "",
		p_approval_code: parsed.approval_code ?? "",
		p_reference_no: parsed.reference_no ?? "",
		p_months: parsed.months as unknown as number,
	});
	if (error) throw new ValidationError(error.message);
}

export async function updatePaymentAllocations(
	ctx: Context,
	salesOrderId: string,
	input: unknown,
): Promise<void> {
	await assertSalesOrderInBrand(ctx, salesOrderId);
	const parsed: UpdatePaymentAllocationsInput =
		updatePaymentAllocationsInputSchema.parse(input);
	const { error } = await ctx.db.rpc("update_payment_allocations", {
		p_sales_order_id: salesOrderId,
		p_allocations: parsed.allocations.map((a) => ({
			payment_id: a.payment_id,
			sale_item_id: a.sale_item_id,
			amount: a.amount,
		})),
	});
	if (error) throw new ValidationError(error.message);
}

export async function replaceSaleItemIncentives(
	ctx: Context,
	input: unknown,
): Promise<void> {
	const parsed: ReplaceSaleItemIncentivesInput =
		replaceSaleItemIncentivesInputSchema.parse(input);
	const { error } = await ctx.db.rpc("replace_sale_item_incentives", {
		p_sale_item_id: parsed.sale_item_id,
		p_employees: parsed.employees.map((e) => ({
			employee_id: e.employee_id,
			percent: e.percent,
		})),
		p_created_by: (ctx.currentUser?.employeeId ?? null) as string,
	});
	if (error) throw new ValidationError(error.message);
}

export type PaymentAllocationForOrder = {
	id: string;
	payment_id: string;
	sale_item_id: string;
	amount: number;
};

export async function listPaymentAllocationsForOrder(
	ctx: Context,
	salesOrderId: string,
): Promise<PaymentAllocationForOrder[]> {
	await assertSalesOrderInBrand(ctx, salesOrderId);
	const { data, error } = await ctx.db
		.from("payment_allocations")
		.select(
			"id, payment_id, sale_item_id, amount, payments!inner(sales_order_id)",
		)
		.eq("payments.sales_order_id", salesOrderId);
	if (error) throw new ValidationError(error.message);
	return (data ?? []).map((r) => ({
		id: r.id as string,
		payment_id: r.payment_id as string,
		sale_item_id: r.sale_item_id as string,
		amount: Number(r.amount),
	}));
}

export type SaleItemIncentiveRow = {
	id: string;
	sale_item_id: string;
	employee_id: string;
	percent: number;
	employee: { id: string; first_name: string; last_name: string } | null;
};

export async function listIncentivesForOrder(
	ctx: Context,
	salesOrderId: string,
): Promise<SaleItemIncentiveRow[]> {
	await assertSalesOrderInBrand(ctx, salesOrderId);
	const { data, error } = await ctx.db
		.from("sale_item_incentives")
		.select(
			"id, sale_item_id, employee_id, percent, employee:employees!sale_item_incentives_employee_id_fkey(id, first_name, last_name), sale_items!inner(sales_order_id)",
		)
		.eq("sale_items.sales_order_id", salesOrderId);
	if (error) throw new ValidationError(error.message);
	return (data ?? []).map((r) => ({
		id: r.id as string,
		sale_item_id: r.sale_item_id as string,
		employee_id: r.employee_id as string,
		percent: Number(r.percent),
		employee: r.employee as SaleItemIncentiveRow["employee"],
	}));
}

export async function listRefundNotesForOrder(
	ctx: Context,
	salesOrderId: string,
): Promise<RefundNoteWithRefs[]> {
	await assertSalesOrderInBrand(ctx, salesOrderId);
	const { data, error } = await ctx.db
		.from("refund_notes")
		.select(
			"*, processed_by_employee:employees!refund_notes_processed_by_fkey(id, first_name, last_name)",
		)
		.eq("sales_order_id", salesOrderId)
		.order("refunded_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as RefundNoteWithRefs[];
}

export type RefundNoteWithRelations = RefundNote & {
	processed_by_employee: {
		id: string;
		first_name: string;
		last_name: string | null;
	} | null;
	method: { code: string; name: string } | null;
	outlet: { id: string; code: string; name: string } | null;
	sales_order: {
		id: string;
		so_number: string;
		status: SalesOrder["status"];
	} | null;
};

const REFUND_NOTE_LIST_SELECT =
	"*, processed_by_employee:employees!refund_notes_processed_by_fkey(id, first_name, last_name), method:payment_methods!refund_notes_refund_method_fkey(code, name), outlet:outlets!refund_notes_outlet_id_fkey(id, code, name), sales_order:sales_orders!refund_notes_sales_order_id_fkey!inner(id, so_number, status, customer_id)";

export async function listRefundNotes(
	ctx: Context,
	opts: {
		outletId?: string | null;
		customerId?: string | null;
		limit?: number;
	} = {},
): Promise<RefundNoteWithRelations[]> {
	const brandId = assertBrandId(ctx);
	let query = ctx.db
		.from("refund_notes")
		.select(
			`${REFUND_NOTE_LIST_SELECT}, _brand_outlet:outlets!refund_notes_outlet_id_fkey!inner(brand_id)`,
		)
		.eq("_brand_outlet.brand_id", brandId)
		.order("refunded_at", { ascending: false })
		.limit(opts.limit ?? 200);
	if (opts.outletId) query = query.eq("outlet_id", opts.outletId);
	if (opts.customerId)
		query = query.eq("sales_order.customer_id", opts.customerId);
	const { data, error } = await query;
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as RefundNoteWithRelations[];
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
	const brandId = assertBrandId(ctx);
	if (opts.outletId) await assertOutletInBrand(ctx, opts.outletId);
	const today = new Date().toISOString().slice(0, 10);
	const from = opts.from ?? today;
	const to = opts.to ?? today;

	// Sales orders in range
	let soQuery = ctx.db
		.from("sales_orders")
		.select(
			"total, _brand_outlet:outlets!sales_orders_outlet_id_fkey!inner(brand_id)",
			{ count: "exact" },
		)
		.eq("_brand_outlet.brand_id", brandId)
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
		.select(
			"amount, _brand_outlet:outlets!payments_outlet_id_fkey!inner(brand_id)",
			{ count: "exact" },
		)
		.eq("_brand_outlet.brand_id", brandId)
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

// ---------------------------------------------------------------------------
// Summary charts: item-type breakdown + cash summary
// ---------------------------------------------------------------------------

export type SaleItemTypeBreakdown = {
	item_type: string;
	total: number;
	count: number;
};

export async function getSaleItemBreakdownByType(
	ctx: Context,
	opts: { outletId?: string | null; from?: string; to?: string } = {},
): Promise<SaleItemTypeBreakdown[]> {
	const brandId = assertBrandId(ctx);
	if (opts.outletId) await assertOutletInBrand(ctx, opts.outletId);
	const today = new Date().toISOString().slice(0, 10);
	const from = opts.from ?? today;
	const to = opts.to ?? today;

	let q = ctx.db
		.from("sale_items")
		.select(
			`item_type, unit_price, quantity, discount, total,
			 _so:sales_orders!sale_items_sales_order_id_fkey!inner(
				 sold_at, status, outlet_id,
				 _brand_outlet:outlets!sales_orders_outlet_id_fkey!inner(brand_id)
			 )`,
		)
		.eq("_so._brand_outlet.brand_id", brandId)
		.gte("_so.sold_at", `${from}T00:00:00`)
		.lte("_so.sold_at", `${to}T23:59:59`)
		.neq("_so.status", "void");
	if (opts.outletId) q = q.eq("_so.outlet_id", opts.outletId);

	const { data, error } = await q;
	if (error) throw new ValidationError(error.message);

	const buckets = new Map<string, SaleItemTypeBreakdown>();
	for (const row of data ?? []) {
		const r = row as unknown as {
			item_type: string;
			unit_price: number | null;
			quantity: number | null;
			discount: number | null;
			total: number | null;
		};
		const lineTotal =
			r.total != null
				? Number(r.total)
				: Number(r.unit_price ?? 0) * Number(r.quantity ?? 0) -
					Number(r.discount ?? 0);
		const key = r.item_type ?? "other";
		const cur = buckets.get(key) ?? { item_type: key, total: 0, count: 0 };
		cur.total += lineTotal;
		cur.count += 1;
		buckets.set(key, cur);
	}
	return [...buckets.values()].sort((a, b) => b.total - a.total);
}

export type CashSummary = {
	cashMovement: number;
	paymentCollected: number;
	outstanding: number;
};

export async function getCashSummary(
	ctx: Context,
	opts: { outletId?: string | null; from?: string; to?: string } = {},
): Promise<CashSummary> {
	const brandId = assertBrandId(ctx);
	if (opts.outletId) await assertOutletInBrand(ctx, opts.outletId);
	const today = new Date().toISOString().slice(0, 10);
	const from = opts.from ?? today;
	const to = opts.to ?? today;

	let payQuery = ctx.db
		.from("payments")
		.select(
			"amount, payment_mode, _brand_outlet:outlets!payments_outlet_id_fkey!inner(brand_id)",
		)
		.eq("_brand_outlet.brand_id", brandId)
		.gte("paid_at", `${from}T00:00:00`)
		.lte("paid_at", `${to}T23:59:59`);
	if (opts.outletId) payQuery = payQuery.eq("outlet_id", opts.outletId);
	const { data: payRows, error: payErr } = await payQuery;
	if (payErr) throw new ValidationError(payErr.message);

	let paymentCollected = 0;
	let cashMovement = 0;
	for (const r of payRows ?? []) {
		const amt = Number((r as { amount: number }).amount);
		paymentCollected += amt;
		if ((r as { payment_mode: string }).payment_mode === "CASH") {
			cashMovement += amt;
		}
	}

	let soQuery = ctx.db
		.from("sales_orders")
		.select(
			"outstanding, _brand_outlet:outlets!sales_orders_outlet_id_fkey!inner(brand_id)",
		)
		.eq("_brand_outlet.brand_id", brandId)
		.gte("sold_at", `${from}T00:00:00`)
		.lte("sold_at", `${to}T23:59:59`)
		.neq("status", "void");
	if (opts.outletId) soQuery = soQuery.eq("outlet_id", opts.outletId);
	const { data: soRows, error: soErr } = await soQuery;
	if (soErr) throw new ValidationError(soErr.message);

	const outstanding = (soRows ?? []).reduce(
		(s, r) =>
			s + Number((r as { outstanding: number | null }).outstanding ?? 0),
		0,
	);

	return { cashMovement, paymentCollected, outstanding };
}
