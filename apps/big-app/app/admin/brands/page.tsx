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
	const requestHost = h.get("host") ?? "";
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
