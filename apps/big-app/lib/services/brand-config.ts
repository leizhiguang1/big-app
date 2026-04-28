import {
	type BrandConfigCategory,
	getCategoryDef,
	isBrandConfigCategory,
} from "@/lib/brand-config/categories";
import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	type BrandConfigItemUpdate,
	brandConfigItemUpdateSchema,
	type NewBrandConfigItemInput,
	newBrandConfigItemInputSchema,
} from "@/lib/schemas/brand-config";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type BrandConfigItem = Tables<"brand_config_items">;

function assertCategory(category: string): BrandConfigCategory {
	if (!isBrandConfigCategory(category))
		throw new ValidationError(`Unknown brand config category "${category}"`);
	return category;
}

// Derive a stable code from the label. Collapses to upper snake — callers
// still need to handle collisions because the unique constraint is on
// (brand_id, category, code).
function deriveCodeFromLabel(label: string): string {
	const base = label
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 60);
	return base.length > 0 ? base : "ITEM";
}

export async function listBrandConfigItems(
	ctx: Context,
	category: BrandConfigCategory,
	opts?: { includeArchived?: boolean },
): Promise<BrandConfigItem[]> {
	const brandId = assertBrandId(ctx);
	let query = ctx.db
		.from("brand_config_items")
		.select("*")
		.eq("brand_id", brandId)
		.eq("category", category)
		.order("sort_order", { ascending: true })
		.order("label", { ascending: true });
	if (!opts?.includeArchived) query = query.eq("is_active", true);
	const { data, error } = await query;
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function listActiveBrandConfigItems(
	ctx: Context,
	category: BrandConfigCategory,
): Promise<BrandConfigItem[]> {
	return listBrandConfigItems(ctx, category);
}

export async function createBrandConfigItem(
	ctx: Context,
	input: unknown,
): Promise<BrandConfigItem> {
	const parsed: NewBrandConfigItemInput =
		newBrandConfigItemInputSchema.parse(input);
	const category = assertCategory(parsed.category);
	const def = getCategoryDef(category);
	if (!def.codeEditable)
		throw new ValidationError(
			`Category "${category}" has a fixed set of codes — labels/colors/sort can be edited but rows cannot be added.`,
		);
	const brandId = assertBrandId(ctx);

	const baseCode = parsed.code?.trim() || deriveCodeFromLabel(parsed.label);

	const { data: existing, error: lookupErr } = await ctx.db
		.from("brand_config_items")
		.select("code")
		.eq("brand_id", brandId)
		.eq("category", category)
		.like("code", `${baseCode}%`);
	if (lookupErr) throw new ValidationError(lookupErr.message);

	const taken = new Set((existing ?? []).map((r) => r.code));
	let code = baseCode;
	if (taken.has(code)) {
		let i = 2;
		while (taken.has(`${baseCode}_${i}`)) i++;
		code = `${baseCode}_${i}`;
	}

	let sortOrder = parsed.sort_order;
	if (sortOrder === undefined) {
		const { data: maxRow } = await ctx.db
			.from("brand_config_items")
			.select("sort_order")
			.eq("brand_id", brandId)
			.eq("category", category)
			.order("sort_order", { ascending: false })
			.limit(1)
			.maybeSingle();
		sortOrder = (maxRow?.sort_order ?? 0) + 10;
	}

	const { data, error } = await ctx.db
		.from("brand_config_items")
		.insert({
			brand_id: brandId,
			category,
			code,
			label: parsed.label,
			color: def.hasColor ? (parsed.color ?? null) : null,
			sort_order: sortOrder,
			metadata: (parsed.metadata as never) ?? null,
			is_active: true,
		})
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError(
				"An item with that code already exists for this category",
			);
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateBrandConfigItem(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<BrandConfigItem> {
	const parsed: BrandConfigItemUpdate =
		brandConfigItemUpdateSchema.parse(input);
	const brandId = assertBrandId(ctx);

	const { data: existing, error: fetchErr } = await ctx.db
		.from("brand_config_items")
		.select("*")
		.eq("id", id)
		.eq("brand_id", brandId)
		.maybeSingle();
	if (fetchErr) throw new ValidationError(fetchErr.message);
	if (!existing) throw new NotFoundError(`brand_config_items ${id} not found`);

	const category = assertCategory(existing.category);
	const def = getCategoryDef(category);

	const patch: Partial<Tables<"brand_config_items">> = {};
	if (parsed.label !== undefined) patch.label = parsed.label;
	if (parsed.color !== undefined)
		patch.color = def.hasColor ? (parsed.color ?? null) : null;
	if (parsed.sort_order !== undefined) patch.sort_order = parsed.sort_order;
	if (parsed.is_active !== undefined) {
		if (!def.codeEditable && !parsed.is_active)
			throw new ValidationError(
				`Category "${category}" has a fixed set of codes — rows cannot be archived.`,
			);
		patch.is_active = parsed.is_active;
	}
	if (parsed.metadata !== undefined)
		patch.metadata = (parsed.metadata as never) ?? null;

	const { data, error } = await ctx.db
		.from("brand_config_items")
		.update(patch)
		.eq("id", id)
		.eq("brand_id", brandId)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`brand_config_items ${id} not found`);

	// Live categories cascade label renames to dependent rows so the brand's
	// "Ms → Miss" rename actually changes how every existing customer is
	// addressed. Snapshot categories deliberately don't cascade.
	if (
		def.storage === "live" &&
		parsed.label !== undefined &&
		parsed.label !== existing.label
	) {
		await cascadeLiveRename(
			ctx,
			category,
			existing.label,
			parsed.label,
			brandId,
		);
	}
	return data;
}

// Cascades a `live` category label rename to every column that holds the
// old label. Add an arm here when a new "live" category's owning column
// comes online — keeps the table/column types statically checked.
async function cascadeLiveRename(
	ctx: Context,
	category: BrandConfigCategory,
	oldLabel: string,
	newLabel: string,
	brandId: string,
): Promise<void> {
	switch (category) {
		case "salutation": {
			await ctx.db
				.from("customers")
				.update({ salutation: newLabel })
				.eq("salutation", oldLabel)
				.eq("brand_id", brandId);
			await ctx.db
				.from("employees")
				.update({ salutation: newLabel })
				.eq("salutation", oldLabel)
				.eq("brand_id", brandId);
			break;
		}
		// Other "live" categories don't have a write target on dependent
		// rows yet (customer_tag/appointment_tag are still free-text in
		// their owning columns; demographic columns aren't live). Add
		// arms here as those modules come online.
		default:
			break;
	}
}

export async function archiveBrandConfigItem(
	ctx: Context,
	id: string,
): Promise<void> {
	await updateBrandConfigItem(ctx, id, { is_active: false });
}

export async function deleteBrandConfigItem(
	ctx: Context,
	id: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data: existing, error: fetchErr } = await ctx.db
		.from("brand_config_items")
		.select("category")
		.eq("id", id)
		.eq("brand_id", brandId)
		.maybeSingle();
	if (fetchErr) throw new ValidationError(fetchErr.message);
	if (!existing) throw new NotFoundError(`brand_config_items ${id} not found`);

	const def = getCategoryDef(assertCategory(existing.category));
	if (!def.codeEditable)
		throw new ValidationError(
			"Fixed-code categories cannot be deleted; toggle inactive or edit label/color.",
		);

	const { error } = await ctx.db
		.from("brand_config_items")
		.delete()
		.eq("id", id)
		.eq("brand_id", brandId);
	if (error) throw new ValidationError(error.message);
}

// Typed wrappers — ergonomic call sites without losing the category string.
export const listVoidReasons = (ctx: Context) =>
	listBrandConfigItems(ctx, "void_reason");
export const listAppointmentTags = (ctx: Context) =>
	listBrandConfigItems(ctx, "appointment_tag");
export const listCustomerTags = (ctx: Context) =>
	listBrandConfigItems(ctx, "customer_tag");
export const listSalutations = (ctx: Context) =>
	listBrandConfigItems(ctx, "salutation");

// Resolver used by renders that need to display a transactional row's stored
// `code`. Looks up the current label; falls back to the provided snapshot
// (e.g. cancellations.reason free-text), then to the raw code.
export function resolveBrandConfigLabel(
	items: BrandConfigItem[],
	code: string | null | undefined,
	fallbackSnapshot?: string | null,
): string {
	if (!code) return fallbackSnapshot ?? "";
	const row = items.find((i) => i.code === code);
	if (row) return row.label;
	return fallbackSnapshot ?? code;
}
