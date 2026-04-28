import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { billingSettingsInputSchema } from "@/lib/schemas/billing-settings";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type BillingSettings = Tables<"billing_settings">;

export async function getBillingSettings(
	ctx: Context,
): Promise<BillingSettings> {
	const { data, error } = await ctx.db
		.from("billing_settings")
		.select("*")
		.eq("brand_id", assertBrandId(ctx))
		.eq("singleton", true)
		.maybeSingle();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError("billing_settings row missing");
	return data;
}

export async function updateBillingSettings(
	ctx: Context,
	input: unknown,
): Promise<BillingSettings> {
	const parsed = billingSettingsInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("billing_settings")
		.update(parsed)
		.eq("brand_id", assertBrandId(ctx))
		.eq("singleton", true)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError("billing_settings row missing");
	return data;
}
