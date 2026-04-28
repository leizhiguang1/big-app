import { headers } from "next/headers";
import Image from "next/image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SelectBrandPage() {
	// Read the actual request host so brand links work correctly even when
	// NEXT_PUBLIC_ROOT_DOMAIN is misconfigured at build time. We're at the
	// apex here, so the request's host IS the root domain.
	const h = await headers();
	const requestHost = h.get("host") ?? "";
	const requestProto =
		h.get("x-forwarded-proto") ??
		(process.env.NODE_ENV === "production" ? "https" : "http");

	const dbAdmin = createSupabaseAdminClient();
	const { data: brands } = await dbAdmin
		.from("brands")
		.select("id, name, subdomain, logo_url, nickname")
		.eq("is_active", true)
		.order("name", { ascending: true });

	const list = brands ?? [];

	const brandUrl = (subdomain: string) =>
		requestHost
			? `${requestProto}://${subdomain}.${requestHost}/login`
			: `/login`;

	return (
		<div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-6 py-16">
			<div className="mb-10 text-center">
				<h1 className="text-3xl font-semibold tracking-tight">
					Choose a workspace
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Click a brand to open its sign-in page on its own subdomain.
				</p>
			</div>

			{list.length === 0 ? (
				<div className="rounded-lg border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
					No active brands yet.
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
								<span className="text-xs text-muted-foreground">Sign in →</span>
							</a>
						</li>
					))}
				</ul>
			)}

			<p className="mt-10 text-xs text-muted-foreground">
				Looking for a workspace that isn&apos;t listed? Ask its owner for the
				direct link.
			</p>
		</div>
	);
}
