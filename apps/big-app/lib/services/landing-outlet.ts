import type { Context } from "@/lib/context/types";

/**
 * Outlet to land a user on when they don't yet have one in the URL (root
 * redirect, not-found bounce, middleware backfill).
 *
 * Priority:
 *   1. Their primary outlet (employee_outlets.is_primary = true), if active.
 *   2. Any other active outlet they're a member of, name-sorted.
 *   3. Fallback: first active outlet in the brand (covers admins without any
 *      employee_outlets rows yet).
 */
export async function getLandingOutletCode(
	ctx: Context,
): Promise<string | null> {
	if (!ctx.brandId) return null;

	if (ctx.currentUser?.employeeId) {
		const { data: links } = await ctx.dbAdmin
			.from("employee_outlets")
			.select("is_primary, outlets!inner(code, name, is_active)")
			.eq("employee_id", ctx.currentUser.employeeId);
		const usable = (links ?? [])
			.map((l) => ({
				is_primary: l.is_primary,
				outlet: l.outlets as unknown as {
					code: string;
					name: string;
					is_active: boolean;
				},
			}))
			.filter((l) => l.outlet?.is_active)
			.sort((a, b) => {
				if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
				return a.outlet.name.localeCompare(b.outlet.name);
			});
		if (usable[0]) return usable[0].outlet.code;
	}

	const { data: fallback } = await ctx.dbAdmin
		.from("outlets")
		.select("code")
		.eq("brand_id", ctx.brandId)
		.eq("is_active", true)
		.order("name", { ascending: true })
		.limit(1)
		.maybeSingle();
	return fallback?.code ?? null;
}
