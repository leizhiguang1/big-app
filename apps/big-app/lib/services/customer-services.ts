import type { Context } from "@/lib/context/types";
import { ValidationError } from "@/lib/errors";
import { assertCustomerInBrand } from "@/lib/supabase/brand-ownership";

// Read-side reporting for the Customer Detail → Services tab.
//
// Two views, both computed from the existing normalized ledger:
//   * Redemption: one row per appointment_line_items service line where the
//     appointment's bill is fully paid. "What this customer has received
//     and paid for."
//   * Balance:    one row per sale_items service line where the line still
//     has outstanding amount (allocated_paid < line_total). "What this
//     customer still owes us."
//
// Multi-session package counting (purchased / redeemed / balance) is
// intentionally NOT modelled here — see docs/modules/03-customers.md
// "Customer Detail → Services tab" for the deferred package lifecycle.

export type CustomerServiceRedemption = {
	line_item_id: string;
	appointment_id: string;
	booking_ref: string;
	appointment_start_at: string;
	appointment_end_at: string | null;
	appointment_status: string;
	outlet: { id: string; name: string } | null;
	room: { id: string; name: string } | null;
	hands_on_employee: {
		id: string;
		first_name: string;
		last_name: string | null;
	} | null;
	processed_by_employee: {
		id: string;
		first_name: string;
		last_name: string | null;
	} | null;
	processed_at: string | null;
	service: { id: string; sku: string | null; name: string } | null;
	description: string | null;
	quantity: number;
	sales_order: { id: string; so_number: string } | null;
};

export type CustomerServiceBalance = {
	sale_item_id: string;
	sales_order: {
		id: string;
		so_number: string;
		sold_at: string;
		status: string;
	};
	service: { id: string; sku: string | null; name: string } | null;
	item_name: string;
	quantity: number;
	unit_price: number;
	line_total: number;
	allocated_paid: number;
	payment_status: "partial" | "unpaid";
};

type AppointmentRow = {
	id: string;
	customer_id: string;
	booking_ref: string;
	start_at: string;
	end_at: string | null;
	status: string;
	payment_status: string;
	created_by: string | null;
	outlet: { id: string; name: string } | null;
	room: { id: string; name: string } | null;
	employee: {
		id: string;
		first_name: string;
		last_name: string | null;
	} | null;
	created_by_employee: {
		id: string;
		first_name: string;
		last_name: string | null;
	} | null;
	sales_orders: { id: string; so_number: string; status: string }[];
};

type LineItemRow = {
	id: string;
	appointment_id: string;
	service_id: string | null;
	item_type: string;
	quantity: number;
	description: string | null;
	is_cancelled: boolean;
	updated_at: string;
	service: { id: string; sku: string | null; name: string } | null;
};

type SaleItemRow = {
	id: string;
	sales_order_id: string;
	service_id: string | null;
	item_type: string;
	item_name: string;
	quantity: number;
	unit_price: number;
	total: number | null;
	service: { id: string; sku: string | null; name: string } | null;
	sales_order: {
		id: string;
		so_number: string;
		sold_at: string;
		status: string;
		customer_id: string | null;
	} | null;
};

