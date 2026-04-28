import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { getServerContext } from "@/lib/context/server";
import { listWorkspacesForUser } from "@/lib/services/platform-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = { no_access?: string; no_admin?: string; next?: string };

export default async function SelectBrandPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const sp = await searchParams;

	// Read the actual request host so brand links work correctly even when
	// NEXT_PUBLIC_ROOT_DOMAIN is misconfigured at build time. We're at the
	// apex here, so the request's host IS the root domain.
	const h = await headers();
	const requestHost = h.get("host") ?? "";
	const requestProto =
		h.get("x-forwarded-proto") ??
		(process.env.NODE_ENV === "production" ? "https" : "http");

	const ctx = await getServerContext();
	const isSignedIn = Boolean(ctx.currentUser);

	// Signed-in users see only their workspaces (memberships across brands).
	// Visitors see the public list of all active brands. This matches the
	// Slack/Linear pattern.
	type Workspace = {
		id: string;
		name: string;
		nickname: string | null;
		subdomain: string;
		logo_url: string | null;
	};
	let list: Workspace[];
	if (isSignedIn) {
		const ws = await listWorkspacesForUser(ctx);
		list = ws;
	} else {
		const dbAdmin = createSupabaseAdminClient();
		const { data: brands } = await dbAdmin
			.from("brands")
			.select("id, name, subdomain, logo_url, nickname")
			.eq("is_active", true)
			.order("name", { ascending: true });
		list = (brands ?? []).map((b) => ({
			id: b.id,
			name: b.name,
			nickname: b.nickname,
			subdomain: b.subdomain,
			logo_url: b.logo_url,
		}));
	}

	const platformAdmin = isSignedIn ? await isPlatformAdmin(ctx) : false;

	const brandUrl = (subdomain: string) =>
		requestHost
			? `${requestProto}://${subdomain}.${requestHost}/login`
			: `/login`;

	return (
		<div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-6 py-16">
			<div className="mb-10 text-center">
				<h1 className="text-3xl font-semibold tracking-tight">
					{isSignedIn ? "Your workspaces" : "Choose a workspace"}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{isSignedIn
						? "Brands you're a member of. Click one to enter."
						: "Click a brand to open its sign-in page on its own subdomain."}
				</p>
			</div>

			{sp.no_access ? (
				<div className="mb-6 w-full rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
					Your account doesn&apos;t have access to that workspace. Pick one
					you&apos;re a member of below.
				</div>
			) : null}
			{sp.no_admin ? (
				<div className="mb-6 w-full rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
					Your account isn&apos;t a platform admin. Cross-brand admin is
					restricted.
				</div>
			) : null}

			{list.length === 0 ? (
				<div className="rounded-lg border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
					{isSignedIn
						? "You're not a member of any brand yet. Ask a brand admin to add you."
						: "No active brands yet."}
				</div>
			) : (
				<ul className="w-full divide-y rounded-lg border bg-card">
					{list.map((b) => (
						<li key={b.id}>
							<a
								href={brandUrl(b.subdomain)}
								className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/50"
							>
								<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
									{b.logo_url ? (
										<Image
											src={b.logo_url}
											alt=""
											width={48}
											height={48}
											className="h-full w-full object-cover"
											unoptimized
										/>
									) : (
										<span className="text-sm font-medium text-muted-foreground">
											{b.name.slice(0, 2).toUpperCase()}
										</span>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<div className="truncate font-medium">
										{b.nickname || b.name}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{b.subdomain}.{requestHost.split(":")[0] || ""}
									</div>
								</div>
								<span className="text-xs text-muted-foreground">
									{isSignedIn ? "Open →" : "Sign in →"}
								</span>
							</a>
						</li>
					))}
				</ul>
			)}

			{platformAdmin ? (
				<div className="mt-8 w-full rounded-lg border bg-muted/30 px-5 py-4 text-sm">
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium">Platform admin</div>
							<div className="text-xs text-muted-foreground">
								Create new brands, manage subdomains.
							</div>
						</div>
						<Link
							href="/admin/brands"
							className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
						>
							Open admin →
						</Link>
					</div>
				</div>
			) : null}

			<p className="mt-10 text-xs text-muted-foreground">
				{isSignedIn ? (
					<>
						Looking for a workspace not listed here? Ask its admin to add your
						account.
					</>
				) : (
					<>
						Looking for a workspace that isn&apos;t listed? Ask its owner for
						the direct link.
					</>
				)}
			</p>
		</div>
	);
}
