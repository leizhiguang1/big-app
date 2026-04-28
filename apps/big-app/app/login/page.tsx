import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { ROOT_DOMAIN } from "@/lib/multibrand/host";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
	const h = await headers();
	const brandId = h.get("x-brand-id");
	const brandSubdomain = h.get("x-brand-subdomain");

	if (!brandId) {
		redirect("/select-brand");
	}

	const dbAdmin = createSupabaseAdminClient();
	const { data: brand } = await dbAdmin
		.from("brands")
		.select("name, nickname, logo_url")
		.eq("id", brandId)
		.maybeSingle();

	const db = await createClient();
	const {
		data: { user },
	} = await db.auth.getUser();
	if (user) redirect("/dashboard");

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
