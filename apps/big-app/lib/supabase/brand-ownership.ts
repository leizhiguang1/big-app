import type { Context } from "@/lib/context/types";
import { NotFoundError } from "@/lib/errors";
import { assertBrandId } from "@/lib/supabase/query";

// Tier-C ownership guards. Children/junctions don't carry brand_id, so we
// verify the parent (or the parent's parent, when the chain is two-deep)
// belongs to the current brand before letting a service read or mutate the
// child. Each guard pushes both `id` AND `brand_id` (or the joined-table
// brand_id, for two-hop parents) into the query — so the brand filter shows
// up in any query trace and any future static-analysis check that grep's
// for unfiltered Tier-C reads.
//
// Throwing NotFoundError (not Unauthorized) keeps cross-brand probes
// indistinguishable from non-existent IDs — a brand A user trying to peek
// at brand B's resource gets exactly the same response as if the ID never
// existed.

export async function assertOutletInBrand(
	ctx: Context,
	outletId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("outlets")
		.select("id")
		.eq("id", outletId)
		.eq("brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Outlet ${outletId} not found`);
}

export async function assertCustomerInBrand(
	ctx: Context,
	customerId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("customers")
		.select("id")
		.eq("id", customerId)
		.eq("brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Customer ${customerId} not found`);
}

export async function assertEmployeeInBrand(
	ctx: Context,
	employeeId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("employees")
		.select("id")
		.eq("id", employeeId)
		.eq("brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Employee ${employeeId} not found`);
}

export async function assertServiceInBrand(
	ctx: Context,
	serviceId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("services")
		.select("id")
		.eq("id", serviceId)
		.eq("brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Service ${serviceId} not found`);
}

export async function assertInventoryItemInBrand(
	ctx: Context,
	itemId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("inventory_items")
		.select("id")
		.eq("id", itemId)
		.eq("brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Inventory item ${itemId} not found`);
}

// appointments.outlet_id → outlets.brand_id
export async function assertAppointmentInBrand(
	ctx: Context,
	appointmentId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("appointments")
		.select("id, outlets!appointments_outlet_id_fkey!inner(brand_id)")
		.eq("id", appointmentId)
		.eq("outlets.brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Appointment ${appointmentId} not found`);
}

// sales_orders.outlet_id → outlets.brand_id
export async function assertSalesOrderInBrand(
	ctx: Context,
	salesOrderId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("sales_orders")
		.select("id, outlets!sales_orders_outlet_id_fkey!inner(brand_id)")
		.eq("id", salesOrderId)
		.eq("outlets.brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Sales order ${salesOrderId} not found`);
}
