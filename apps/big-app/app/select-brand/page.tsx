import { headers } from "next/headers";
import Image from "next/image";
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
	// apex here, so the request's host IS the root domain. Strip a leading
	// `www.` so brand links never become `<sub>.www.<root>` (which the
	// brand resolver would 404).
	const h = await headers();
	const rawHost = h.get("host") ?? "";
	const requestHost = rawHost.replace(/^www\./, "");
	const requestProto =
		h.get("x-forwarded-proto") ??
		(process.env.NODE_ENV === "production" ? "https" : "http");

	const ctx = await getServerContext();
	const isSignedIn = Boolean(ctx.currentUser);
	const isAdmin = isSignedIn && (await isPlatformAdmin(ctx));

	// Brand members see only their workspaces. Visitors and platform admins
	// see all active brands — admins can sign in to any, so the membership
	// list (likely empty for them) would be misleading.
	type Workspace = {
		id: string;
		name: string;
		nickname: string | null;
		subdomain: string;
		logo_url: string | null;
	};
	let list: Workspace[];
	if (isSignedIn && !isAdmin) {
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

	const brandUrl = (subdomain: string) =>
		requestHost
			? `${requestProto}://${subdomain}.${requestHost}/login`
			: `/login`;

	return (
		<div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-6 py-16">
			<div className="mb-10 text-center">
				<h1 className="text-3xl font-semibold tracking-tight">
					{isAdmin
						? "All workspaces"
						: isSignedIn
							? "Your workspaces"
							: "Choose a workspace"}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{isAdmin
						? "Every brand on the platform. Click one to enter."
						: isSignedIn
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
					{isAdmin
						? "No active brands yet."
						: isSignedIn
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

			<p className="mt-10 text-xs text-muted-foreground">
				{isAdmin ? (
					<>
						Need to create or rename a brand?{" "}
						<a href="/admin/brands" className="underline hover:text-foreground">
							Open platform admin
						</a>
						.
					</>
				) : isSignedIn ? (
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
