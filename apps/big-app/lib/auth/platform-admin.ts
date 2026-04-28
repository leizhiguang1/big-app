import type { Context } from "@/lib/context/types";
import { UnauthorizedError } from "@/lib/errors";

// Platform-admin gate. Membership is recorded in `public.platform_admins`
// (auth_user_id PK). Pages under `/admin/*` at the apex use
// `assertPlatformAdmin(ctx)` to refuse non-admins. The check uses dbAdmin so
// it works even before a brand subdomain is resolved.

export async function isPlatformAdmin(ctx: Context): Promise<boolean> {
	if (!ctx.currentUser) return false;
	const { data, error } = await ctx.dbAdmin
		.from("platform_admins")
		.select("auth_user_id")
		.eq("auth_user_id", ctx.currentUser.id)
		.maybeSingle();
	if (error) return false;
	return Boolean(data);
}

export async function assertPlatformAdmin(ctx: Context): Promise<void> {
	if (!(await isPlatformAdmin(ctx))) {
		throw new UnauthorizedError("Platform admin access required");
	}
}
