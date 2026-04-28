import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { getServerContext } from "@/lib/context/server";

// /admin/* lives at apex only (bigapp.online/admin/...). A brand subdomain
// must NEVER serve /admin — the proxy doesn't strip x-brand-id, so we
// redirect to apex /admin if a tenant tries to reach it.
export default async function AdminLayout({
	children,
}: {
	children: ReactNode;
}) {
	const h = await headers();
	const subdomain = h.get("x-brand-subdomain");
	if (subdomain) {
		// Send brand-subdomain visitors back to their dashboard. Cross-brand
		// admin lives at apex by design.
		redirect("/dashboard");
	}

	const ctx = await getServerContext();
	if (!ctx.currentUser) {
		// No session at apex — nudge them to pick a brand and sign in there.
		redirect("/select-brand?next=%2Fadmin%2Fbrands");
	}
	if (!(await isPlatformAdmin(ctx))) {
		redirect("/select-brand?no_admin=1");
	}

	return (
		<div className="min-h-svh bg-muted/20">
			<header className="border-b bg-background">
				<div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
					<Link
						href="/admin/brands"
						className="text-sm font-semibold tracking-tight"
					>
						Platform admin
					</Link>
					<nav className="flex items-center gap-4 text-sm text-muted-foreground">
						<Link href="/admin/brands" className="hover:text-foreground">
							Brands
						</Link>
					</nav>
					<div className="ml-auto text-xs text-muted-foreground">
						{ctx.currentUser.email}
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
		</div>
	);
}
