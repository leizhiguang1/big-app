import {
	BRAND_SETTINGS,
	type BrandSettingKey,
	type BrandSettingValue,
	getSettingDef,
	isBrandSettingKey,
} from "@/lib/brand-config/settings";
import type { Context } from "@/lib/context/types";
import { ValidationError } from "@/lib/errors";
import { assertBrandId } from "@/lib/supabase/query";

// Read a single setting. Returns the registry default when no row exists or
// when the stored value fails re-validation (which should not happen in
// normal flows but safeguards future schema tightening).
export async function getBrandSetting<K extends BrandSettingKey>(
	ctx: Context,
	key: K,
): Promise<BrandSettingValue<K>> {
	const brandId = assertBrandId(ctx);
	const def = getSettingDef(key);
	const { data, error } = await ctx.db
		.from("brand_settings")
		.select("value")
		.eq("brand_id", brandId)
		.eq("key", key)
		.maybeSingle();
	if (error) throw new ValidationError(error.message);
	if (!data) return def.default as BrandSettingValue<K>;
	const parsed = def.schema.safeParse(data.value);
	if (!parsed.success) {
		console.warn(
			`[brand-settings] invalid stored value for key=${key}; falling back to default`,
			parsed.error,
		);
		return def.default as BrandSettingValue<K>;
	}
	return parsed.data as BrandSettingValue<K>;
}

// Write or overwrite a single setting.
export async function setBrandSetting<K extends BrandSettingKey>(
	ctx: Context,
	key: K,
	value: BrandSettingValue<K>,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const def = getSettingDef(key);
	const parsed = def.schema.safeParse(value);
	if (!parsed.success) throw new ValidationError(parsed.error.message);
	const { error } = await ctx.db.from("brand_settings").upsert(
		{
			brand_id: brandId,
			key,
			value: parsed.data as never,
		},
		{ onConflict: "brand_id,key" },
	);
	if (error) throw new ValidationError(error.message);
}

// Bulk read. Returns a fully-populated map (unknown keys that happen to be
// in the DB are skipped; missing keys fall back to registry defaults).
export async function listBrandSettings(
	ctx: Context,
	opts?: { group?: string },
): Promise<Record<BrandSettingKey, unknown>> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("brand_settings")
		.select("key, value")
		.eq("brand_id", brandId);
	if (error) throw new ValidationError(error.message);

	const stored = new Map<string, unknown>();
	for (const row of data ?? []) stored.set(row.key, row.value);

	const out = {} as Record<BrandSettingKey, unknown>;
	for (const key of Object.keys(BRAND_SETTINGS) as BrandSettingKey[]) {
		const def = BRAND_SETTINGS[key];
		if (opts?.group && def.group !== opts.group) continue;
		const raw = stored.get(key);
		if (raw === undefined) {
			out[key] = def.default;
			continue;
		}
		const parsed = def.schema.safeParse(raw);
		out[key] = parsed.success ? parsed.data : def.default;
	}
	return out;
}

// Helper: reject unknown keys at the action boundary. Use this when the
// client posts `key` as a string (e.g. from an admin form).
export function assertBrandSettingKey(v: string): BrandSettingKey {
	if (!isBrandSettingKey(v))
		throw new ValidationError(`Unknown brand setting "${v}"`);
	return v;
}
