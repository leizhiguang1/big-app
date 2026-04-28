import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { taxInputSchema } from "@/lib/schemas/taxes";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type Tax = Tables<"taxes">;

export async function listTaxes(ctx: Context): Promise<Tax[]> {
	const { data, error } = await ctx.db
		.from("taxes")
		.select("*")
		.order("rate_pct", { ascending: true })
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function listActiveTaxes(ctx: Context): Promise<Tax[]> {
	const { data, error } = await ctx.db
		.from("taxes")
		.select("*")
		.eq("is_active", true)
		.order("rate_pct", { ascending: true })
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function createTax(ctx: Context, input: unknown): Promise<Tax> {
	const parsed = taxInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("taxes")
		.insert({ ...parsed, brand_id: assertBrandId(ctx) })
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A tax with that name already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateTax(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Tax> {
	const parsed = taxInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("taxes")
		.update(parsed)
		.eq("id", id)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A tax with that name already exists");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Tax ${id} not found`);
	return data;
}

export async function deleteTax(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db.from("taxes").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This tax is attached to one or more services or inventory items. Detach it first or mark it inactive.",
			);
		throw new ValidationError(error.message);
	}
}

export async function listTaxIdsForService(
	ctx: Context,
	serviceId: string,
): Promise<string[]> {
	const { data, error } = await ctx.db
		.from("service_taxes")
		.select("tax_id")
		.eq("service_id", serviceId);
	if (error) throw new ValidationError(error.message);
	return (data ?? []).map((r) => r.tax_id);
}

export async function setTaxesForService(
	ctx: Context,
	serviceId: string,
	taxIds: string[],
): Promise<void> {
	const { error: delError } = await ctx.db
		.from("service_taxes")
		.delete()
		.eq("service_id", serviceId);
	if (delError) throw new ValidationError(delError.message);
	if (taxIds.length === 0) return;
	const rows = taxIds.map((tax_id) => ({ service_id: serviceId, tax_id }));
	const { error: insError } = await ctx.db.from("service_taxes").insert(rows);
	if (insError) throw new ValidationError(insError.message);
}

export async function listTaxIdsForInventoryItem(
	ctx: Context,
	itemId: string,
): Promise<string[]> {
	const { data, error } = await ctx.db
		.from("inventory_item_taxes")
		.select("tax_id")
		.eq("inventory_item_id", itemId);
	if (error) throw new ValidationError(error.message);
	return (data ?? []).map((r) => r.tax_id);
}

export async function setTaxesForInventoryItem(
	ctx: Context,
	itemId: string,
	taxIds: string[],
): Promise<void> {
	const { error: delError } = await ctx.db
		.from("inventory_item_taxes")
		.delete()
		.eq("inventory_item_id", itemId);
	if (delError) throw new ValidationError(delError.message);
	if (taxIds.length === 0) return;
	const rows = taxIds.map((tax_id) => ({
		inventory_item_id: itemId,
		tax_id,
	}));
	const { error: insError } = await ctx.db
		.from("inventory_item_taxes")
		.insert(rows);
	if (insError) throw new ValidationError(insError.message);
}
