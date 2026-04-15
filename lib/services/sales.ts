import type { Context } from "@/lib/context/types";
import { ValidationError } from "@/lib/errors";
import {
	type CollectPaymentInput,
	collectPaymentInputSchema,
} from "@/lib/schemas/sales";
import type { Tables } from "@/lib/supabase/types";

export type SalesOrder = Tables<"sales_orders">;
export type SaleItem = Tables<"sale_items">;
export type Payment = Tables<"payments">;

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
	opts: { outletId?: string | null; limit?: number } = {},
): Promise<SalesOrderWithRelations[]> {
	let query = ctx.db
		.from("sales_orders")
		.select(SALES_ORDER_SELECT)
		.order("sold_at", { ascending: false })
		.limit(opts.limit ?? 200);
	if (opts.outletId) query = query.eq("outlet_id", opts.outletId);
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
		p_payment_mode: parsed.payment_mode,
		p_amount: parsed.amount,
		p_remarks: parsed.remarks ?? "",
		p_processed_by: (ctx.currentUser?.employeeId ?? null) as string,
	});
	if (error) throw new ValidationError(error.message);
	if (!data) throw new ValidationError("Collect payment returned no result");
	return data as unknown as CollectPaymentResult;
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
