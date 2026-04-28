"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { getServerContext } from "@/lib/context/server";
import { extractSubdomain, ROOT_DOMAIN } from "@/lib/multibrand/host";
import * as brandsService from "@/lib/services/brands";
import * as platformAdmin from "@/lib/services/platform-admin";

// /admin/* server actions. Each action:
//   * Builds Context, then enforces the platform-admin gate. The gate is
//     re-checked here even though the page guards with the same helper —
//     defense in depth, since actions are addressable directly.
//   * Calls the service, then revalidates the affected paths.
//
// Every brand-management entry point is platform-admin-only. Brand admins
// modify their own brand from /config/general (separate action).

export async function createBrandAction(input: unknown) {
	const ctx = await getServerContext();
	await assertPlatformAdmin(ctx);
	const result = await platformAdmin.createBrand(ctx, input);
	revalidatePath("/admin/brands");
	revalidatePath("/select-brand");
	return result;
}

// Subdomain rename — runs from /config/general inside a brand subdomain.
// We redirect the caller to the new subdomain after the rename so their
// session continues seamlessly (cookies are .bigapp.online, so the cookie
// follows them).
export async function renameSubdomainAction(input: unknown) {
	const ctx = await getServerContext();
	if (!ctx.brandId) throw new Error("No brand context");
	const result = await brandsService.renameBrandSubdomain(ctx, input);
	revalidatePath("/config/general");

	if (result.changed) {
		const h = await headers();
		const requestHost = h.get("host") ?? "";
		const proto =
			h.get("x-forwarded-proto") ??
			(process.env.NODE_ENV === "production" ? "https" : "http");
		// Build target URL on the new subdomain. Use the request's host's
		// root portion (defensive against NEXT_PUBLIC_ROOT_DOMAIN drift).
		const sub = extractSubdomain(requestHost, ROOT_DOMAIN);
		let rootHost: string;
		if (sub) {
			rootHost = requestHost.replace(`${sub}.`, "");
		} else {
			rootHost = requestHost || ROOT_DOMAIN;
		}
		redirect(`${proto}://${result.subdomain}.${rootHost}/config/general`);
	}
	return result;
}
