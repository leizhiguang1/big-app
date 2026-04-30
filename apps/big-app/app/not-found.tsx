import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { outletPath } from "@/lib/outlet-path";
import { getLandingOutletCode } from "@/lib/services/landing-outlet";

export default async function NotFound() {
	const h = await headers();
	const brandId = h.get("x-brand-id");

	const ctx = await getServerContext();
	const loggedIn = Boolean(ctx.currentUser);
	const hasEmployee = Boolean(ctx.currentUser?.employeeId);

	let homeHref = "/";
	if (brandId && loggedIn && hasEmployee) {
		try {
			const code = await getLandingOutletCode(ctx);
			if (code) homeHref = outletPath(code, "/dashboard");
		} catch {
			// keep default
		}
	} else if (!loggedIn) {
		homeHref = "/login";
	}

	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
			<div className="space-y-1">
				<div className="font-mono text-muted-foreground text-xs">404</div>
				<h1 className="font-semibold text-2xl">Page not found</h1>
				<p className="text-muted-foreground text-sm">
					The page you're looking for doesn't exist or has moved.
				</p>
			</div>
			<Button asChild size="sm">
				<Link href={homeHref}>
					{loggedIn ? "Back to your workspace" : "Go to login"}
				</Link>
			</Button>
		</main>
	);
}
