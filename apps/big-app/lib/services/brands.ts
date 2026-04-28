import type { Context } from "@/lib/context/types";
import {
	ConflictError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "@/lib/errors";
import { brandUpdateSchema } from "@/lib/schemas/brands";
import type { Tables } from "@/lib/supabase/types";

export type Brand = Tables<"brands">;

function nullable(value: string | undefined | null): string | null {
	if (value === undefined || value === null) return null;
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

export async function getBrand(ctx: Context): Promise<Brand> {
	if (!ctx.brandId) throw new UnauthorizedError("No brand context");
	const { data, error } = await ctx.db
		.from("brands")
		.select("*")
		.eq("id", ctx.brandId)
		.single();
	if (error || !data) throw new NotFoundError(`Brand ${ctx.brandId} not found`);
	return data;
}

export async function updateBrand(
	ctx: Context,
	input: unknown,
): Promise<Brand> {
	if (!ctx.brandId) throw new UnauthorizedError("No brand context");
	const parsed = brandUpdateSchema.parse(input);
	const { data, error } = await ctx.db
		.from("brands")
		.update({
			name: parsed.name,
			nickname: nullable(parsed.nickname),
			logo_url: nullable(parsed.logo_url),
			contact_phone: nullable(parsed.contact_phone),
			currency_code: parsed.currency_code,
			subdomain: nullable(parsed.subdomain),
			registered_name: nullable(parsed.registered_name),
			registration_number: nullable(parsed.registration_number),
			tax_id: nullable(parsed.tax_id),
			address: nullable(parsed.address),
			email: nullable(parsed.email),
			website: nullable(parsed.website),
			tagline: nullable(parsed.tagline),
		})
		.eq("id", ctx.brandId)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("That subdomain is already taken");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Brand ${ctx.brandId} not found`);
	return data;
}
