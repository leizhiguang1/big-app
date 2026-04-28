import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { getServerContext } from "@/lib/context/server";

// Auth gate + chrome for authenticated /admin/* pages. Route group `(auth)`
// keeps /admin/login outside this layout so the login page is reachable
// without a session.
export default async function AdminAuthLayout({
	children,
}: {
	children: ReactNode;
}) {
	const ctx = await getServerContext();
	if (!ctx.currentUser) {
		redirect("/admin/login");
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
					<div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
						<span>{ctx.currentUser.email}</span>
						<form action="/admin/logout" method="post">
							<button
								type="submit"
								className="rounded-md border bg-background px-2 py-1 hover:bg-muted/50"
							>
								Sign out
							</button>
						</form>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
		</div>
	);
}
