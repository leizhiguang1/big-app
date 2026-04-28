import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { PlatformAdminLoginForm } from "@/components/auth/PlatformAdminLoginForm";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { getServerContext } from "@/lib/context/server";
import { ROOT_DOMAIN } from "@/lib/multibrand/host";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function LoginPage() {
	const h = await headers();
	const brandId = h.get("x-brand-id");
	const brandSubdomain = h.get("x-brand-subdomain");

	const ctx = await getServerContext();

	// Apex /login = platform-admin login. No brand context here.
	if (!brandId) {
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
					<PlatformAdminLoginForm />
					<p className="mt-6 text-center text-xs text-muted-foreground">
						Brand staff: sign in from your workspace URL
						(e.g. <span className="font-mono">your-brand.{ROOT_DOMAIN}</span>).
					</p>
				</div>
			</main>
		);
	}

	// Brand subdomain /login = brand staff login.
	if (ctx.currentUser) redirect("/dashboard");

	const dbAdmin = createSupabaseAdminClient();
	const { data: brand } = await dbAdmin
		.from("brands")
		.select("name, nickname, logo_url")
		.eq("id", brandId)
		.maybeSingle();

	const displayName = brand?.nickname || brand?.name || "your workspace";

	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="mb-6 flex flex-col items-center gap-3 text-center">
					{brand?.logo_url ? (
						<div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
							<Image
								src={brand.logo_url}
								alt=""
								width={64}
								height={64}
								className="h-full w-full object-cover"
								unoptimized
							/>
						</div>
					) : (
						<div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted/30 font-medium text-muted-foreground">
							{(brand?.name ?? "BIG").slice(0, 2).toUpperCase()}
						</div>
					)}
					<div>
						<h1 className="font-semibold text-xl">Sign in to {displayName}</h1>
						<p className="mt-1 text-muted-foreground text-xs">
							{brandSubdomain}.{ROOT_DOMAIN}
						</p>
					</div>
				</div>
				<LoginForm />
			</div>
		</main>
	);
}
