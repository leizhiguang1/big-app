import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

// /admin/* lives at apex only. A brand subdomain must NEVER serve /admin —
// the proxy doesn't strip x-brand-id, so we redirect to /dashboard if a
// tenant tries to reach it.
//
// The auth gate lives one level deeper in `(auth)/layout.tsx`, applied to
// every /admin route EXCEPT /admin/login. Route groups (parentheses) don't
// affect URLs, so `/admin/(auth)/brands/page.tsx` is reachable at
// `/admin/brands`.
export default async function AdminLayout({
	children,
}: {
	children: ReactNode;
}) {
	const h = await headers();
	if (h.get("x-brand-subdomain")) {
		redirect("/dashboard");
	}
	return <>{children}</>;
}
