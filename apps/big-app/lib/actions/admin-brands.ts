"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { getServerContext } from "@/lib/context/server";
import { extractSubdomain, ROOT_DOMAIN } from "@/lib/multibrand/host";
import * as brandsService from "@/lib/services/brands";
import * as platformAdmin from "@/lib/services/platform-admin";

// /admin/* server actions. Each action builds Context, enforces the
// platform-admin gate (defense in depth — the layout already guards),
// calls the service, and revalidates the affected paths.

export async function createBrandAction(input: unknown) {
	const ctx = await getServerContext();
	await assertPlatformAdmin(ctx);
	const result = await platformAdmin.createBrand(ctx, input);
	revalidatePath("/admin/brands");
	revalidatePath("/select-brand");
	return result;
}

export async function updateBrandAction(input: unknown) {
	const ctx = await getServerContext();
	await assertPlatformAdmin(ctx);
	const result = await platformAdmin.updateBrandAdmin(ctx, input);
	revalidatePath("/admin/brands");
	return result;
}

export async function setBrandActiveAction(input: unknown) {
	const ctx = await getServerContext();
	await assertPlatformAdmin(ctx);
	const result = await platformAdmin.setBrandActive(ctx, input);
	revalidatePath("/admin/brands");
	revalidatePath("/select-brand");
	return result;
}

// Apex-side rename. Doesn't redirect — the platform admin stays at apex.
export async function adminRenameSubdomainAction(input: unknown) {
	const ctx = await getServerContext();
	await assertPlatformAdmin(ctx);
	const result = await platformAdmin.adminRenameSubdomain(ctx, input);
	revalidatePath("/admin/brands");
	return result;
}

// Tenant-side rename. Runs from /config/general inside a brand subdomain.
// Redirects to the new subdomain so the session continues seamlessly
// (cookies are .bigapp.online, so the cookie follows them).
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
