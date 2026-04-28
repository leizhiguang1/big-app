import { headers } from "next/headers";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { getServerContext } from "@/lib/context/server";
import {
	type AdminBrandRow,
	listAllBrandsAdmin,
} from "@/lib/services/platform-admin";
import { AdminBrandsClient } from "./_components/AdminBrandsClient";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
	const ctx = await getServerContext();
	await assertPlatformAdmin(ctx);
	const brands: AdminBrandRow[] = await listAllBrandsAdmin(ctx);

	const h = await headers();
	const rawHost = h.get("host") ?? "";
	// Strip leading `www.` so brand links never become `<sub>.www.<root>`
	// (which the brand resolver would 404 as an unknown subdomain).
	const requestHost = rawHost.replace(/^www\./, "");
	const proto =
		h.get("x-forwarded-proto") ??
		(process.env.NODE_ENV === "production" ? "https" : "http");

	return (
		<AdminBrandsClient
			brands={brands}
			rootHost={requestHost}
			protocol={proto}
		/>
	);
}