export async function listCustomerServiceRedemptions(
	ctx: Context,
	customerId: string,
): Promise<CustomerServiceRedemption[]> {
	await assertCustomerInBrand(ctx, customerId);
	const { data: appointments, error: aerr } = await ctx.db
		.from("appointments")
		.select(
			"id, customer_id, booking_ref, start_at, end_at, status, payment_status, created_by, outlet:outlets!appointments_outlet_id_fkey(id, name), room:rooms!appointments_room_id_fkey(id, name), employee:employees!appointments_employee_id_fkey(id, first_name, last_name), created_by_employee:employees!appointments_created_by_fkey(id, first_name, last_name), sales_orders:sales_orders!sales_orders_appointment_id_fkey(id, so_number, status)",
		)
		.eq("customer_id", customerId)
		.eq("payment_status", "paid");
	if (aerr) throw new ValidationError(aerr.message);
	const apptList = (appointments ?? []) as unknown as AppointmentRow[];
	if (apptList.length === 0) return [];
	const apptById = new Map(apptList.map((a) => [a.id, a]));

	const { data: lines, error: lerr } = await ctx.db
		.from("appointment_line_items")
		.select(
			"id, appointment_id, service_id, item_type, quantity, description, is_cancelled, updated_at, service:services!appointment_line_items_service_id_fkey(id, sku, name)",
		)
		.in("appointment_id", Array.from(apptById.keys()))
		.eq("item_type", "service")
		.eq("is_cancelled", false);
	if (lerr) throw new ValidationError(lerr.message);

	const rows = (lines ?? []) as unknown as LineItemRow[];
	const out: CustomerServiceRedemption[] = [];
	for (const li of rows) {
		const appt = apptById.get(li.appointment_id);
		if (!appt) continue;
		const so = appt.sales_orders.find((s) => s.status !== "cancelled") ?? null;
		out.push({
			line_item_id: li.id,
			appointment_id: appt.id,
			booking_ref: appt.booking_ref,
			appointment_start_at: appt.start_at,
			appointment_end_at: appt.end_at,
			appointment_status: appt.status,
			outlet: appt.outlet,
			room: appt.room,
			hands_on_employee: appt.employee,
			processed_by_employee: appt.created_by_employee,
			processed_at: li.updated_at,
			service: li.service,
			description: li.description,
			quantity: Number(li.quantity),
			sales_order: so ? { id: so.id, so_number: so.so_number } : null,
		});
	}
	out.sort((a, b) =>
		a.appointment_start_at < b.appointment_start_at ? 1 : -1,
	);
	return out;
}

export async function listCustomerServiceBalances(
	ctx: Context,
	customerId: string,
): Promise<CustomerServiceBalance[]> {
	await assertCustomerInBrand(ctx, customerId);
	const { data: items, error: serr } = await ctx.db
		.from("sale_items")
		.select(
			"id, sales_order_id, service_id, item_type, item_name, quantity, unit_price, total, service:services!sale_items_service_id_fkey(id, sku, name), sales_order:sales_orders!sale_items_sales_order_id_fkey!inner(id, so_number, sold_at, status, customer_id)",
		)
		.eq("item_type", "service")
		.eq("sales_order.customer_id", customerId)
		.eq("sales_order.status", "completed");
	if (serr) throw new ValidationError(serr.message);
	const sale = (items ?? []) as unknown as SaleItemRow[];
	if (sale.length === 0) return [];

	const allocatedByItem = await sumAllocatedBySaleItem(
		ctx,
		sale.map((s) => s.id),
	);

	const out: CustomerServiceBalance[] = [];
	for (const r of sale) {
		const built = buildBalance(r, allocatedByItem);
		if (built) out.push(built);
	}
	out.sort((a, b) =>
		(a.sales_order.sold_at ?? "") < (b.sales_order.sold_at ?? "") ? 1 : -1,
	);
	return out;
}

function buildBalance(
	row: SaleItemRow,
	allocatedByItem: Map<string, number>,
): CustomerServiceBalance | null {
	if (!row.sales_order) {
		throw new ValidationError(`Sale item ${row.id} has no sales_order`);
	}
	const quantity = Number(row.quantity);
	const lineTotal = Number(row.total ?? row.unit_price * quantity);
	const allocated = allocatedByItem.get(row.id) ?? 0;
	const owing = lineTotal - allocated;
	if (owing <= 0.005) return null;
	const paymentStatus: CustomerServiceBalance["payment_status"] =
		allocated <= 0 ? "unpaid" : "partial";
	return {
		sale_item_id: row.id,
		sales_order: {
			id: row.sales_order.id,
			so_number: row.sales_order.so_number,
			sold_at: row.sales_order.sold_at,
			status: row.sales_order.status,
		},
		service: row.service,
		item_name: row.item_name,
		quantity,
		unit_price: Number(row.unit_price),
		line_total: lineTotal,
		allocated_paid: allocated,
		payment_status: paymentStatus,
	};
}

async function sumAllocatedBySaleItem(
	ctx: Context,
	saleItemIds: string[],
): Promise<Map<string, number>> {
	if (saleItemIds.length === 0) return new Map();
	const { data, error } = await ctx.db
		.from("payment_allocations")
		.select("sale_item_id, amount")
		.in("sale_item_id", saleItemIds);
	if (error) throw new ValidationError(error.message);
	const out = new Map<string, number>();
	for (const r of (data ?? []) as { sale_item_id: string; amount: number }[]) {
		out.set(r.sale_item_id, (out.get(r.sale_item_id) ?? 0) + Number(r.amount));
	}
	return out;
}
