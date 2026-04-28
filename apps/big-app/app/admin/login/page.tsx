import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { getServerContext } from "@/lib/context/server";
import { AdminLoginForm } from "./AdminLoginForm";

// Apex login for platform admins. Lives at `bigapp.online/admin/login`
// (NOT inside any brand subdomain). Reachable without auth — that's the
// whole point. The /admin layout exempts this route from its auth gate.

export default async function AdminLoginPage() {
	// Refuse to render this page at a brand subdomain. /admin/login is an
	// apex-only surface; tenant users sign in at `<brand>.bigapp.online/login`.
	const h = await headers();
	if (h.get("x-brand-subdomain")) {
		redirect("/login");
	}

	// Already signed in as platform admin? Skip the form.
	const ctx = await getServerContext();
	if (ctx.currentUser && (await isPlatformAdmin(ctx))) {
		redirect("/admin/brands");
	}

	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="mb-6 text-center">
					<h1 className="text-xl font-semibold tracking-tight">
						Platform admin
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Sign in to manage brands across the platform.
					</p>
				</div>
				<AdminLoginForm />
				<p className="mt-6 text-center text-xs text-muted-foreground">
					Not a platform admin? Pick your workspace at{" "}
					<a href="/select-brand" className="text-primary hover:underline">
						/select-brand
					</a>
					.
				</p>
			</div>
		</main>
	);
}
