import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerContext } from "@/lib/context/server";
import { outletPath } from "@/lib/outlet-path";
import { getLandingOutletCode } from "@/lib/services/landing-outlet";

export default async function RootPage() {
	const h = await headers();
	const brandId = h.get("x-brand-id");
	if (!brandId) redirect("/select-brand");

	const ctx = await getServerContext();
	if (!ctx.currentUser) redirect("/login");
	if (!ctx.currentUser.employeeId) redirect("/select-brand?no_access=1");

	const code = await getLandingOutletCode(ctx);
	if (!code) {
		return (
			<div className="flex min-h-svh items-center justify-center p-6 text-center text-muted-foreground text-sm">
				No active outlets in this brand. Create one in Settings → Outlets first.
			</div>
		);
	}
	redirect(outletPath(code, "/dashboard"));
}
